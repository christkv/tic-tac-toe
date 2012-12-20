var emit_message = require("./shared").emit_message
  , is_authenticated = require("./shared").is_authenticated
  , locate_connection_with_session = require("./shared").locate_connection_with_session
  , emit_error = require("./shared").emit_error;

var user = require('../models/user')
  , gamer = require('../models/gamer')
  , game = require('../models/game');

/**
 * Locate all the available gamers by their session ids. We do this by introspecting
 * all available connections for SocketIO. However note that if we wanted to use
 * the cluster functionality in Node.JS we would probably have to rewrite this as
 * a lot of the users might be living in different processes and by default SocketIO
 * is only single process aware.
 */
var find_all_available_gamers = function(io, socket, session_store, db) {
  // Easier to keep track of where we emitting messages
  var calling_method_name = "find_all_available_gamers";

  // Function we return that accepts the data from SocketIO
  return function(data) {
    // Ensure the user is logged on and emit an error to the calling function if it's not the case
    if(!is_authenticated(socket, session_store)) return emit_error(calling_method_name, "User not authenticated", socket);
    
    // Locate all active socket connections
    var clients = io.sockets.clients();
    var sids = [];

    // Find all the users session ids excluding the calling functions
    // this makes up all current active gamers
    for(var i = 0; i < clients.length; i++) {
      if(clients[i].handshake.sessionID != socket.handshake.sessionID) {
        sids.push(clients[i].handshake.sessionID);
      }
    }

    // Locate all the gamers by their session ids
    gamer(db).findAllGamersBySids(sids, function(err, gamers) {
      // If there is an error during the query return it to the calling function
      if(err) return emit_error(calling_method_name, err.message, socket);    

      // Update All the gamers last active time
      gamer(db).updateGamersUpdatedDateBySids(sids, function(err, result) {
        // If there is an error during the update return it to the calling function
        if(err) return emit_error(calling_method_name, err.message, socket);    

        // Emit the list of gamers to the calling function on the client
        emit_message(calling_method_name, {
            ok: true
          , result: gamers
        }, socket);    
      });
    });    
  } 
}

/**
 * Invite a gamer to play a game
 */
var invite_gamer = function(io, socket, session_store, db) {
  // Easier to keep track of where we emitting messages
  var calling_method_name = "invite_gamer";
  var event_name          = "game_invite";

  // Function we return that accepts the data from SocketIO
  return function(data) {
    // Ensure the user is logged on and emit an error to the calling function if it's not the case
    if(!is_authenticated(socket, session_store)) return emit_error(calling_method_name, "User not authenticated", socket);

    // Locate the destination connection
    var connection = locate_connection_with_session(io, data.sid);

    // If there is no connection it means the other player went away, send an error message
    // to the calling function on the client
    if(connection == null) return emit_error(calling_method_name, "Invited user is no longer available", socket);

    // Grab our session id
    var our_sid = socket.handshake.sessionID;

    // Locate our gamer object using our session id
    gamer(db).findGamerBySid(our_sid, function(err, gamer_doc) {
      // If there is an error during the query return it to the calling function
      if(err) return emit_error(calling_method_name, err.message, socket);    
      
      // Invite the other player to play a game with the
      // calling player, we send the calling players session id and his gamer information
      emit_message(event_name, {
          ok: true
        , result: {
            sid: our_sid
          , gamer: gamer_doc          
        }
      }, connection);    
    });
  }
}

/**
 * Handles the users decision to decline an invitation to a game
 */
var decline_game = function(io, socket, session_store, db) {
  // Easier to keep track of where we emitting messages
  var calling_method_name = "decline_game";
  var event_name          = "invite_gamer";

  // Function we return that accepts the data from SocketIO
  return function(data) {
    // Ensure the user is logged on and emit an error to the calling function if it's not the case
    if(!is_authenticated(socket, session_store)) return emit_error(calling_method_name, "User not authenticated", socket);

    // Grab our session id
    var our_sid = socket.handshake.sessionID;
    // Locate the destination connection
    var connection = locate_connection_with_session(io, data.sid);

    // If there is no connection it means the other player went away, send an error message
    // to the calling function on the client
    if(connection == null) return emit_error(calling_method_name, "User is no longer available", socket);

    // Send an error to the player who sent the invite, outlining the decline of the offer
    // to play a game
    emit_error(invite_gamer, "User declined game", connection);
  }
}

/**
 * Handles the users decision to accept an invitation to play a game
 */
var accept_game = function(io, socket, session_store, db) {
  // Easier to keep track of where we emitting messages
  var calling_method_name = "accept_game";
  var event_name          = "invite_gamer";

  // Function we return that accepts the data from SocketIO
  return function(data) {
    // Ensure the user is logged on and emit an error to the calling function if it's not the case
    if(!is_authenticated(socket, session_store)) return emit_error(calling_method_name, "User not authenticated", socket);
    // Our session id
    var our_sid = socket.handshake.sessionID;
    // Locate the destination connection
    var connection = locate_connection_with_session(io, data.sid);

    // If there is no connection it means the other player went away, send an error message
    // to the calling function on the client
    if(connection == null) return emit_error(calling_method_name, "User is no longer available", socket);    

    // Locate both the calling player and the destination player by their session ids
    gamer(db).findAllGamersBySids([our_sid, data.sid], function(err, players) {
      // If we have an error notify both the inviter and the invited player about an error
      if(err || players.length != 2) {
        emit_error(event_name, "Failed to locate players for game acceptance", connection);
        return emit_error(calling_method_name, "Failed to locate players for game acceptance", socket);
      }

      // Grab player 1 and player 2 from the results
      var p1 = players[0];
      var p2 = players[1];
      
      // Create a new game with player 1 and player 2
      game(db).create_game(p1.sid, p1.user_name, p1.full_name, p2.sid, p2.user_name, p2.full_name, function(err, game_doc) {
        // If we have an error notify both the inviter and the invited player about an error
        if(err) {
          emit_error(event_name, "Failed to create a new game", connection);
          return emit_error(calling_method_name, "Failed to create a new game", socket);
        }

        // We have a new game, notify both players about the new game information
        emit_message(event_name, { ok: true, result: game_doc }, connection);
        emit_message(calling_method_name, { ok: true, result: game_doc }, socket);
      });
    });
  }
}

