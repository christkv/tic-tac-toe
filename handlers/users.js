var mongo  = require('../lib/mongo')
  , crypto = require('crypto')
  , session_store
  , users  = exports
  ;

users.create = function (socket) {
  return function (data) {
    data.session_id = socket.handshake.session_id;

    mongo.user.create(data, function (err, user) {
      if(err) {
        return socket.emit('data', 
          { 'event'    : 'register'
          , 'ok'       : false
          , 'is_error' : true
          , 'error'    : typeof err === 'string' ? err : (err.message || '')
          });
      }

      delete user.session_id;

      socket.emit('data', 
        { 'event' : 'register'
        , 'ok'    : true
        , 'user'  : user
        });
    });
  };
};

users.login = function (socket) {
  return function (data) {
    var user_name  = data.user_name
      , password   = data.password
      , hashed_pwd
      ;

      data.session_id = socket.handshake.session_id;

      try {
        hashed_pwd = crypto
          .createHash('sha1')
          .update(password)
          .digest('hex')
          ;
      }
      catch (exc) {
        return socket.emit('data', 
          { 'event'    : 'login'
          , 'ok'       : false
          , 'is_error' : true
          , 'error'    : 'Crypto failed'
          });
      }

      mongo.collection.users.findOne( 
        { user_name: user_name
        , password: hashed_password
        }, function(err, user) {

        if(err) {
          return socket.emit('data', 
            { 'event'    : 'login'
            , 'ok'       : false
            , 'is_error' : true
            , 'error'    : err.message
            });
        }

        if(user === null) {
          return socket.emit('data', 
            { 'event'    : 'login'
            , 'ok'       : false
            , 'is_error' : true
            , 'error'    : 'Username or password is incorrect'
            });
        }

        mongo.user.set_active(data, function (err) {
          if(err) {
            return socket.emit('data', 
              { 'event'    : 'login'
              , 'ok'       : false
              , 'is_error' : true
              , 'error'    : err.message
              });
          }

          delete user.session_id;

          socket.emit('data', 
            { 'event' : 'login'
            , 'ok'    : true
            , 'user'  : user
            });
        });
      });
  };
};

users.find_all = function (socket, app) {
  function is_authenticated() {
    session_store = session_store
              ? session_store 
              : require('../env').session_store
              ;

    if(session_store.sessions[socket.handshake.session_id] === null) {
      return false;
    }

    if(session_store.sessions[socket.handshake.session_id].user_name === null) {
      return false;
    }

    return true;
  }

  return function (data) {
    if(!is_authenticated()) {
      return socket.emit('data', 
        { 'event'    : 'find_all_public_games'
        , 'ok'       : false
        , 'is_error' : true
        , 'error'    : 'You must authenticate to play a game'
        });
    }

    var clients = io.sockets.clients()
      , sids    = []
      ;

    //
    // Iterate over all the users but ignore us
    //
    for(var i = 0; i < clients.length; i++) {
      if(clients[i].handshake.session_id !== socket.handshake.session_id) {
        sids.push(clients[i].handshake.sessionID);
      }
    }

    mongo.user.all_available(sids, function (err, gamers) {
      if(err) {
        return socket.emit('data', 
          { 'event'    : 'find_all_public_games'
          , 'ok'       : false
          , 'is_error' : true
          , 'error'    : err.message
          });
      }

      socket.emit('data', 
        { 'event' : 'find_all_public_games'
        , 'ok'    : true
        , 'gamers': gamers
        });
    });
  };
};