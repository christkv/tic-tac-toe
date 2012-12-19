var chat = function(io, socket, session_store, db) {
  return function(data) {
    console.log("= chat");
    console.dir(data)    
    // Verify that we are logged in
    if(!is_authenticated(socket, session_store)) return emit_error("chat", "User not authenticated", socket);

    // Unpack the values
    var our_sid = socket.handshake.sessionID;
    var destination_sid = data.sid;
    var message = data.message;

    // Locate connection
    var connection = locate_connection_with_session(io, destination_sid);
  }
}

exports.chat = chat;