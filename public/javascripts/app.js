// Contains the application state
var application_state = {
  session_id: null
}

// Create an instance of the API class
var api = new API();

// Create a template handler with all the templates
// used in the application
var template_handler = new TemplateHandler({
    "main": "/templates/main.ms"
  , "dashboard": "/templates/dashboard.ms"
  , "board": "/templates/board.ms"
  , "decline_game": "/templates/decline_game.ms"
});

// Load all the templates and once it's done
// register up all the initial button handlers
template_handler.start(function(err) {

  // Render the main view in the #view div
  template_handler.setTemplate("#view", "main", {});

  // Wire up the buttons for the main view
  $('#register_button').click(register_button_handler(application_state, api, template_handler));
  $('#login_button').click(login_button_handler(application_state, api, template_handler));

  // Wire up invite box buttons (this is in the main view)
  $('#invite_box_accept').click(invite_accept_button_handler(application_state, api, template_handler));
  $('#invite_box_decline').click(invite_decline_button_handler(application_state, api, template_handler));
})

/*********************************************************************************************
 * Application events we listen to
 ********************************************************************************************/
/**
 * The init event, the server has set up everything an assigned us
 * a session id that we can use in the application
 */
api.on("init", function(err, data) {
  application_state.session_id = data;
});

/**
 * The opponent made a valid move, render the move on the board
 */
api.on('game_move', function(err, data) {
  if(err) return;
  // Get the move data
  var marker = data.marker;
  var y = data.y;
  var x = data.x;
  // Select the right box and mark it
  var cell_id_image = "#row" + y + "cell" + x + " img";
  // It was our turn, let's show the mark we set down
  if(marker == 'x') {
    $(cell_id_image).attr("src", "/img/cross.png");
  } else {
    $(cell_id_image).attr("src", "/img/circle.png");
  }
});

/**
 * The game was won, display victory / defeat / draw dialog
 */
api.on('game_over', function(err, data) {
  if(data.draw === true) {
    general_box_show("It was a draw", "<p>Your equally good, it's a draw</p>");
  } else if(data.winner == application_state.session_id) {
    general_box_show("Congratulations", "<p>You won</p>");
  } else {
    general_box_show("You lost", "<p>You got beaten buddy</p>");
  }

  // Let's load the first 100 public available games
  api.find_all_available_gamers(function(err, gamers) {
    if(err) return error_box_show(err.error);

    // Save the list of games in our game state
    application_state.gamers = gamers;
    // Let's go to the dashboard of the game
    template_handler.setTemplate("#view", "dashboard", {gamers:gamers});
    // Add handlers to the event
    for(var i = 0; i < gamers.length; i++) {
      $("#gamer_" + gamers[i]._id).click(invite_gamer_button_handler(application_state, api, template_handler));
    }
  });
});

/**
 * The user was invited to play a game, show the invitation acceptance / decline box
 */
api.on('game_invite', function(err, data) {
  if(data == null) return;  
  // Save the invitation in our application state
  application_state.invite = data;
  // Open the invite box
  game_invite_box_show(data.gamer);
});

/**
 * The other player sent a message, render the message in the chat box
 */
api.on('chat_message', function(err, data) {
  if(err) return;
  // Get the message
  var message = data.message;
  // Get the chat window  
  var chat_window = $('#chat');
  // Push the current message to the bottom
  chat_window.append('<p class="chat_msg_other">' + get_date_time_string() + '&#62; ' + message + '</p>');
});

/**
 * A new gamer logged on, display the new user in the list of available gamers
 * to play
 */
api.on('gamer_joined', function(err, data) {
  if(err) return;
  // Get the gamer
  var gamer = data;
  // Check if we have the gamer already
  if(application_state.gamers == null) return;
  // Check if the gamer already exists and if it does 
  var found = false;

  // replace it with the new reference
  for(var i = 0; i < application_state.gamers.length; i++) {
    var _gamer = application_state.gamers[i];

    if(_gamer.user_name == gamer.user_name) {
      found = true;
      // Update the sid and update on
      _gamer.sid = gamer.sid;
      _gamer.updated_on = gamer.updated_on;      
      break;
    }
  }

  // If not found let's add it to the list
  if(!found) application_state.gamers.push(gamer);
  // If we currently have the dashboard
  if(template_handler.isTemplate("dashboard")) {
    var gamers = application_state.gamers;
    // Let's go to the dashboard of the game
    template_handler.setTemplate("#view", "dashboard", {gamers:gamers});    
    // Add handlers to the event
    for(var i = 0; i < gamers.length; i++) {
      $("#gamer_" + gamers[i]._id).click(invite_gamer_button_handler(application_state, api, template_handler));
    }
  }
});

