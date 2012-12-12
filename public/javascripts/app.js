var api = new API();
var application_state = {
  session_id: null;
}

api.on("init", function(data) {
  application_state.session_id = data.session_id;
});

api.on("game_move", function(data) {
});

api.on("game_over", function(data) {
});
