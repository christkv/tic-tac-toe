var static_handler = exports;

static_handler.index = function (request, response) {
  var html = path.normalize(__dirname + '/../public/index.html');
  response.sendfile(html);
}