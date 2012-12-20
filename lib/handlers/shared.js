var is_authenticated = function(socket, session_store) {
  if(session_store.sessions[socket.handshake.sessionID] == null) return false;
  if(session_store.sessions[socket.handshake.sessionID].user_name == null) return false;
  return true;
}

/**
 * Emit the standard error message across the SocketIO connection
 */
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

/**
 * Emit the standard message across the SocketIO connection
 */
var emit_message = function(event, message, socket) {
  // Add event
  message.event = event;
  // Emit
  socket.emit("data", message);
}

/**
 * Locate a specific connection by it's session id of all connections available
 */
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

/**
 * Emit a message to all clients minus the excluded session id connection
 */
var emit_message_all = function(io, event, message, exclude_sid) {
  var clients = io.sockets.clients();

  // Locate our session id
  for(var i = 0; i < clients.length; i++) {
    if(clients[i].handshake.sessionID != exclude_sid) {
      emit_message(event, message, clients[i]);
    }
  }
} 

exports.is_authenticated                = is_authenticated;
exports.emit_error                      = emit_error;
exports.emit_message                    = emit_message;
exports.locate_connection_with_session  = locate_connection_with_session;
exports.emit_message_all                = emit_message_all;
