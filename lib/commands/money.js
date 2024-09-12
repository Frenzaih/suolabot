const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');
const path = require('path');

// Path to playerdata.json
const playerDataPath = path.join(__dirname, '../../data/playerdata.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('money')
    .setDescription('Displays how much money a user has.')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to check the money for')
    ),

  async execute(interaction) {
    // Fetch the mentioned user or default to the command user
    const targetUser = interaction.options.getUser('user') || interaction.user;

    // Load player data
    let playerData;
    try {
      playerData = JSON.parse(fs.readFileSync(playerDataPath, 'utf8'));
    } catch (error) {
      console.error('Error reading player data:', error);
      return interaction.reply({ content: 'There was an error reading the player data. Please try again later.', ephemeral: true });
    }

    // Find the user's data
    const userData = playerData.players.find(player => player.id === targetUser.id);

    // Handle cases where the user does not exist or has no money
    if (!userData || !userData.money) {
      return interaction.reply({ content: `${targetUser.username} has no money recorded in the system.`, ephemeral: true });
    }

    // Reply with the amount of money the user has
    return interaction.reply({ content: `${targetUser.username} has ${userData.money} money.` });
  }
};
