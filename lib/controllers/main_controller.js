var path = require('path');

/**
 * Returns the actual starting page of the game
 */
var index = function() {
  return function(request, response) {
    var html = path.normalize(__dirname + '/../views/index.html');
    response.sendfile(html);
  }  
}

exports.index = index;