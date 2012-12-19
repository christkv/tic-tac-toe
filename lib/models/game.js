var ObjectID = require('mongodb').ObjectID;

module.exports = function(db) {
  var Game = function() {}

  Game.create_game = function(p1_sid, p1_user_name, p1_full_name, p2_sid, p2_user_name, p2_full_name, callback) {
    // Var new time stamp of game
    var created_on = new Date();
    // Insert the new game
    db.collection('games').insert({
        player1_sid: p1_sid
      , player1_user_name: p1_user_name
      , player1_full_name: p1_full_name
      , player2_sid: p2_sid
      , player2_user_name: p2_user_name
      , player2_full_name: p2_full_name
      , board: [
          [0, 0, 0, 0]
        , [0, 0, 0, 0]
        , [0, 0, 0, 0]
        , [0, 0, 0, 0]
      ]
      , chat: []
      , created_on: created_on
      , starting_player: p1_sid
      , current_player: p1_sid
    }, function(err, result) {
      if(err) return callback(err);
      callback(null, Array.isArray(result) ? result[0] : result);
    })
  }

  Game.find_game = function(game_id, callback) {
    db.collection('games').findOne({_id: new ObjectID(game_id)}, function(err, doc) {
      if(err) return callback(err);
      if(doc == null) return callback(new Error("could not find the game with id " + game_id));
      return callback(null, doc);
    })
  }

  Game.update_board = function(sid, game_id, next_sid, board, callback) {
    db.collection('games').update(
        {_id: new ObjectID(game_id), current_player: sid, $atomic:true}
      , {$set: {board: board, current_player: next_sid}}, function(err, result) {
        if(err) return callback(err);
        if(result == 0) return callback(new Error("It is not your turn"));
        callback(null, null);
      });
  }

  Game.save_chat_message = function(game_id, from_user_id, to_user_id, message, callback) {
    db.collection('games').update(
        {_id: new ObjectID(game_id)}
      , {$push: {chat: {from: from_user_id, to: to_user_id, message: message}}}
      , function(err, result) {
        if(err) return callback(err);
        if(result == 0) return callback(new Error("No game found to update"));
        callback(null, null);
      }
    )
  }

  // Return Game object class
  return Game;
}