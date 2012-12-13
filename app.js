var express = require('express')
  , MongoClient = require('mongodb').MongoClient
  , format = require('util').format
  , app = express()
  , server = require('http').createServer(app)
  , io = require('socket.io').listen(server)
  , crypto = require('crypto')
  , cookie = require('cookie');

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
  socket.on('register', register_handler(socket, db));
  socket.on('login', login_handler(socket, db));
  socket.on('find_all_available_gamers', find_all_available_gamers_handler(socket, db));
});

/**
 * Connect to MongoDB and start the server
 */
MongoClient.connect(MONGO_DB_URL, function(err, _db) {
  if(err) throw err;
  db = _db;

  // Create the ttl collection for active gamers, ttl collection for automatic garbage collection
  db.collection('gamers').ensureIndex({updated_on: 1}, {expireAfterSeconds: (60 * 60)}, function(err, result) {

    server.listen(APP_PORT, APP_HOST, function(err) {
      if(err) {
        db.close();
        throw err;
      }

      console.log(format("server listening on %s:%s", APP_HOST, APP_PORT));
    });
  });
});

/**
 * All event handlers
 */
var register_handler = function(socket, db) {
  return function(data) {
    var full_name = data.full_name;
    var user_name = data.user_name;
    var password = data.password;

    var users = db.collection('users');
    users.findOne({user_name: user_name}, function(err, doc) {
      // Got error return to client
      if(err) return emit_error("register", err.message, socket);
      // User exists return error
      if(doc != null) 
        return emit_error("register", "User with user name " + user_name + " already exists", socket);

      // Hash password
      var sha1 = crypto.createHash('sha1');
      sha1.update(password);
      // Get digest
      var hashed_password = sha1.digest('hex');

      // No user create one and send confirmation to user
      users.insert({
        full_name: full_name, user_name: user_name, password: hashed_password
      }, function(err, result) {
        if(err) return emit_error("register", err.message, socket);
        
        emit_login_or_registration_ok("register", db, user_name, socket);
      })
    })
  }
}

var login_handler = function(socket, db) {
  return function(data) {
    var user_name = data.user_name;
    var password = data.password;

    // Hash password
    var sha1 = crypto.createHash('sha1');
    sha1.update(password);
    // Get digest
    var hashed_password = sha1.digest('hex');
    // Check if user exists
    var users = db.collection('users');
    var gamers = db.collection('gamers');
    users.findOne({user_name: user_name, password: hashed_password}, function(err, user) {
      if(err) return emit_error("login", err.message, socket);
      if(user == null) return emit_error("login", "User or Password is incorrect", socket);
      
      emit_login_or_registration_ok("login", db, user_name, socket);
    });
  }
}

var emit_login_or_registration_ok = function(event, db, user_name, socket) {
  var gamers = db.collection('gamers');
  // Save the user as active, including session id
  gamers.update({user_name: user_name}, {$set: {updated_on: new Date(), sid:socket.handshake.sessionID}}
    , {upsert:true}, function(err, result) {
    if(err) return emit_error(event, err.message, socket);
    if(result == 0) return emit_error(event, "Failed to Save user as active", socket);

    // Set authenticated
    session_store.sessions[socket.handshake.sessionID].user_name = user_name;
    // Return succesful login (including setting up user as logged in)
    emit_message(event, {
      ok: true
    }, socket);
  });  
}

var find_all_available_gamers_handler = function(socket, db) {
  return function(data) {
    console.log("==========================================")
    console.dir(socket.handshake.sessionID)
    console.dir(session_store.sessions[socket.handshake.sessionID])
    // Verify that we are logged in
    if(!is_authenticated(socket)) return emit_error("find_all_public_games", "User not authenticated", socket);
    
    // Locate all active socket connections, and get the gamers information
    var clients = io.sockets.clients();
    var sids = [];

    // Iterate over all the users but ignore us
    for(var i = 0; i < clients.length; i++) {
      if(clients[i].handshake.sessionID != socket.handshake.sessionID) {
        sids.push(clients[i].handshake.sessionID);
      }
    }

    console.dir(sids)

    // Alright grab all the gamers information
    var gamers_collection = db.collection('gamers');
    gamers_collection.find({sid: {$in: sids}}).toArray(function(err, gamers) {
      if(err) return emit_error("find_all_available_gamers", err.message, socket);    

      // Update all the gamers last active check time
      gamers_collection.update({sid:{$in: sids}}, {$set: {updated_on: new Date()}}, function(err, result) {
        if(err) return emit_error("find_all_available_gamers", err.message, socket);    
  
        // Return the games
        emit_message("find_all_available_gamers", {
            ok: true
          , gamers: gamers
        }, socket);    
      });
    });    
  } 
}

/**
 * Handlers
 */
var is_authenticated = function(socket) {
  if(session_store.sessions[socket.handshake.sessionID] == null) return false;
  if(session_store.sessions[socket.handshake.sessionID].user_name == null) return false;
  return true;
}

var emit_error = function(event, err, socket) {
  socket.emit("data", {
      event: event
    , ok: false
    , is_error:true
    , error: err
  });
}

var emit_message = function(event, message, socket) {
  // Add event
  message.event = event;
  // Emit
  socket.emit("data", message);
}