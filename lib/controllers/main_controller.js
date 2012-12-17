/**
 * initialize controllers & models
 */
var index = function() {
  return function(request, response) {
    var html = path.normalize(__dirname + '/../../public/index.html');
    response.sendfile(html);      
  }  
}

exports.index = index;