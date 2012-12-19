var application_state = {
  session_id: null
}

// Api for game
var api = new API();
// Handles all template switches
var template_handler = new TemplateHandler({
    "main": "/templates/main.ms"
  , "dashboard": "/templates/dashboard.ms"
  , "board": "/templates/board.ms"
  , "decline_game": "/templates/decline_game.ms"
});

// Wait for template to be loaded
template_handler.start(function(err) {
  // Set the current template on the view container
  template_handler.setTemplate("#view", "main", {});
  // Wire up the buttons for the main view
  $('#register_button').click(register_button_handler(application_state, api, template_handler));
  $('#login_button').click(login_button_handler(application_state, api, template_handler));
  // Wire up invite acceptance function
  $('#invite_box_accept').click(invite_accept_button_handler(application_state, api, template_handler));
  $('#invite_box_decline').click(invite_decline_button_handler(application_state, api, template_handler));
})

api.on("init", function(err, data) {
  application_state.session_id = data.session_id;
});

api.on('game_move', function(err, data) {
  console.log("========= game_move")
  console.log(data)

  if(err) return;
  // Get the move data
  var marker = data.result.marker;
  var y = data.result.y;
  var x = data.result.x;
  // Select the right box and mark it
  var cell_id_image = "#row" + y + "cell" + x + " img";
  // It was our turn, let's show the mark we set down
  if(marker == 'x') {
    $(cell_id_image).attr("src", "/img/cross.png");
  } else {
    $(cell_id_image).attr("src", "/img/circle.png");
  }
});

api.on('game_over', function(err, data) {
  if(data.result.winner == application_state.session_id) {
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

api.on('game_invite', function(err, data) {
  if(data == null) return;  
  // Save the invitation in our application state
  application_state.invite = data;
  // Open the invite box
  game_invite_box_show(data);
});

api.on('chat_message', function(err, data) {
  if(err) return;
  // Get the message
  var message = data.result.message;
  // Get the chat window  
  var chat_window = $('#chat');
  // Push the current message to the bottom
  chat_window.append('<p class="chat_msg_other">' + get_date_time_string() + '&#62; ' + message + '</p>');
});

/*********************************************************************************************
 * Handlers
 ********************************************************************************************/
var register_button_handler = function(application_state, api, template_handler) {
  return function() {    
    // Lets get the values
    var full_name = $('#inputFullNameRegister').val();
    var user_name = $('#inputUserNameRegister').val();
    var password = $('#inputPasswordRegister').val();

    // Let's call the api with all the data
    api.register(full_name, user_name, password, function(err, data) {
      if(err) return error_box_show(err.error);
      // Let's load the first 100 public available games
      api.find_all_available_gamers(function(err, gamers) {
        if(err) return error_box_show(err.error);
        // // Save the list of games in our game state
        application_state.gamers = gamers;
        // Let's go to the dashboard of the game
        template_handler.setTemplate("#view", "dashboard", {gamers:gamers});
      });
    });
  }
}

var login_button_handler = function(application_state, api, template_handler) {
  return function() {
    // Lets get the values
    var user_name = $('#inputUserNameLogin').val();
    var password = $('#inputPasswordLogin').val();

    // Let's call the api with all the data
    api.login(user_name, password, function(err, data) {
      if(err) return error_box_show(err.error);

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
    })
  }
}

var invite_gamer_button_handler = function(application_state, api, template_handler) {
  return function(element) {
    var gamer_id = element.currentTarget.id;
    // Get the id
    var id = gamer_id.split(/\_/)[1];
    // Locate the gamer object
    for(var i = 0; i < application_state.gamers.length; i++) {
      if(application_state.gamers[i]._id == id) {
        var gamer = application_state.gamers[i];
        // Lets fire off an invitation to the user
        api.invite_gamer(gamer, function(err, game) {
          if(err) return decline_box_show(template_handler, gamer);
          setupBoardGame(application_state, api, template_handler, game);
        })        
      }
    }
  }
}

var invite_accept_button_handler = function(application_state, api, template_handler) {
  return function() {
    console.log("=== invite_accept_button_handler")    
    // Accept the game invite
    api.accept_game(application_state.invite, function(err, game) {
      if(err) return error_box_show(err.error);
      // Setup the game
      setupBoardGame(application_state, api, template_handler, game);
    });
  }
}

var invite_decline_button_handler = function(application_state, api, template_handler) {
  return function() {
    console.log("=== invite_decline_button_handler")
    // Decline the game invite
    api.decline_game(application_state.invite, function(err, result) {
      if(err) return error_box_show(err.error);
    });
  }
}

/*********************************************************************************************
 * Setup methods
 ********************************************************************************************/
var setupBoardGame = function(application_state, api, template_handler, game) {
  // Save current game to state
  application_state.game = game;
  // Let's render the board game with the chat window
  template_handler.setTemplate("#view", "board", {});
  // Set the marker for our player (X if we are the starting player)
  application_state.marker = application_state.session_id == game.current_player ? "x" : "o";
  // Just print the state
  console.log(application_state)

  // Get all the rows
  var rows = $('#board div');

  // Map up our event handlers
  for(var i = 0; i < rows.length; i++) {
    var cells = $('#' + rows[i].id + " span");

    // For each cell map it
    for(var j = 0; j < cells.length; j++) {
      $("#" + cells[j].id).click(game_board_cell_handler(application_state, api, template_handler, game));
    }
  }

  // Map up the chat handler
  $('#chat_message').keypress(chat_handler(application_state, api, template_handler, game));
}

var chat_handler = function(application_state, api, template_handler, game) {
  return function(e) {    
    if(e.which == 13) {
      var chat_input = $('#chat_message');
      var chat_window = $('#chat');
      // Fetch the message the user entered
      var message = chat_input.val();
      if(application_state.game == null) return;
      // Send it off to the other gamer
      api.send_message(application_state.game._id, message, function(err, data) {
        if(err) return error_box_show(err.error);
        // Push the current message to the bottom
        chat_window.append('<p class="chat_msg_current">' + get_date_time_string() + '&#62; ' + message + "</p>");
        // Clear out the messages
        chat_input.val('');
      });
    }
  }  
}

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
var get_date_time_string = function() {
  var date = new Date();
  var string = date.getHours() < 10 ? "0" + date.getHours() : date.getHours();
  string += ":" + (date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes());
  string += ":" + (date.getSeconds() < 10 ? "0" + date.getSeconds() : date.getSeconds());
  return string;
}


var error_box_show = function(error) {
  // Set fields for the error
  $('#status_box_header').html("Registration Error");
  $('#status_box_body').html(error);
  // Show the modal box
  $('#status_box').modal({backdrop:true, show:true})    
}

var general_box_show = function(title, body) {
  // Set fields for the error
  $('#status_box_header').html(title);
  $('#status_box_body').html(body);
  // Show the modal box
  $('#status_box').modal({backdrop:true, show:true})    
}

var decline_box_show = function(template_handler, gamer) {
  // Set fields for the error
  $('#status_box_header').html("Invitation to game was declined");
  $('#status_box_body').html(template_handler.render("decline_game", gamer));
  // Show the modal box
  $('#status_box').modal({backdrop:true, show:true})    
}

var game_invite_box_show = function(gamer) {
  // Set fields for the error
  $('#invite_box_header').html("You have been invited to a game");
  $('#invite_box_body').html("BODY");
  // Show the modal box
  $('#invite_box').modal({backdrop:true, show:true})  
  // Add the handlers

}
