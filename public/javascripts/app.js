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

api.on("init", function(data) {
  application_state.session_id = data.session_id;
});

api.on("game_move", function(err, data) {
});

api.on("game_over", function(err, data) {
});

api.on("game_invite", function(err, data) {
  if(data == null) return;  
  // Save the invitation in our application state
  application_state.invite = data;
  // Open the invite box
  game_invite_box_show(data);
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
        api.invite_gamer(gamer, function(err, status) {
          console.log(err)
          if(err) return decline_box_show(template_handler, gamer);
        })        
      }
    }
  }
}

var invite_accept_button_handler = function(application_state, api, template_handler) {
  return function() {
    console.log("=== invite_accept_button_handler")    
    // Accept the game invite
    api.accept_game(application_state.invite, function(err, result) {

    });
  }
}

var invite_decline_button_handler = function(application_state, api, template_handler) {
  return function() {
    console.log("=== invite_decline_button_handler")
    // Decline the game invite
    api.decline_game(application_state.invite, function(err, result) {

    });
  }
}

/*********************************************************************************************
 * Helper methods
 ********************************************************************************************/
var error_box_show = function(error) {
  // Set fields for the error
  $('#status_box_header').html("Registration Error");
  $('#status_box_body').html(error);
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
