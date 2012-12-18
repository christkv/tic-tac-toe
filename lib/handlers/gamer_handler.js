var emit_message = require("./shared").emit_message
  , is_authenticated = require("./shared").is_authenticated
  , emit_error = require("./shared").emit_error;

var user = require('../models/user')
  , gamer = require('../models/gamer')
  , game = require('../models/game');

var find_all_available_gamers = function(io, socket, session_store, db) {
  return function(data) {
    console.log("= find_all_available_gamers_handler");

    // Verify that we are logged in
    if(!is_authenticated(socket, session_store)) return emit_error("find_all_public_games", "User not authenticated", socket);
    
    // Locate all active socket connections, and get the gamers information
    var clients = io.sockets.clients();
    var sids = [];

    // Iterate over all the users but ignore us
    for(var i = 0; i < clients.length; i++) {
      if(clients[i].handshake.sessionID != socket.handshake.sessionID) {
        sids.push(clients[i].handshake.sessionID);
      }
    }

    // Alright grab all the gamers information
    gamer(db).findAllGamersBySids(sids, function(err, gamers) {
      if(err) return emit_error("find_all_available_gamers", err.message, socket);    

      gamer(db).updateGamersUpdatedDateBySids(sids, function(err, result) {
        if(err) return emit_error("find_all_available_gamers", err.message, socket);    
        console.log("= find_all_available_gamers_handler 1");
        console.dir(gamers)

        // Return the games
        emit_message("find_all_available_gamers", {
            ok: true
          , gamers: gamers
        }, socket);    
      });
    });    
  } 
}

var invite_gamer = function(io, socket, session_store, db) {
  return function(data) {
    console.log("= invite_gamer");
    console.dir(data)
    // Verify that we are logged in
    if(!is_authenticated(socket, session_store)) return emit_error("invite_gamer", "User not authenticated", socket);

    // Locate connection
    var connection = locate_connection_with_session(io, data.sid);

    // if null emit error
    if(connection == null) return emit_error("invite_gamer", "Invited user is no longer available", socket);

    // Our session id
    var our_sid = socket.handshake.sessionID;

    // Return the games
    emit_message("game_invite", {
        ok: true
      , sid: our_sid
    }, connection);    
  }
}

var decline_game = function(io, socket, session_store, db) {
  return function(data) {
    console.log("= decline_game_handler")
    console.dir(data)
    // Verify that we are logged in
    if(!is_authenticated(socket, session_store)) return emit_error("decline_game", "User not authenticated", socket);

    // Our session id
    var our_sid = socket.handshake.sessionID;
    // Locate connection of the user game
    var connection = locate_connection_with_session(io, data.sid);

    // if null emit error
    if(connection == null) return emit_error("decline_game", "User is no longer available", socket);

    // Emit decline of game
    emit_error("invite_gamer", "User declined game", connection);
  }
}

var accept_game = function(io, socket, session_store, db) {
  return function(data) {
    console.log("= accept_game_handler")
    console.dir(data)
    // Verify that we are logged in
    if(!is_authenticated(socket, session_store)) return emit_error("accept_game", "User not authenticated", socket);
    // Our session id
    var our_sid = socket.handshake.sessionID;
    // Locate connection of the user game
    var connection = locate_connection_with_session(io, data.sid);

    // if null emit error
    if(connection == null) return emit_error("decline_game", "User is no longer available", socket);    

    // Locate the user information then set up a new game
    gamer(db).findAllGamersBySids([our_sid, data.sid], function(err, players) {
      if(err || players.length != 2) return emit_error("accept_game", "Failed to locate players for game acceptance", [socket, connection]);
      // Unpack the players
      var p1 = players[0];
      var p2 = players[1];
      
      // Create a game
      game(db).create_game(p1.sid, p1.user_name, p1.full_name, p2.sid, p2.user_name, p2.full_name, function(err, game_doc) {
        if(err) {
          emit_error("invite_gamer", "Failed to create a new game", connection);
          return emit_error("accept_game", "Failed to create a new game", socket);
        }

        // We have a new game, notify both about it
        emit_message("invite_gamer", { ok: true, game: game_doc }, connection);
        emit_message("accept_game", { ok: true, game: game_doc }, socket);
      });
    });
  }
}

var place_marker = function(io, socket, session_store, db) {
  return function(data) {
    console.log("= place_marker")
    console.dir(data)
    // Verify that we are logged in
    if(!is_authenticated(socket, session_store)) return emit_error("accept_game", "User not authenticated", socket);
    // Our session id
    var our_sid = socket.handshake.sessionID;

    // Locate the game
    game(db).find_game(data.game_id, function(err, game_doc) {
      if(err) return emit_error("place_marker", "Could not find the game", socket);

      // Let's get the board but only care if the 
      var board = game_doc.board;
      var marker = game_doc.starting_player == our_sid ? "x" : "o";
      // Locate other players sid
      var other_player_sid = game_doc.player1_sid == our_sid ? game_doc.player2_sid : game_doc.player1_sid;
      // Check if marker already set and just ignore if it's the case
      if(board[data.y][data.x] == "x" || board[data.y][data.x] == "o") return;
      // Set the value
      board[data.y][data.x] = marker;

      console.log("= place_marker save board")
      console.dir(board)

      // Attempt to update
      game(db).update_board(our_sid, data.game_id, other_player_sid, board, function(err, result) {
        if(err) return emit_error("place_marker", "Not your turn", socket);

        // Fetch the connection
        var connection = locate_connection_with_session(io, other_player_sid);
        // if null emit error
        if(connection == null) return emit_error("place_marker", "User is no longer available", socket);

        // Emit valid move message to caller and the other player
        emit_message("place_marker", { ok: true
          , move: {y: data.y, x:data.x, marker: marker} }
          , socket);        
        emit_message("game_move", { ok: true
          , move: {y: data.y, x:data.x, marker: marker} }
          , connection);
      })
    });
  }
}

var locate_connection_with_session = function(io, sid) {
  var clients = io.sockets.clients();

  // Locate our session id
  for(var i = 0; i < clients.length; i++) {
    if(clients[i].handshake.sessionID == sid) {
      return clients[i];
    }
  }

  return null;
}

// Export functions
exports.find_all_available_gamers = find_all_available_gamers;
exports.invite_gamer              = invite_gamer;
exports.accept_game               = accept_game;
exports.decline_game              = decline_game;
exports.place_marker              = place_marker;