/**
 * Handles the users decision to accept an invitation to play a game
 */
var place_marker = function(io, socket, session_store, db) {
  // Easier to keep track of where we emitting messages
  var calling_method_name      = "place_marker";
  var event_name_move          = "game_move";
  var event_name_game_over     = "game_over";

  // Function we return that accepts the data from SocketIO
  return function(data) {
    // Ensure the user is logged on and emit an error to the calling function if it's not the case
    if(!is_authenticated(socket, session_store)) return emit_error(calling_method_name, "User not authenticated", socket);
    // Grab our session id
    var our_sid = socket.handshake.sessionID;

    // Locate the game we want to place a marker on
    game(db).find_game(data.game_id, function(err, game_doc) {
      // If there is an error during the query return it to the calling function
      if(err) return emit_error(calling_method_name, "Could not find the game", socket);

      // Let's get the current board in play
      var board = game_doc.board;
      // Get the marker for the calling player (if we are the starting player we are X)
      var marker = game_doc.starting_player == our_sid ? "x" : "o";
      
      // Locate other players session id
      var other_player_sid = game_doc.player1_sid == our_sid ? game_doc.player2_sid : game_doc.player1_sid;

      // If we are trying to set a cell that's already set emit an error to the calling function
      if(board[data.y][data.x] == "x" || board[data.y][data.x] == "o") 
        return emit_error(calling_method_name, "Cell already selected", socket);;

      // Mark the cell with our marker
      board[data.y][data.x] = marker;

      // Attempt to update the board
      game(db).update_board(our_sid, data.game_id, other_player_sid, board, function(err, result) {
        // If we have an error it was not our turn
        if(err) return emit_error(calling_method_name, "Not your turn", socket);

        // Locate the destination connection
        var connection = locate_connection_with_session(io, other_player_sid);
  
        // If there is no connection it means the other player went away, send an error message
        // to the calling function on the client
        if(connection == null) return emit_error(calling_method_name, "User is no longer available", socket);

        // Emit valid move message to caller and the other player
        // this notifies the clients that they can draw the marker on the board
        emit_message(calling_method_name, { ok: true
          , result: {y: data.y, x:data.x, marker: marker} }
          , socket);        
        emit_message(event_name_move, { ok: true
          , result: {y: data.y, x:data.x, marker: marker} }
          , connection);

        // If there was no winner this turn
        if(is_game_over(board, data.y, data.x, marker) == false) {
          // If there are still fields left on the board, let's keep playing
          if(!is_game_draw(board)) return;
          
          // If there are no open spots left on the board the game
          // is a draw
          emit_message(event_name_game_over, { ok: true, result: {draw:true} }, socket);        
          return emit_message(event_name_game_over, { ok: true, result: {draw:true} }, connection);          
        }

        // There was a winner and it was the last user to place a marker (the calling client)
        // signal both players who won the game
        emit_message(event_name_game_over, { ok: true, result: {winner: our_sid} }, socket);        
        emit_message(event_name_game_over, { ok: true, result: {winner: our_sid} }, connection);
      })
    });
  }
}

/**
 * Checks if all the spaces in the board have been used
 */
var is_game_draw = function(board) {
  for(var i = 0; i < board.length; i++) {
    for(var j = 0; j < board[i].length; j++) {
      if(board[i][j] == 0) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Checks from a given marker position if it's a winner
 * on the horizontal, vertical or diagonal
 *
 * [0, 0, 0] [0, 1, 0] [1, 0, 0] [0, 0, 1]
 * [1, 1, 1] [0, 1, 0] [0, 1, 0] [0, 1, 0]
 * [0, 0, 0] [0, 1, 0] [0, 0, 1] [1, 0, 0]
 */
var is_game_over = function(board, y, x, marker) {
  // Check the x and y for the following ranges
  var found_vertical = true;
  var found_horizontal = true;
  var found_diagonal = true;

  // y and x = 0 to x = n
  for(var i = 0; i < board[0].length; i++) {
    if(board[y][i] != marker) {
      found_horizontal = false;
      break;
    }
  }
  // Found a winning position
  if(found_horizontal) return true;

  // x and y = 0 to y = n
  for(var i = 0; i < board.length; i++) {
    if(board[i][x] != marker) {
      found_vertical = false;
      break;
    }
  }

  // Found a winning position
  if(found_vertical) return true;

  // 0, 0 to n, n along the diagonal
  for(var i = 0, j = 0; i < board[0].length; i++) {
    if(board[j++][i] != marker) {
      found_diagonal = false;
      break;
    }
  }

  // Found a winning position
  if(found_diagonal) return true;
  // Reset found diagonal
  found_diagonal = true;

  // n, 0 to 0, n along the diagonal
  for(var i = board[0].length - 1, j = 0; i > 0 ; i--) {
    if(board[j++][i] != marker) {
      found_diagonal = false;
      break;
    }
  }

  // Return result of looking in the diagonal
  return found_diagonal;
}

// Export functions
exports.find_all_available_gamers = find_all_available_gamers;
exports.invite_gamer              = invite_gamer;
exports.accept_game               = accept_game;
exports.decline_game              = decline_game;
exports.place_marker              = place_marker;
exports.is_game_over              = is_game_over;
