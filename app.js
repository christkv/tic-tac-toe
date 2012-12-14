var express = require('express')
  , MongoClient = require('mongodb').MongoClient
  , format = require('util').format
  , app = express()
  , server = require('http').createServer(app)
  , io = require('socket.io').listen(server)
  , crypto = require('crypto')
  , cookie = require('cookie');

var user = require('./lib/models/user')
  , gamer = require('./lib/models/gamer');

var login_controller = require('./lib/controllers/login_controller')
  , gamer_controller = require('./lib/controllers/gamer_controller');

console.dir(gamer_controller)

/** 
 * configure mongodb
 */
var MONGO_DB_URL = process.env.MONGO_DB || 'mongodb://localhost:27017/tic-tac-toe';
var APP_HOST = process.env.APP_HOST || "localhost"; 
var APP_PORT = process.env.APP_PORT || 3000;

/** 
 * Keeps the db connection
 */
var db = null;

/**
 * Session store, for production use mongo
 */
var session_store = new express.session.MemoryStore();

/**
 * configure express
 */
app.configure('development', function() {
  app.use(express.bodyParser());
  app.use(express.cookieParser());
  app.use(express.static(__dirname + '/public'));
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
  app.use(express.session({ 
    key: 'sid',
    secret: 'CHANGE_ME',
    store: session_store
  }));
});

/**
 * initialize controllers & models
 */
app.get('/', function(request, response) {
  var html = path.normalize(__dirname + '/../../public/index.html');
  response.sendfile(html);  
});

/**
 * Capture the session id and make it available
 */
io.set('authorization', function (data, accept) {
  // check if there's a cookie header
  if(data.headers.cookie) {
    // if there is, parse the cookie
    data.cookie = cookie.parse(data.headers.cookie);
    // note that you will need to use the same key to grad the
    // session id, as you specified in the Express setup.
    data.sessionID = data.cookie['sid'];
    // Set the user as authenticated in on the express session
    if(session_store.sessions[data.sessionID] == null) {
      session_store.sessions[data.sessionID] = {}
    }
  } else {
   // if there isn't, turn down the connection with a message
   // and leave the function.
   return accept('No cookie transmitted.', false);
  }
  // accept the incoming connection
  accept(null, true);
});

/**
 * Wire up Socket IO protocol command handlers
 */
io.sockets.on('connection', function (socket) {
  socket.on('register', login_controller.register_handler(socket, session_store, db));
  socket.on('login', login_controller.login_handler(socket, session_store, db));
  socket.on('find_all_available_gamers', gamer_controller.find_all_available_gamers_handler(io, socket, session_store, db));
});

/**
 * Connect to MongoDB and start the server
 */
MongoClient.connect(MONGO_DB_URL, function(err, _db) {
  if(err) throw err;
  db = _db;

  gamer(db).init(function(err, result) {
    if(err) throw err;

    server.listen(APP_PORT, APP_HOST, function(err) {
      if(err) {
        db.close();
        throw err;
      }

      console.log(format("server listening on %s:%s", APP_HOST, APP_PORT));
    });
  });
});