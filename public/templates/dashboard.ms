<div class="span8">
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
<div class="span4">
  <h2>The Dashboard</h2>
  <p>
    The list on the left side shows all the active players (connected via socket.io) and lets you challenge one of them to a game. Click on the play link to give it a go.
  </p>
</div>