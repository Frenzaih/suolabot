const fs = require('fs');
const path = require('path');

module.exports = {
  description: 'Lists all available commands',
  execute(msg) {
    // Path to the commands folder
    const commandsPath = path.join(__dirname);
    
    // Read all command files in the commands folder
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js') && file !== 'apua.js');

    // Initialize an array to hold command descriptions
    let commandList = [];

    // Iterate over each command file
    commandFiles.forEach(file => {
      const command = require(path.join(commandsPath, file)); // Require the command file
      const commandName = file.split('.')[0]; // Get the command name (filename without .js)
      
      // Check if the command has a description
      const commandDescription = command.description || "mä en tiiä yhtään mitä tää komento tekee"; // Default message if no description
      
      // Push the command name and description to the command list
      commandList.push(`**${commandName}**: ${commandDescription}`);
    });

    // Send the list of commands as a message
    msg.channel.send(`**Available Commands:**\n\n${commandList.join('\n')}`).then(sentMessage => {
      // Schedule deletion of both the user's command message and the bot's response after 60 seconds
      setTimeout(() => {
        // Delete the user's command message
        msg.delete().catch(err => console.error('Failed to delete user message:', err));
        
        // Delete the bot's response message
        sentMessage.delete().catch(err => console.error('Failed to delete bot message:', err));
      }, 60000); // 60 seconds
    });
  }
};
