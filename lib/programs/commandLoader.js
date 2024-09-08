const fs = require('fs');
const path = require('path');

module.exports = (client) => {
  const commandFiles = fs.readdirSync(path.join(__dirname, '../commands')).filter(file => file.endsWith('.js'));
  const commands = [];

  for (const file of commandFiles) {
    try {
      const command = require(`../commands/${file}`); // Adjust the path to require command files
      
      // Log the command being loaded
      console.log(`Loading command: ${file}`);

      if (command.data && typeof command.data.toJSON === 'function') {
        commands.push(command.data.toJSON());
        client.commands.set(command.data.name, command); // Store command for execution
      } else {
        console.warn(`Command ${file} is missing a valid data property. It will not be available for use.`);
      }
    } catch (error) {
      console.error(`Error loading command ${file}:`, error);
    }
  }

  return commands; // Return only valid commands
};
