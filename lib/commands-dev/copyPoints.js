const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('copypointstomoney') // Slash command name
    .setDescription('Copies points from playerdata.json to a new line called "money" for each player.'),

  async execute(interaction) {
    // Define the path to playerdata.json
    const playerDataPath = path.join(__dirname, '../../data/playerdata.json'); // Adjust the path as needed

    try {
      // Read the playerdata.json file
      const data = fs.readFileSync(playerDataPath, 'utf8');
      const jsonData = JSON.parse(data);

      // Check if players array exists in the JSON data
      if (!Array.isArray(jsonData.players)) {
        await interaction.reply({ content: 'Invalid player data format. No players array found.', ephemeral: true });
        return;
      }

      // Copy points to money for each player
      jsonData.players.forEach(player => {
        if (player.points !== undefined) {
          player.money = player.points; // Copy points to money
        }
      });

      // Write the updated data back to playerdata.json
      fs.writeFileSync(playerDataPath, JSON.stringify(jsonData, null, 2), 'utf8');

      // Reply with a success message
      await interaction.reply('Points have been successfully copied to "money" for each player.');

    } catch (error) {
      console.error('Error copying points to money:', error);
      await interaction.reply({ content: 'An error occurred while copying points to "money".', ephemeral: true });
    }
  },
};
