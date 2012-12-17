var emit_message = require("./shared").emit_message
  , is_authenticated = require("./shared").is_authenticated
  , emit_error = require("./shared").emit_error;

var user = require('../models/user')
  , gamer = require('../models/gamer');

var find_all_available_gamers_handler = function(io, socket, session_store, db) {
  return function(data) {
    console.log("= find_all_available_gamers_handler");

    // console.log("==========================================")
    // console.dir(socket.handshake.sessionID)
    // console.dir(session_store.sessions[socket.handshake.sessionID])
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

// Export functions
exports.find_all_available_gamers_handler = find_all_available_gamers_handler;
