tic-tac-toe
===========

Welcome to a Tic-Tac-Toe tutorial implementation that showcases the usage of Express, SocketIO and MongoDB to write a multiplayer game. The architecture of the game uses the SocketIO channel to call remote functions and is completely message driven.

Client side
-----------
The client side part of the application is made up of the following components

<table>
  <thead>
    <td><strong>File</strong></td>
    <td><strong>Description</strong></td>
  </thead>
  <tbody>
    <tr>
      <td><strong>api.js</strong></td>
      <td>contains all the remote functions and handles the calling of them over SocketIO</td>
    </tr>
    <tr>
      <td><strong>app.js</strong></td>
      <td>contains the application logic itself and mapping of event handlers to HTML elements</td>
    </tr>
    <tr>
      <td><strong>template_handler.js</strong></td>
      <td>contains the template rendering loading and rendering functionality</td>
    </tr>
    <tr>
      <td><strong>templates/main.ms</strong></td>
      <td>the mustache template used for the initial registration / login view</td>
    </tr>
    <tr>
      <td><strong>templates/board.ms</strong></td>
      <td>the mustache template used for the board</td>
    </tr>
    <tr>
      <td><strong>templates/dashboard.ms</strong></td>
      <td>the mustache template used for the dashboard</td>
    </tr>
    <tr>
      <td><strong>templates/decline_game.ms</strong></td>
      <td>the mustache template used for message of declining a game</td>
    </tr>
  </tbody>
</table>

Server side
-----------
The server side logic is made up of the following components

<table>
  <thead>
    <td><strong>File</strong></td>
    <td><strong>Description</strong></td>
  </thead>
  <tbody>
    <tr>
      <td><strong>controllers/main_controller.js</strong></td>
      <td>contains the rendering code for the initial <strong>/</strong> view</td>
    </tr>
    <tr>
      <td><strong>handlers/chat_handler.js</strong></td>
      <td>contains the socketIO event handlers for chat events</td>
    </tr>
    <tr>
      <td><strong>handlers/gamer_handler.js</strong></td>
      <td>contains the socketIO event handlers for the actual game</td>
    </tr>
    <tr>
      <td><strong>handlers/login_handler.js</strong></td>
      <td>contains the socketIO event handlers for the login and registration</td>
    </tr>
    <tr>
      <td><strong>handlers/shared.js</strong></td>
      <td>contains helper methods used when emitting messages back to the client</td>
    </tr>
    <tr>
      <td><strong>models/game.js</strong></td>
      <td>contains all the methods associated with a Game</td>
    </tr>
    <tr>
      <td><strong>models/gamer.js</strong></td>
      <td>contains all the methods associated with a Gamer</td>
    </tr>
    <tr>
      <td><strong>models/user.js</strong></td>
      <td>contains all the methods associated with a User</td>
    </tr>
    <tr>
      <td><strong>views/index.html</strong></td>
      <td>contains the initial view when the user hits <strong>/</strong></td>
    </tr>
    <tr>
      <td><strong>app.js</strong></td>
      <td>the actual starting point for the server</td>
    </tr>
    <tr>
      <td><strong>env.js</strong></td>
      <td>all the configuration for setting up express, SocketIO and MongoDB</td>
    </tr>
  </tbody>
</table>
