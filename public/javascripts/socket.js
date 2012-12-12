var API = function() {
  this.socket = io.connect("http://localhost");
  this.handlers = {};

  socket.on("data", function(data) {
    if(data && data.event) {
      var handlers = this.handlers[event];
      if(handlers != null) {
        for(var i = 0; i < handlers.length; i++) handlers[i](data);
      }
    }
  });  
}

API.prototype.on = function(event, callback) {
  if(this.handlers[event] == null) this.handlers[event] = [];
  this.handlers[event].push(callback);
}

/** 
 * Available api methods
 */
API.prototype.register = function(firstname, lastname, username) {  
}

API.prototype.login = function(username) {  
}

API.prototype.find_all_public_games = function() {  
}

API.prototype.join_game = function(game_id) {  
}

API.prototype.place_marker = function(game_id, x, y) {  
}

API.prototype.quit_game = function(game_id) {  
}

API.prototype.fetch_statistics = function(user_id) {  
}
