var emit_message = require("./shared").emit_message
  , is_authenticated = require("./shared").is_authenticated
  , locate_connection_with_session = require('./shared').locate_connection_with_session
  , emit_error = require("./shared").emit_error;

var game = require('../models/game');

/**
 * This function handles the sending of a chat message between two players in a specific
 * game
 */
var send_message = function(io, socket, session_store, db) {
  // Easier to keep track of where we emitting messages
  var calling_method_name = "send_message";
  var event_name          = "chat_message";

  // Function we return that accepts the data from SocketIO
  return function(data) {
    // Verify that we are logged in
    if(!is_authenticated(socket, session_store)) return emit_error(calling_method_name, "User not authenticated", socket);

    // Let's our session id, the game id and the message we 
    // want to save
    var our_sid = socket.handshake.sessionID;
    var game_id = data.game_id;
    var message = data.message;

    // Use the game id to locate the game
    game(db).find_game(game_id, function(err, game_doc) {
      // If there is no game return an error message to the calling function on the client
      if(err) return emit_error(calling_method_name, err.message, socket);

      // Get the session id of the player we are sending the message to
      // that is simply the other player or the other side in the game
      var destination_sid = game_doc.player1_sid == our_sid ? game_doc.player2_sid : game_doc.player1_sid;
      
      // Locate the destination connection
      var connection = locate_connection_with_session(io, destination_sid);
      
      // If there is no connection it means the other player went away, send an error message
      // to the calling function on the client
      if(connection == null) return emit_error(calling_method_name, "User is no longer available", socket);

      // Let's get the calling functions user name
      // and the destination user's user name
      var our_user_id = game_doc.player1_sid == our_sid ? game_doc.player1_user_name : game_doc.player2_user_name;
      var their_user_id = game_doc.player1_sid == destination_sid ? game_doc.player1_user_name : game_doc.player2_user_name;

      // Save the message to the list of chat messages for the game
      game(db).save_chat_message(game_id, our_user_id, their_user_id, message, function(err, result) {
        // Failed to save the chat message, notify the calling function on the client about the error
        if(err) return emit_error(calling_method_name, err.message, socket);

        // Notify the destination user about the new chat message
        emit_message(event_name, {
            ok: true
          , result: { from_sid: our_sid, message: message }
        }, connection);    

        // Notify the calling function that the message delivery was successful
        emit_message(calling_method_name, {
            ok: true
          , result: {}
        }, socket);    
      });
    });
  }
}

exports.send_message = send_message;