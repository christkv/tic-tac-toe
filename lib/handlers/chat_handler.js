var emit_message = require("./shared").emit_message
  , is_authenticated = require("./shared").is_authenticated
  , locate_connection_with_session = require('./shared').locate_connection_with_session
  , emit_error = require("./shared").emit_error;

var game = require('../models/game');

var send_message = function(io, socket, session_store, db) {
  return function(data) {
    console.log("= send_message");
    console.dir(data)    
    // Verify that we are logged in
    if(!is_authenticated(socket, session_store)) return emit_error("send_message", "User not authenticated", socket);

    // Unpack the values
    var our_sid = socket.handshake.sessionID;
    var game_id = data.game_id;
    var message = data.message;

    // Locate the game
    game(db).find_game(game_id, function(err, game_doc) {
      if(err) return emit_error("send_message", err.message, socket);

      // Which player are we signaling
      var destination_sid = game_doc.player1_sid == our_sid ? game_doc.player2_sid : game_doc.player1_sid;
      // Locate connection
      var connection = locate_connection_with_session(io, destination_sid);
      // Get user names
      var our_user_id = game_doc.player1_sid == our_sid ? game_doc.player1_user_name : game_doc.player2_user_name;
      var their_user_id = game_doc.player1_sid == destination_sid ? game_doc.player1_user_name : game_doc.player2_user_name;

      // if null emit error
      if(connection == null) return emit_error("send_message", "User is no longer available", socket);

      // Save the message to the list of chat messages for the game
      game(db).save_chat_message(game_id, our_user_id, their_user_id, message, function(err, result) {
        if(err) return emit_error("send_message", err.message, socket);

        // Fire off the message
        emit_message("chat_message", {
            ok: true
          , result: { from_sid: our_sid, message: message }
        }, connection);    

        // Delivery went well  
        emit_message("send_message", {
            ok: true
          , result: {}
        }, socket);    
      });
    });
  }
}

exports.send_message = send_message;