var application_state = {
  session_id: null
}

// Api for game
var api = new API();
// Handles all template switches
var template_handler = new TemplateHandler({
  "main": "/templates/main.ms"
});
// Wait for template to be loaded
template_handler.start(function(err) {
  // Set the current template on the view container
  template_handler.setTemplate("#view", "main", {});
})

api.on("init", function(data) {
  application_state.session_id = data.session_id;
});

api.on("game_move", function(data) {
});

api.on("game_over", function(data) {
});
