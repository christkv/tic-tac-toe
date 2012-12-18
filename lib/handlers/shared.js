var is_authenticated = function(socket, session_store) {
  if(session_store.sessions[socket.handshake.sessionID] == null) return false;
  if(session_store.sessions[socket.handshake.sessionID].user_name == null) return false;
  return true;
}

var emit_error = function(event, err, socket) {
  if(Array.isArray(socket)) {
    for(var i = 0; i < socket.length; i++) {
      socket[i].emit("data", {
          event: event
        , ok: false
        , is_error:true
        , error: err
      });          
    }
  } else {
    socket.emit("data", {
        event: event
      , ok: false
      , is_error:true
      , error: err
    });    
  }
}

var emit_message = function(event, message, socket) {
  // Add event
  message.event = event;
  // Emit
  socket.emit("data", message);
}

exports.is_authenticated = is_authenticated;
exports.emit_error = emit_error;
exports.emit_message = emit_message;
