<div class="span6">
  <h2>All Active Users</h2>
  <p>All users currently on the system, invite them to play a game.</p>
  <table class="table table-striped">
    <thead>
      <th>Player</th>
      <th></th>
    </thead>
    <tbody>
      {{#gamers}}
      <tr>
        <td width="100%">{{user_name}}</td>
        <td><a href="#" id="gamer_{{_id}}">Play</a></td>
      </tr>
      {{/gamers}}
    </tbody>
  </table>
</div>
<div class="span6">
  <h2>Log in</h2>
  <form class="form-horizontal">
    <div class="control-group">
      <label class="control-label" for="inputUserNameLogin">User Name</label>
      <div class="controls">
        <input type="text" id="inputUserNameLogin" placeholder="User Name">
      </div>
    </div>
    <div class="control-group">
      <label class="control-label" for="inputPasswordLogin">Password</label>
      <div class="controls">
        <input type="password" id="inputPasswordLogin" placeholder="Password">
      </div>
    </div>
    <div class="control-group">
      <div class="controls">
        <button type="button" class="btn" id="login_button">Register</button>
      </div>
    </div>
  </form>
</div>