var API = function() {
  this.socket = io.connect("http://localhost");
  this.handlers = {};

  this.socket.on("data", function(data) {
    if(data && data.event) {
      var handlers = this.handlers[event];
      if(handlers != null) {
        for(var i = 0; i < handlers.length; i++) handlers[i](data);
      }
      
      var handlers = this.once_handlers[event];
      if(handlers != null) {
        while(handlers.length > 0) {
          handlers.pop()(data);
        }
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
API.prototype.register = function(firstname, lastname, username, callback) {  
  // Register callback
  this.once("register", callback);
  // Fire message
  this.socket.emit("register", {
      firstname: firstname
    , lastname: lastname
    , username: username
  })
}

API.prototype.login = function(username, callback) {  
}

API.prototype.find_all_public_games = function(callback) {  
}

API.prototype.join_game = function(game_id, callback) {  
}

API.prototype.place_marker = function(game_id, x, y, callback) {  
}

API.prototype.quit_game = function(game_id, callback) {  
}

API.prototype.fetch_statistics = function(user_id, callback) {  
}
