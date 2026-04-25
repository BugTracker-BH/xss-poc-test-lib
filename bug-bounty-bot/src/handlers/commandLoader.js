const fs = require('fs');
const path = require('path');

function loadCommands(client) {
  const commandsDir = path.join(__dirname, '..', 'commands');
  const files = fs.readdirSync(commandsDir).filter(f => f.endsWith('.js'));

  for (const file of files) {
    const command = require(path.join(commandsDir, file));
    if (command.data && command.execute) {
      client.commands.set(command.data.name, command);
      console.log(`📦 Loaded command: /${command.data.name}`);
    }
  }
}

module.exports = { loadCommands };
