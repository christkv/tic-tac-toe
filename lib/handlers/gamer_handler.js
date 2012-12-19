var emit_message = require("./shared").emit_message
  , is_authenticated = require("./shared").is_authenticated
  , locate_connection_with_session = require("./shared").locate_connection_with_session
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

        // Verify if the game has been won by the user
        var won = is_game_over(board, data.y, data.x, marker);
        // Emit valid move message to caller and the other player
        emit_message("place_marker", { ok: true
          , result: {y: data.y, x:data.x, marker: marker} }
          , socket);        
        emit_message("game_move", { ok: true
          , result: {y: data.y, x:data.x, marker: marker} }
          , connection);

        // If the board is still live ignore
        if(is_game_over(board, data.y, data.x, marker) == false) return;
        // If we won the game send the we won message as 
        emit_message("game_over", { ok: true, result: {winner: our_sid} }, socket);        
        emit_message("game_over", { ok: true, result: {winner: our_sid} }, connection);
      })
    });
  }
}

var is_game_over = function(board, y, x, marker) {
  // Check the x and y for the following ranges
  var found_vertical = true;
  var found_horizontal = true;
  var found_diagonal = true;

  // y and x = 0 to x = n
  for(var i = 0; i < board[0].length; i++) {
    if(board[y][i] != marker) {
      found_horizontal = false;
      break;
    }
  }
  // Found a winning position
  if(found_horizontal) return true;

  // x and y = 0 to y = n
  for(var i = 0; i < board.length; i++) {
    if(board[i][x] != marker) {
      found_vertical = false;
      break;
    }
  }

  // Found a winning position
  if(found_vertical) return true;

  var j = 0;
  // 0, 0 to n, n along the diagonal
  for(var i = 0; i < board[0].length; i++) {
    if(board[j++][i] != marker) {
      found_diagonal = false;
      break;
    }
  }

  // Return result of looking in the diagonal
  return found_diagonal;
}

// Export functions
exports.find_all_available_gamers = find_all_available_gamers;
exports.invite_gamer              = invite_gamer;
exports.accept_game               = accept_game;
exports.decline_game              = decline_game;
exports.place_marker              = place_marker;
exports.is_game_over              = is_game_over;
