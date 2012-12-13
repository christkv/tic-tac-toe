var cfg         = require('../config/mongo')
  , crypto      = require('crypto')
  , MongoClient = require('mongodb').MongoClient
  , mongo       = exports
  ;

/** 
 * Keeps the db connection
 */
mongo.db = null;

/**
 * Connect to MongoDB and start the server
 */
mongo.connect = function (cb) {
  //
  // If a connection already exists just return it
  //
  if(mongo.db) {
    return cb(null, mongo.db);
  }

  MongoClient.connect(cfg.url, function(err, db) {
    if(err) {
      return cb(err);
    }
    
    //
    // Sets the db to the new connection
    //
    mongo.db = db;

    //
    // Sets out collection shortcuts
    //
    mongo.collection = {};
    mongo.collection.users  = mongo.db.collection('users');
    mongo.collection.gamers = mongo.db.collection('gamers');

    //
    // Create the ttl collection for active gamers,
    // ttl collection for automatic garbage collection
    //
    mongo.collection.gamers
      .ensureIndex( { updated_on: 1 }, 
                    { expireAfterSeconds: (60 * 60) }, cb);
  });
};

mongo.user = {};

/*
 * Create a new user (or at least try)
 */
mongo.user.create = function (data, cb) {
  var full_name  = data.full_name
    , user_name  = data.user_name
    , password   = data.password
    , session_id = data.session_id
    , users      = mongo.collection.users
    ;

  if(!full_name || !user_name || !password) {
    return cb(new Error('`full_name`, `user_name`, and `password` required'));
  }

  if(!session_id) {
    return cb(new Error('`session_id` is required'));
  }

  users.findOne({user_name : user_name}, function (err,doc) {
    if(err) {
      return cb(err);
    }

    //
    // User already exists
    //
    if(doc) {
      return cb(new Error('Username ' + user_name + ' is already taken.'));
    }

    //
    // Username is available
    //
    var hashed_pwd;

    try {
      hashed_pwd = crypto
        .createHash('sha1')
        .update(password)
        .digest('hex')
        ;
    }
    catch (exc) {
      return cb(exc);
    }

   var current_user =
     { full_name : full_name
     , user_name : user_name
     , password  : hashed_pwd
     }
     ;

    users.insert(current_user, function(err, result) {
      if(err) {
        return cb(err);
      }

      current_user.session_id = session_id;

      mongo.user.set_active(user, cb);
    });
  });
};

/*
 * Set a user as active
 */
mongo.user.set_active = function (user, cb) {
  var gamers = mongo.collection.gamers;
  gamers.update({ user_name : user.user_name }
    , { $set   : { updated_on: new Date(), sid: user.session_id } }
    , { upsert : true }, function (err, exit_code) {

    if(err) {
      return cb(err);
    }

    if(exit_code === 0) {
      return cb(new Error('Failed to save user as active'));
    }

    cb(null, user);
  });
};

/*
 * List all available users
 */
mongo.user.all_available = function (sids, cb) {
  var gamers = mongo.collection.gamers;

  gamers.find({ sid: { $in: sids } }).toArray(function(err, all_gamers) {
    if(err) {
      return cb(err);
    }

    gamers.update({ sid: { $in: sids } }
      , { $set: { updated_on: new Date() } }, function (err, exit_code) {
      if(err) {
        return cb(err);
      }

      cb(null, all_gamers);
    });
  });
};