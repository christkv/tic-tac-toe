var express     = require('express')
  , app         = express()
  , server      = require('http').createServer(app)
  , io          = require('socket.io').listen(server)
  , cfg         = require('./config/www')
  , mongo       = require('./lib/mongo')
  , env         = exports
  , session_store
  ;

/*
 * initialize our app
 */
env.initialize = function (cb) {
  /**
   * Session store, for production use mongo
   */
  session_store = new express.session.MemoryStore();

  /**
   * configure express
   */
  app.configure('development', function() {
    app.use(express.bodyParser());
    app.use(express.cookieParser());
    app.use(express["static"](__dirname + '/public'));
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
    app.use(express.session(
      { key    : 'sid'
      , secret : 'CHANGE_ME'
      , store  : session_store
      }));
  });

  app.my_session_store = session_store;

  /**
   * Capture the session id and make it available
   */
  io.set('authorization', function (data, accept) {
    //
    // check if there's a cookie header
    //
    if(data.headers.cookie) {
      //
      // if there is, parse the cookie
      //
      data.cookie = cookie.parse(data.headers.cookie);

      //
      // note that you will need to use the same key to grad the
      // session id, as you specified in the express setup.
      //
      data.session_id = data.cookie.sid;

      //
      // set the user as authenticated in on the express session
      //
      if(session_store.sessions[data.session_id] === null) {
        session_store.sessions[data.session_id] = {};
      }
    }
    else {
      //
      // if there isn't, turn down the connection with a message
      // and leave the function.
      //
      return accept('No cookie transmitted.', false);
    }
    //
    // accept the incoming connection
    //
    accept(null, true);
  });

  cb(app, io, server);
};

/*
 * run our app
 */
env.run = function (cb) {
  mongo.connect(function (err, response) {
    if(err) {
      if(mongo.db) {
        mongo.db.close();
      }
      throw err;
    }

    server.listen(cfg.port, function(err) {
      if(err) {
        mongo.db.close();
        throw err;
      }

      env.session_store = session_store;

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
        , "listening on port " + cfg.port
        ].join('\n'));

      cb(app, io, server);
    });
  });
};