/*********************************************************************************************
 * Handlers
 ********************************************************************************************/
/**
 * Handles the attempt to register a new user
 */
var register_button_handler = function(application_state, api, template_handler) {
  return function() {    
    // Lets get the values for the registration
    var full_name = $('#inputFullNameRegister').val();
    var user_name = $('#inputUserNameRegister').val();
    var password = $('#inputPasswordRegister').val();

    // Attempt to register a new user
    api.register(full_name, user_name, password, function(err, data) {
      // If we have an error show the error message to the user
      if(err) return error_box_show(err.error);

      // Load all the available gamers
      api.find_all_available_gamers(function(err, gamers) {
        // If we have an error show the error message to the user        
        if(err) return error_box_show(err.error);

        // Save the list of games in our game state
        application_state.gamers = gamers;
 
        // Show the main dashboard view and render with all the available players
        template_handler.setTemplate("#view", "dashboard", {gamers:gamers});
        
        // Add handlers for each new player so we can play them
        for(var i = 0; i < gamers.length; i++) {
          $("#gamer_" + gamers[i]._id).click(invite_gamer_button_handler(application_state, api, template_handler));
        }
      });
    });
  }
}

/**
 * Handles the attempt to login
 */
var login_button_handler = function(application_state, api, template_handler) {
  return function() {
    // Lets get the values for the login
    var user_name = $('#inputUserNameLogin').val();
    var password = $('#inputPasswordLogin').val();

    // Attempt to login the user
    api.login(user_name, password, function(err, data) {
      // If we have an error show the error message to the user
      if(err) return error_box_show(err.error);

      // Load all the available gamers
      api.find_all_available_gamers(function(err, gamers) {
        // If we have an error show the error message to the user        
        if(err) return error_box_show(err.error);

        // Save the list of games in our game state
        application_state.gamers = gamers;

        // Show the main dashboard view and render with all the available players
        template_handler.setTemplate("#view", "dashboard", {gamers:gamers});

        // Add handlers for each new player so we can play them
        for(var i = 0; i < gamers.length; i++) {
          $("#gamer_" + gamers[i]._id).click(invite_gamer_button_handler(application_state, api, template_handler));
        }
      });
    })
  }
}

/**
 * Send an invitation to a player to pay a game
 */
var invite_gamer_button_handler = function(application_state, api, template_handler) {
  return function(element) {
    var gamer_id = element.currentTarget.id;
    // Get the id
    var id = gamer_id.split(/\_/)[1];
    
    // Locate the gamer object
    for(var i = 0; i < application_state.gamers.length; i++) {
      if(application_state.gamers[i]._id == id) {
        var gamer = application_state.gamers[i];
    
        // Attempt to invite the gamer to play
        api.invite_gamer(gamer, function(err, game) {          
          // If we have an error show the declined game to the user
          if(err) return decline_box_show(template_handler, gamer);
          
          // Set up the board for a game
          setupBoardGame(application_state, api, template_handler, game);
        })        
      }
    }
  }
}

/**
 * Accept an invitation to play a game
 */
var invite_accept_button_handler = function(application_state, api, template_handler) {
  return function() {
    // Accept the game invite
    api.accept_game(application_state.invite, function(err, game) {
      // If we have an error show the error message to the user        
      if(err) return error_box_show(err.error);

      // Set up the board for a game
      setupBoardGame(application_state, api, template_handler, game);
    });
  }
}

/**
 * Accept an invitation to play a game
 */
var invite_decline_button_handler = function(application_state, api, template_handler) {
  return function() {
    // Decline the game invite
    api.decline_game(application_state.invite, function(err, result) {
      // If we have an error show the error message to the user        
      if(err) return error_box_show(err.error);
      // No need to do anything as we declined the game and we are still showing the dashboard
    });
  }
}

/*********************************************************************************************
 * Setup methods
 ********************************************************************************************/
/**
 * Set up a new game board and add handlers to all the cells of the board
 */ 
