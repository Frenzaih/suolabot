const fs = require('fs');
const path = require('path');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionsBitField } = require('discord.js'); 

module.exports = (client) => {
  const commands = [];
  const baseCommandPath = path.join(__dirname, '../commands'); // Path for regular commands
  const devCommandPath = path.join(__dirname, '../commands-dev'); // Path for admin commands

  // Load regular commands
  const commandFiles = fs.readdirSync(baseCommandPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    try {
      const command = require(`../commands/${file}`); // Load command file

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

  // Load admin commands with permissions
  if (fs.existsSync(devCommandPath)) {
    const devCommandFiles = fs.readdirSync(devCommandPath).filter(file => file.endsWith('.js'));

    for (const file of devCommandFiles) {
      try {
        const command = require(`../commands-dev/${file}`); // Load admin command file

        // Log the command being loaded
        console.log(`Loading admin command: ${file}`);

        if (command.data && typeof command.data.toJSON === 'function') {
          // Set the command to be usable only to admins
          const commandData = command.data
            .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator); // Allow only administrators

          commands.push(commandData.toJSON());
          client.commands.set(command.data.name, command); // Store command for execution
        } else {
          console.warn(`Admin command ${file} is missing a valid data property. It will not be available for use.`);
        }
      } catch (error) {
        console.error(`Error loading admin command ${file}:`, error);
      }
    }
  }

  return commands; // Return all valid commands
};
