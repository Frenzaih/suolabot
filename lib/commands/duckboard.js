const fs = require('fs');
const path = require('path');

// Define the path for playerdata.json
const playerDataPath = path.resolve('./data/playerdata.json');

module.exports = {
  name: 'duckboard',
  description: 'Displays the top players by points in descending order with medals for the top 3, or the points of a specific user if mentioned',
  async execute(message) {
    try {
      // Read and parse playerdata.json
      const data = fs.readFileSync(playerDataPath, 'utf8');
      const playerData = JSON.parse(data);

      // Ensure the players array exists and is an array
      if (!Array.isArray(playerData.players)) {
        throw new Error('Player data is not in the expected format.');
      }

      // Check if a user is mentioned
      const mentionedUser = message.mentions.users.first();
      if (mentionedUser) {
        // Display points for the specific user
        const user = playerData.players.find(p => p.name === mentionedUser.username);
        if (user) {
          message.channel.send(`${mentionedUser.username} has ${user.points} points.`);
        } else {
          message.channel.send(`${mentionedUser.username} has not earned any points yet.`);
        }
        return;
      }

      // Sort players by points in descending order
      const sortedPlayers = playerData.players.sort((a, b) => b.points - a.points);

      // Limit to the top 5 players
      const topPlayers = sortedPlayers.slice(0, 5);

      // Create the message to send
      let responseMessage = 'Top Players:\n\n';

      topPlayers.forEach((player, index) => {
        let medal = '';
        if (index === 0) medal = '🥇'; // Gold medal for 1st place
        else if (index === 1) medal = '🥈'; // Silver medal for 2nd place
        else if (index === 2) medal = '🥉'; // Bronze medal for 3rd place

        responseMessage += `${medal} ${player.name} - ${player.points} points\n`;
      });

      // Send the message
      message.channel.send(responseMessage);
    } catch (error) {
      console.error('Error executing !duckboard command:', error);
      message.channel.send('There was an error trying to fetch the duckboard.');
    }
  },
};
