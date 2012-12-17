var emit_message = require("./shared").emit_message
  , is_authenticated = require("./shared").is_authenticated
  , emit_error = require("./shared").emit_error;

var user = require('../models/user')
  , gamer = require('../models/gamer');

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
