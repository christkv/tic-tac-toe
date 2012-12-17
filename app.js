var env                               = require('./env')
  , register_handler                  = require('./lib/handlers/login_handler').register_handler
  , login_handler                     = require('./lib/handlers/login_handler').login_handler
  , find_all_available_gamers         = require('./lib/handlers/gamer_handler').find_all_available_gamers
  , invite_gamer                      = require('./lib/handlers/gamer_handler').invite_gamer
  , decline_game                      = require('./lib/handlers/gamer_handler').decline_game
  , accept_game                       = require('./lib/handlers/gamer_handler').accept_game
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
    socket.on('find_all_available_gamers', find_all_available_gamers(io, socket, session_store, db));  
    socket.on('invite_gamer', invite_gamer(io, socket, session_store, db));
    socket.on('decline_game', decline_game(io, socket, session_store, db));
    socket.on('accept_game', accept_game(io, socket, session_store, db));
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