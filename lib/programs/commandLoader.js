const fs = require('fs');
const path = require('path');

module.exports = (client) => {
  const commands = [];
  const baseCommandPath = path.join(__dirname, '../commands'); // Path for regular commands
  const devCommandPath = path.join(__dirname, '../commands-dev'); // Path for admin-only commands

  // Load regular commands
  const commandFiles = fs.readdirSync(baseCommandPath).filter(file => file.endsWith('.js'));

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

  // Load admin-only commands and add them as subcommands to the `/admin` command
  const adminCommandData = new (require('@discordjs/builders').SlashCommandBuilder)()
    .setName('admin')
    .setDescription('Admin-only commands')
    .setDefaultMemberPermissions(Permissions.FLAGS.ADMINISTRATOR) // New way to set permissions
    .setDMPermission(false); // Disable DM usage

  if (fs.existsSync(devCommandPath)) {
    const devCommandFiles = fs.readdirSync(devCommandPath).filter(file => file.endsWith('.js'));

    for (const file of devCommandFiles) {
      try {
        const command = require(`../commands-dev/${file}`); // Adjust the path to require dev command files
        
        // Log the command being loaded
        console.log(`Loading admin command: ${file}`);

        if (command.data && typeof command.data.toJSON === 'function') {
          adminCommandData.addSubcommand(subcommand =>
            subcommand
              .setName(command.data.name)
              .setDescription(command.data.description)
          );
          client.commands.set(command.data.name, { ...command, adminOnly: true }); // Store command for execution
        } else {
          console.warn(`Admin command ${file} is missing a valid data property. It will not be available for use.`);
        }
      } catch (error) {
        console.error(`Error loading admin command ${file}:`, error);
      }
    }
  }

  commands.push(adminCommandData.toJSON()); // Add the admin command with its subcommands
  return commands; // Return all valid commands
};
