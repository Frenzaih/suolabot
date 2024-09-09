const { SlashCommandBuilder } = require('@discordjs/builders');
const { Permissions } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Admin-only commands')
    .setDefaultMemberPermissions(Permissions.FLAGS.ADMINISTRATOR)  // Set command to be only visible to users with ADMINISTRATOR permission
    .setDMPermission(false),  // This command should not be available in DMs
  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();

    // Find the admin command matching the subcommand
    const command = client.commands.get(subcommand);

    if (!command) {
      await interaction.reply({ content: 'This admin command does not exist.', ephemeral: true });
      return;
    }

    try {
      // Execute the admin command
      await command.execute(interaction, client);
    } catch (error) {
      console.error('Error executing admin command:', error);
      await interaction.reply({ content: 'There was an error while executing this admin command!', ephemeral: true });
    }
  }
};
