const fs = require("fs");
const schedule = require('node-schedule');
const playerDataPath = "./data/playerdata.json";

// Helper function to read player data from the JSON file
function readPlayerData() {
  try {
    const rawData = fs.readFileSync(playerDataPath);
    return JSON.parse(rawData);
  } catch (error) {
    console.error("Error reading player data:", error);
    return { players: [] }; // Return an empty structure if reading fails
  }
}

// Helper function to find player index by unique identifier
function findPlayerIndex(identifier, players) {
  return players.findIndex(player => player.id === identifier);
}

// Store users who have already commented
const commentedUsers = new Set();
const commentedUsersOrder = []; // Store the order of users who commented

// Flag to track if the point system is active
let pointSystemActive = false;

// Module exports
module.exports = {
  // Show player's points
  showPlayerPoints: function (userId) {
    const json = readPlayerData();
    const playerIndex = findPlayerIndex(userId, json.players);

    if (playerIndex !== -1) {
      console.log(`Found player ${json.players[playerIndex].name} with ${json.players[playerIndex].points} points.`);
      return {
        id: json.players[playerIndex].id,
        name: json.players[playerIndex].name,
        points: json.players[playerIndex].points
      };
    } else {
      console.log(`Player with ID ${userId} not found in the data.`);
      return null; // Player not found
    }
  },

  // Update player's points
  updatePoints: function (userId, userName, pointsToAdd) {
    const json = readPlayerData();
    const playerIndex = findPlayerIndex(userId, json.players);

    if (playerIndex !== -1) {
      // Update the player's points and name
      json.players[playerIndex].points += pointsToAdd;
      json.players[playerIndex].name = userName; // Update the name to the current name
      console.log(`Updated player ${json.players[playerIndex].name}'s points to ${json.players[playerIndex].points}.`);
    } else {
      // Store userId and current name for new user
      json.players.push({ id: userId, name: userName, points: pointsToAdd });
      console.log(`Added new player ${userName} with ${pointsToAdd} points.`);
    }

    fs.writeFileSync(playerDataPath, JSON.stringify(json, null, 2));
    console.log(`Player data updated and saved to ${playerDataPath}.`);
  },

  // Generate leaderboard
  leaderboard: function () {
    const json = readPlayerData();
    let leaderboardStr = "__**Leaderboard**__ \n"; // Initialize leaderboard string
    const sortedPlayers = json.players.sort((a, b) => b.points - a.points); // Sort players by points

    // Create leaderboard entries
    const leaderboardEntries = sortedPlayers.map(player => 
      `${player.name} - ${player.points} points`
    );

    // Join entries and append to leaderboard string
    leaderboardStr += leaderboardEntries.join("\n");
    console.log("Generated leaderboard:\n", leaderboardStr);
    return leaderboardStr; // Return the complete leaderboard string
  },

  // Function to start the point system
  startPointSystem: async function (channel) {
    // Set the flag to indicate that the point system is active
    pointSystemActive = true;
    console.log("Point system started. Listening for messages...");

    // Schedule the point system to stop at 9:59 AM the next day
    const now = new Date();
    const stopTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 59, 0); // Next day at 9:59 AM
    schedule.scheduleJob(stopTime, () => {
      this.stopPointSystem(); // Call the function to stop the point system
      console.log("scheduleJob: trying to stop the point system and message collector of previous day.")
    });

    // Start listening for messages in the channel
    const collector = channel.createMessageCollector({ time: 0 }).on('collect', async (message) => {
      await this.handleDuckMessage(message);
    });

    // Store the collector reference to stop it later
    this.collector = collector; // Store the collector reference
  },

  // Function to stop the point system
  stopPointSystem: function () {
    pointSystemActive = false; // Set the flag to inactive
    if (this.collector) {
      this.collector.stop(); // Stop the message collector
      console.log("Point system and message collector has been stopped.");
    }
  },

  // Function to handle messages containing the duck emoji
  handleDuckMessage: async function (message) {
    // Check if the point system is active
    if (!pointSystemActive) {
      console.log("Point system is not active. Ignoring message.");
      return; // Exit if the point system is not active
    }

    // Check if the message contains the duck emoji
    if (message.content.includes('🦆')) {
      const userId = message.author.id;
      const userName = message.author.username; // Get the current username

      // Check if the user has already commented
      if (commentedUsers.has(userId)) {
        // React with clown emoji for double-dipping
        await message.react('🤡');
        console.log(`User ${userName} tried to comment again. Reacted with clown emoji.`);
        return; // Exit the function to prevent further processing
      }

      // Add user to the set of commented users
      commentedUsers.add(userId);
      // Add user to the order array
      commentedUsersOrder.push(userId);
      console.log(`User ${userName} commented with a duck emoji. Total unique commenters: ${commentedUsers.size}`);

      // Determine points based on the order of commenting
      let pointsToAdd = 0;
      const userOrderIndex = commentedUsersOrder.indexOf(userId); // Get the index of the user in the order array

      if (userOrderIndex === 0) {
        pointsToAdd = 100; // First commenter
      } else if (userOrderIndex === 1) {
        pointsToAdd = 75; // Second commenter
      } else if (userOrderIndex === 2) {
        pointsToAdd = 50; // Third commenter
      }

      // Update points for the user, using the current username
      this.updatePoints(userId, userName, pointsToAdd); // Add points based on order

      // React with the corresponding medal emoji
      const medalEmojis = ['🥇', '🥈', '🥉']; // Gold, Silver, Bronze
      if (userOrderIndex < 3) {
        await message.react(medalEmojis[userOrderIndex]); // React to the user's message with the medal
        console.log(`Reacted with ${medalEmojis[userOrderIndex]} to ${userName}'s message.`);
      }

      // Check if three unique users have commented
      if (commentedUsers.size === 3) {
        // Deactivate the point system
        this.stopPointSystem(); // Stop the point system if three unique users have commented
      }
    }
  }
};
