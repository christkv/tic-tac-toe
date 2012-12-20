var express = require('express')
  , MongoClient = require('mongodb').MongoClient
  , format = require('util').format
  , app = express()
  , server = require('http').createServer(app)
  , io = require('socket.io').listen(server)
  , cookie = require('cookie')
  , gamer = require('./lib/models/gamer');

/** 
 * Setting for the application
 */
var MONGO_DB_URL = process.env.MONGO_DB || 'mongodb://localhost:27017/tic-tac-toe';
var APP_HOST = process.env.APP_HOST || 'localhost'; 
var APP_PORT = process.env.APP_PORT || 3000;
var SESSION_SECRET = process.env.SESSION_SECRET || 'CHANGE_ME';

/** 
 * Keeps the db connection
 */
var db = null;

/**
 * Session store, for production use mongo
 */
var session_store = new express.session.MemoryStore();

/**
 * Set up the environment for the application
 */
var initialize = function(callback) {
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
      secret: SESSION_SECRET,
      store: session_store
    }));
  });

  /**
   * Capture the session id and make it available
   */
  io.set('authorization', function (data, accept) {
    // check if there's a cookie header
    if(data.headers['cookie']) {
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
   * Connect to MongoDB and start the server
   */
  MongoClient.connect(MONGO_DB_URL, function(err, _db) {
    if(err) return callback(err);

    // Save the db reference
    db = _db;

    // Return the callback
    callback(null, app, io, session_store, db);
  });
};

var run = function(callback) {
  gamer(db).init(function(err, result) {
    if(err) return callback(err);

    server.listen(APP_PORT, APP_HOST, function(err) {
      if(err) {
        db.close();
        return callback(err);
      }

      // Print out a nice message to the console
      console.log(
          [ ""
          , "        |       |"
          , "        |       |"
          , "  — — — | — — — | — — — "
          , "        |       |"
          , "        |       |"
          , "  — — — | — — — | — — — "
          , "        |       |"
          , "        |       |"
          , ""
          , "tic-tac-toe server v" + require('./package.json').version
          , "listening on port " + APP_PORT + " and host " + APP_HOST
        ].join('\n'));

      // Return successful start of server
      callback(null);
    });
  });  
}

exports.initialize = initialize;
exports.run = run;
