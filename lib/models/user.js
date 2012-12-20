var crypto = require('crypto');

module.exports = function(db) {
  var User = function() {}

  //
  // Locate a user by a user name
  //
  User.findByUser = function(user_name, callback) {
    db.collection('users').findOne({user_name: user_name}, callback);
  }

  //
  // Locate a user by user name and password
  //
  User.findByUserAndPassword = function(user_name, password, callback) {
    // Hash password
    var sha1 = crypto.createHash('sha1');
    sha1.update(password);
    // Get digest
    var hashed_password = sha1.digest('hex');
    // Locate user
    db.collection('users').findOne({user_name: user_name, password: hashed_password}, callback);
  }

  //
  // Create a new user with full name and password
  //
  User.createUser = function(full_name, user_name, password, callback) {
    // Hash password
    var sha1 = crypto.createHash('sha1');
    sha1.update(password);
    // Get digest
    var hashed_password = sha1.digest('hex');
    // Insert user
    db.collection('users').insert({full_name: full_name, user_name: user_name, password: hashed_password}, callback);
  }

  return User;
}