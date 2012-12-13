var env            = require('./env')
  , static_handler = require('./handlers/static')
  , users          = require('./handlers/users')
  ;

env.initialize(function(app, io, server) {
  
  //
  // http routes
  //
  app.get('/', static_handler.index);

  //
  // websocket routes
  //
  io.sockets.on('connection', function (socket) {
    socket.on('register', users.create(socket));
    socket.on('login', user.login(socket));
    socket.on('find_all_available_gamers', user.find_all(socket));
  });

  env.run(function (app, io, server) {
    //
    // nothing to do
    //
  });
});