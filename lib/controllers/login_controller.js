var emit_message = require("./shared").emit_message
  , is_authenticated = require("./shared").is_authenticated
  , emit_error = require("./shared").emit_error;

var user = require('../models/user')
  , gamer = require('../models/gamer');

/**
 * All event handlers
 */
var register_handler = function(socket, session_store, db) {
  return function(data) {
    console.log("= register_handler");
    var full_name = data.full_name;
    var user_name = data.user_name;
    var password = data.password;

    user(db).findByUser(user_name, function(err, _user) {
      // Got error return to client
      if(err) return emit_error("register", err.message, socket);
      // User exists return error
      if(_user != null) 
        return emit_error("register", "User with user name " + user_name + " already exists", socket);

      user(db).createUser(full_name, user_name, password, function(err, _user) {
        if(err) return emit_error("register", err.message, socket);
        
        emit_login_or_registration_ok("register", db, session_store, user_name, socket);        
      });
    })
  }
}

var login_handler = function(socket, session_store, db) {
  return function(data) {
    console.log("= login_handler");
    var user_name = data.user_name;
    var password = data.password;
    
    // Get the user
    user(db).findByUserAndPassword(user_name, password, function(err, user) {
      if(err) return emit_error("login", err.message, socket);
      if(user == null) return emit_error("login", "User or Password is incorrect", socket);
      
      emit_login_or_registration_ok("login", db, session_store, user_name, socket);
    });
  }
}

var emit_login_or_registration_ok = function(event, db, session_store, user_name, socket) {
  gamer(db).updateGamer(user_name, socket.handshake.sessionID, function(err, result) {
    if(err) return emit_error(event, err.message, socket);
    if(result == 0) return emit_error(event, "Failed to Save user as active", socket);

    // Set authenticated
    session_store.sessions[socket.handshake.sessionID].user_name = user_name;
    // Return succesful login (including setting up user as logged in)
    emit_message(event, {
      ok: true
    }, socket);
  });  
}

// Export functions
exports.register_handler = register_handler;
exports.login_handler = login_handler;
