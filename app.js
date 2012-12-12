var express = require('express')
  , MongoClient = require('mongodb').MongoClient
  , format = require('util').format
  , app = express();

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
 * configure express
 */
app.configure('development', function() {
  app.use(express.bodyParser());
  app.use(express.cookieParser());
  app.use(express.static(__dirname + '/public'));
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
  app.use(express.session({ 
    key: 'sid',
    secret: 'CHANGE_ME'
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
 * Connect to MongoDB and start the server
 */
MongoClient.connect(MONGO_DB_URL, function(err, _db) {
  if(err) throw err;
  db = _db;

  app.listen(APP_PORT, APP_HOST, function(err) {
    if(err) {
      db.close();
      throw err;
    }

    console.log(format("server listening on %s:%s", APP_HOST, APP_PORT));
  });
});
