/**
 * Wraps the API used for the game and handles the socketIO connection
 */
var API = function() {
  var self = this;

  this.socket = io.connect("http://" + document.domain);
  this.handlers = {};
  this.once_handlers = {};

  // Handle the data returned over the SocketIO
  this.socket.on("data", function(data) {

    // If the data object has an event member we have
    // a valid event message from the server
    if(data && data.event) {
      var handlers = self.handlers[data.event];
      if(handlers != null) {
        for(var i = 0; i < handlers.length; i++) {
          data.is_error ? handlers[i](data) : handlers[i](null, data.result);
        }
      }
      
      var handlers = self.once_handlers[data.event];
      if(handlers != null) {
        while(handlers.length > 0) {
          data.is_error ? handlers.pop()(data) : handlers.pop()(null, data.result);
        }

        delete self.once_handlers[data.event];
      }
    }
  });
}

/**
 * Register an event listener callback (will keep receiving messages)
 */
API.prototype.on = function(event, callback) {
  if(this.handlers[event] == null) this.handlers[event] = [];
  this.handlers[event].push(callback);
}

/**
 * Register an event listener callback for a single instance of the event
 */
API.prototype.once = function(event, callback) {
  if(this.once_handlers[event] == null) this.once_handlers[event] = [];
  this.once_handlers[event].push(callback);
}

/**
 * Register a new user
 */
API.prototype.register = function(full_name, user_name, password, callback) {  
  // Do basic validation
  if(full_name == null || full_name.length == 0) return callback(create_error("register", "Full name cannot be empty"));
  if(user_name == null || user_name.length == 0) return callback(create_error("register", "User name cannot be empty"));
  if(password == null || password.length == 0) return callback(create_error("register", "Password name cannot be empty"));
  // Register callback
  this.once("register", callback);
  // Fire message
  this.socket.emit("register", {
      full_name: full_name
    , user_name: user_name
    , password: password
  });
}

/**
 * Login a user
 */
API.prototype.login = function(user_name, password, callback) {  
  // Do basic validation
  if(user_name == null || user_name.length == 0) return callback(create_error("login", "User name cannot be empty"));
  if(password == null || password.length == 0) return callback(create_error("login", "Password name cannot be empty"));
  // Register callback
  this.once("login", callback);
  // Fire message
  this.socket.emit("login", {
      user_name: user_name
    , password: password
  });
}

/**
 * Find all available gamers that are active
 */
API.prototype.find_all_available_gamers = function(callback) {  
  this.once("find_all_available_gamers", callback);
  this.socket.emit("find_all_available_gamers", {});
}

/**
 * Invite a gamer to a new game
 */
API.prototype.invite_gamer = function(gamer, callback) {
  this.once("invite_gamer", callback);
  this.socket.emit("invite_gamer", gamer);
} 

/**
 * Decline an invite to play a game
 */
API.prototype.decline_game = function(invite, callback) {
  this.once("decline_game", callback);
  this.socket.emit("decline_game", invite);
}

/**
 * Accept an invite to play a game
 */
API.prototype.accept_game = function(invite, callback) {
  this.once("accept_game", callback);
  this.socket.emit("accept_game", invite);
}

/**
 * Place a marker on a specific game at a specific location
 */
API.prototype.place_marker = function(game_id, x, y, callback) {  
  this.once("place_marker", callback);
  this.socket.emit("place_marker", {
      game_id: game_id
    , x: x
    , y: y
  });
}

/**
 * Send a message to a specific gamer on a specific game
 */
API.prototype.send_message = function(game_id, message, callback) {
  this.once("send_message", callback);  
  this.socket.emit("send_message", {game_id: game_id, message: message});
}

/**
 * Simple method to create a formated error message that fits the
 * format returned from the server
 */
var create_error = function(event, err) {
  return {
      event: event
    , ok: false
    , is_error: true
    , error: err
  }
}
