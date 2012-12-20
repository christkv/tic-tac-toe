var emit_message = require("./shared").emit_message
  , is_authenticated = require("./shared").is_authenticated
  , emit_message_all = require("./shared").emit_message_all
  , emit_error = require("./shared").emit_error;

var user = require('../models/user')
  , gamer = require('../models/gamer');

/**
 * Register a new user
 */
var register_handler = function(io, socket, session_store, db) {
  // Easier to keep track of where we emitting messages
  var calling_method_name = "register";

  // Function we return that accepts the data from SocketIO
  return function(data) {
    // Unpack the parameters
    var full_name = data.full_name;
    var user_name = data.user_name;
    var password = data.password;

    // Check if the user already exists
    user(db).findByUser(user_name, function(err, _user) {
      // If there is there is an error when attempting to find the user
      if(err) return emit_error(calling_method_name, err.message, socket);
      
      // The user already exists notify the client function
      if(_user != null) 
        return emit_error(calling_method_name, "User with user name " + user_name + " already exists", socket);

      // The user does not exist, let's create it
      user(db).createUser(full_name, user_name, password, function(err, _user) {
        // There was an error during the creation of the user, emit an error message
        // to the calling client
        if(err) return emit_error(calling_method_name, err.message, socket);
        
        // We have a legal registration, lets set up the state needed
        // and log the user in
        emit_login_or_registration_ok(io, calling_method_name, db, session_store, user_name, socket);        
      });
    })
  }
}

/**
 * Attempt to login user
 */
var login_handler = function(io, socket, session_store, db) {
  // Easier to keep track of where we emitting messages
  var calling_method_name = "login";

  // Function we return that accepts the data from SocketIO
  return function(data) {
    // Unpack the parameters
    var user_name = data.user_name;
    var password = data.password;
    
    // Locate the user by user name and password
    user(db).findByUserAndPassword(user_name, password, function(err, user) {
      // If there is there is an error when attempting to find the user      
      if(err) return emit_error(calling_method_name, err.message, socket);
      // There was no user returned, meaning the user either does not exist or the
      // password is incorrect
      if(user == null) return emit_error(calling_method_name, "User or Password is incorrect", socket);
      
      // We have a legal login, lets set up the state needed
      // and log the user in
      emit_login_or_registration_ok(io, calling_method_name, db, session_store, user_name, socket);
    });
  }
}

/**
 * Updates the gamer status and sets up the session as being authenticated, finally
 * returns the gamer data to all other clients that are connected signaling a new
 * player is available
 */
var emit_login_or_registration_ok = function(io, event, db, session_store, user_name, socket) {
  // Easier to keep track of where we emitting messages
  var event_name          = "gamer_joined";

  // Update the current gamer with the new session id and update the last updated date time
  gamer(db).updateGamer(user_name, socket.handshake.sessionID, function(err, result) {
    if(err) return emit_error(event, err.message, socket);
    if(result == 0) return emit_error(event, "Failed to Save user as active", socket);

    // Set authenticated on the session
    session_store.sessions[socket.handshake.sessionID].user_name = user_name;
    
    // Return succesful login (including setting up user as logged in)
    emit_message(event, {
      ok: true
    }, socket);

    // Find the gamer so we can send the info
    gamer(db).findGamerBySid(socket.handshake.sessionID, function(err, gamer) {
      if(err) return;

      // Fire off gamer joined to all connections minus our own
      emit_message_all(io, event_name, {
          ok: true
        , result: gamer
      }, socket.handshake.sessionID);
    });
  });  
}

// Export functions
exports.register_handler = register_handler;
exports.login_handler = login_handler;
