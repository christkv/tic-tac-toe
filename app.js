var env                               = require('./env')
  , register_handler                  = require('./lib/handlers/login_handler').register_handler
  , login_handler                     = require('./lib/handlers/login_handler').login_handler
  , find_all_available_gamers_handler = require('./lib/handlers/gamer_handler').find_all_available_gamers_handler
  , main_controller                   = require('./lib/controllers/main_controller');

env.initialize(function(err, app, io, session_store, db) {  
  if(err) throw err;

  //
  // http routes
  //
  app.get('/', main_controller.index());

  //
  // websocket api end point handlers (our API)
  //
  io.sockets.on('connection', function (socket) {
    socket.on('register', register_handler(socket, session_store, db));
    socket.on('login', login_handler(socket, session_store, db));
    socket.on('find_all_available_gamers', find_all_available_gamers_handler(io, socket, session_store, db));  
  });

  //
  // fire up the server
  //  
  env.run(function(err) {
    if(err) throw err;
    
    //
    // nothing to do
    //
  });
});