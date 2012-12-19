var API = function() {
  var self = this;

  this.socket = io.connect("http://" + document.domain);
  this.handlers = {};
  this.once_handlers = {};

  this.socket.on("data", function(data) {
    // console.log("------------------------- recieved")
    // console.log(data)
    // console.log(Object.keys(self.handlers))
    // console.log(Object.keys(self.once_handlers))

    if(data && data.event) {
      var handlers = self.handlers[data.event];
      if(handlers != null) {
        for(var i = 0; i < handlers.length; i++) {
          data.is_error ? handlers[i](data) : handlers[i](null, data);
        }
      }
      
      var handlers = self.once_handlers[data.event];
      if(handlers != null) {
        while(handlers.length > 0) {
          data.is_error ? handlers.pop()(data) : handlers.pop()(null, data);
        }

        delete self.once_handlers[data.event];
      }
    }
  });
}

API.prototype.on = function(event, callback) {
  if(this.handlers[event] == null) this.handlers[event] = [];
  this.handlers[event].push(callback);
}

API.prototype.once = function(event, callback) {
  if(this.once_handlers[event] == null) this.once_handlers[event] = [];
  this.once_handlers[event].push(callback);
}

/** 
 * Available api methods
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

API.prototype.find_all_available_gamers = function(callback) {  
  // Register callback
  this.once("find_all_available_gamers", function(err, data) {
    if(err) return callback(err, null);
    callback(null, data.gamers);
  });
  // Fire message
  this.socket.emit("find_all_available_gamers", {});
}

API.prototype.invite_gamer = function(gamer, callback) {
  this.once("invite_gamer", function(err, data) {
    if(err) return callback(err);
    callback(null, data.game);
  });

  this.socket.emit("invite_gamer", gamer);
} 

API.prototype.decline_game = function(invite, callback) {
  this.once("decline_game", function(err, data) {
    if(err) return callback(err);
    callback(null, data.game);
  });

  this.socket.emit("decline_game", invite);
}

API.prototype.accept_game = function(invite, callback) {
  this.once("accept_game", function(err, data) {
    if(err) return callback(err);
    callback(null, data.game);
  });

  this.socket.emit("accept_game", invite);
}

API.prototype.place_marker = function(game_id, x, y, callback) {  
  this.once("place_marker", function(err, data) {
    if(err) return callback(err);
    callback(null, data.result);    
  })

  this.socket.emit("place_marker", {
      game_id: game_id
    , x: x
    , y: y
  });
}

API.prototype.send_message = function(game_id, message, callback) {
  this.once("send_message", function(err, data) {
    if(err) return callback(err);
    callback(null, data.result);
  });  

  this.socket.emit("send_message", {game_id: game_id, message: message});
}

API.prototype.fetch_statistics = function(user_id, callback) {  
}

var create_error = function(event, err) {
  return {
      event: event
    , ok: false
    , is_error: true
    , error: err
  }
}