var setupBoardGame = function(application_state, api, template_handler, game) {
  // Save current game to state
  application_state.game = game;
  // Let's render the board game with the chat window
  template_handler.setTemplate("#view", "board", {});
  // Set the marker for our player (X if we are the starting player)
  application_state.marker = application_state.session_id == game.current_player ? "x" : "o";
  // Get all the rows
  var rows = $('#board div');

  // Add an event handler to each cell
  for(var i = 0; i < rows.length; i++) {
    var cells = $('#' + rows[i].id + " span");

    // For each cell create and add the handler
    for(var j = 0; j < cells.length; j++) {
      $("#" + cells[j].id).click(game_board_cell_handler(application_state, api, template_handler, game));
    }
  }

  // Map up the chat handler
  $('#chat_message').keypress(chat_handler(application_state, api, template_handler, game));
}

/**
 * Handle chat messages from the user, (activates on the return key)
 */ 
var chat_handler = function(application_state, api, template_handler, game) {
  return function(e) {    
    if(e.which == 13) {
      var chat_input = $('#chat_message');
      var chat_window = $('#chat');
      // Fetch the message the user entered
      var message = chat_input.val();
      if(application_state.game == null) return;
      
      // Send the message to the other player
      api.send_message(application_state.game._id, message, function(err, data) {
        // If we have an error show the error message to the user        
        if(err) return error_box_show(err.error);
  
        // Push the current message to the bottom
        chat_window.append('<p class="chat_msg_current">' + get_date_time_string() + '&#62; ' + message + "</p>");
        // Clear out the messages
        chat_input.val('');
      });
    }
  }  
}

/**
 * Create a cell click handler that will send the events to the server when the user clicks
 * on an event, and also show the result
 */ 
var game_board_cell_handler = function(application_state, api, template_handler, game) {
  return function() {
    // Split up the id to get the cell position
    var row_number = parseInt(this.id.split("cell")[0].split("row")[1], 10);
    var cell_number = parseInt(this.id.split("cell")[1], 10);
    var cell_id = this.id;
    var cell_id_image = "#" + cell_id + " img";

    // Let's attempt to do a move
    api.place_marker(application_state.game._id, cell_number, row_number, function(err, data) {
      if(err) return error_box_show(err.error);

      // If we won
      if(data.winner != null && data.winner == application_state.session_id) {
        general_box_show("Congratulations", "<p>You won</p>");
      } else if(data.winner != null) {
        general_box_show("You lost", "<p>You got beaten buddy</p>");    
      } 

      if(data.marker == 'x') {
        $(cell_id_image).attr("src", "/img/cross.png");
      } else {
        $(cell_id_image).attr("src", "/img/circle.png");
      }
    });
  }
}

/*********************************************************************************************
 * Helper methods
 ********************************************************************************************/

/**
 * Get a date time string
 */ 
var get_date_time_string = function() {
  var date = new Date();
  var string = date.getHours() < 10 ? "0" + date.getHours() : date.getHours();
  string += ":" + (date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes());
  string += ":" + (date.getSeconds() < 10 ? "0" + date.getSeconds() : date.getSeconds());
  return string;
}

/**
 * Show an error message box
 */ 
var error_box_show = function(error) {
  // Set fields for the error
  $('#status_box_header').html("Registration Error");
  $('#status_box_body').html(error);
  // Show the modal box
  $('#status_box').modal({backdrop:true, show:true})    
}

/**
 * General message box with configurable title and body content
 */ 
var general_box_show = function(title, body) {
  // Set fields for the error
  $('#status_box_header').html(title);
  $('#status_box_body').html(body);
  // Show the modal box
  $('#status_box').modal({backdrop:true, show:true})    
}

/**
 * Show a game decline message box
 */ 
var decline_box_show = function(template_handler, gamer) {
  // Set fields for the error
  $('#status_box_header').html("Invitation to game was declined");
  $('#status_box_body').html(template_handler.render("decline_game", gamer));
  // Show the modal box
  $('#status_box').modal({backdrop:true, show:true})    
}

/**
 * Show a game invite message box
 */ 
var game_invite_box_show = function(gamer) {
  // Set fields for the error
  $('#invite_box_header').html("You have been invited to a game");
  $('#invite_box_body').html("The user <strong>" + gamer.user_name + "</strong> has challenged you to a game");
  // Show the modal box
  $('#invite_box').modal({backdrop:true, show:true})  
  // Add the handlers

}
