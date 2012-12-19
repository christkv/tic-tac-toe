module.exports = function(db) {
  var Gamer = function() {}

  Gamer.findGamerBySid = function(sid, callback) {
    db.collection('gamers').findOne({sid: sid}, callback);
  }

  Gamer.findAllGamersBySids = function(sids, callback) {
    db.collection('gamers').find({sid: {$in: sids}}).toArray(callback);
  }

  Gamer.updateGamersUpdatedDateBySids = function(sids, callback) {
    db.collection('gamers').update({sid:{$in: sids}}, {$set: {updated_on: new Date()}}, {multi:true}, callback);
  }

  Gamer.updateGamer = function(user_name, sid, callback) {
    db.collection('gamers').update({user_name: user_name}
      , {$set: {updated_on: new Date(), sid:sid}}
      , {upsert:true}, callback);
  }

  Gamer.init = function(callback) {
    // Create the ttl collection for active gamers, ttl collection for automatic garbage collection
    db.collection('gamers').ensureIndex({updated_on: 1}, {expireAfterSeconds: (60 * 60)}, callback);
  }

  return Gamer;
}