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
});
// Wait for template to be loaded
template_handler.start(function(err) {
  // Set the current template on the view container
  template_handler.setTemplate("#view", "main", {});
  // Wire up the buttons for the main view
  $('#register_button').click(register_button_handler(application_state, api, template_handler));
  $('#login_button').click(login_button_handler(application_state, api, template_handler));
})

api.on("init", function(data) {
  application_state.session_id = data.session_id;
});

api.on("game_move", function(data) {
});

api.on("game_over", function(data) {
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
        template_handler.setTemplate("#view", "dashboard", {games:gamers});
      });
    })
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
