const fs = require('fs');
const path = require('path');
const { SlashCommandBuilder } = require('@discordjs/builders');

// Define the path for playerdata.json
const playerDataPath = path.join(__dirname, '../../data/playerdata.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('duckboard') // Slash command name
    .setDescription('Displays the top players') // Command description
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to check points for') // Optional user to check points
    ),
  
  async execute(interaction) {
    try {
      // Read and parse playerdata.json
      const data = fs.readFileSync(playerDataPath, 'utf8');
      const playerData = JSON.parse(data);

      // Ensure the players array exists and is an array
      if (!Array.isArray(playerData.players)) {
        throw new Error('Player data is not in the expected format.');
      }

      // Check if a user is mentioned in the slash command
      const mentionedUser = interaction.options.getUser('user');
      let responseMessage;

      if (mentionedUser) {
        // Display points for the specific user
        const user = playerData.players.find(p => p.name === mentionedUser.username);
        if (user) {
          responseMessage = `${mentionedUser.username} has ${user.points} points.`;
        } else {
          responseMessage = `${mentionedUser.username} has not earned any points yet.`;
        }
      } else {
        // Sort players by points in descending order
        const sortedPlayers = playerData.players.sort((a, b) => b.points - a.points);

        // Limit to the top 6 players
        const topPlayers = sortedPlayers.slice(0, 6);

        // Create the message to send
        let responseText = 'Top Players:\n\n';

        topPlayers.forEach((player, index) => {
          let medal = '';
          if (index === 0) medal = '🥇'; // Gold medal for 1st place
          else if (index === 1) medal = '🥈'; // Silver medal for 2nd place
          else if (index === 2) medal = '🥉'; // Bronze medal for 3rd place

          responseText += `${medal} ${player.name} - ${player.points} points\n`;
        });

        responseMessage = responseText;
      }

      // Reply with the response message
      await interaction.reply(responseMessage);

    } catch (error) {
      console.error('Error executing /duckboard command:', error);
      interaction.reply({ content: 'There was an error trying to fetch the duckboard.', ephemeral: true })
        .then(sentMessage => {
          setTimeout(() => {
            interaction.deleteReply().catch(console.error);
          }, 10000);
        });
    }
  },
};
