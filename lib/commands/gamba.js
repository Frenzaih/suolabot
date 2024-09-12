const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder } = require('@discordjs/builders');
const { ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ongoingRequests = new Map();

// Path to playerdata.json
const playerDataPath = path.join(__dirname, '../../data/playerdata.json');

// Load player data
function loadPlayerData() {
  try {
    const rawData = fs.readFileSync(playerDataPath);
    return JSON.parse(rawData);
  } catch (error) {
    console.error('Error reading player data:', error);
    return { players: [] }; // Default structure
  }
}

// Update player data directly in playerdata.json
function updatePlayerData(updatedPlayer) {
    const playerData = loadPlayerData();
  
    // Find the index of the player
    const index = playerData.players.findIndex(player => player.id === updatedPlayer.id);
  
    if (index !== -1) {
      console.log(`Updating player: ${updatedPlayer.name} (ID: ${updatedPlayer.id})`);
      playerData.players[index] = updatedPlayer; // Update existing player data
    } else {
      console.log(`Adding new player: ${updatedPlayer.name} (ID: ${updatedPlayer.id})`);
      playerData.players.push(updatedPlayer); // Add new player
    }
  
    // Write the updated data back to playerdata.json
    try {
      fs.writeFileSync(playerDataPath, JSON.stringify(playerData, null, 2));
      console.log(`Player data successfully saved to ${playerDataPath}`);
    } catch (error) {
      console.error('Error saving player data:', error);
    }
  }  
  
// Get a player by ID
function getPlayer(playerData, playerId) {
  return playerData.players.find(player => player.id === playerId);
}

// Add a new player
function addPlayer(playerData, playerId, username) {
  const newPlayer = { id: playerId, name: username, points: 0, money: 0 };
  playerData.players.push(newPlayer);
  return newPlayer;
}

// Play Dice Game
async function playDiceGame(interaction, player1Data, player2Data, betAmount, gameMessageId) {
    const channel = interaction.channel;
    const gameMessage = await channel.messages.fetch(gameMessageId);
  
    const roll1 = getSecureRandomInt(1, 7);
    const roll2 = getSecureRandomInt(1, 7);
  
    let gameProgress = gameMessage.content;
    gameProgress += `\n${player1Data.name} rolls the dice...`;
    await gameMessage.edit(gameProgress);
    await new Promise(resolve => setTimeout(resolve, 4000));
  
    gameProgress += `\n${player1Data.name} rolls a ${roll1}.`;
    await gameMessage.edit(gameProgress);
    await new Promise(resolve => setTimeout(resolve, 3000));
  
    gameProgress += `\n${player2Data.name} rolls the dice...`;
    await gameMessage.edit(gameProgress);
    await new Promise(resolve => setTimeout(resolve, 4000));
  
    gameProgress += `\n${player2Data.name} rolls a ${roll2}.`;
    await gameMessage.edit(gameProgress);
  
    // Determine the winner
    const isTie = roll1 === roll2;
    if (isTie) {
      gameProgress += `\nTie. Rolling again...`;
      await gameMessage.edit(gameProgress);
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for 5 seconds
      return await playDiceGame(interaction, player1Data, player2Data, betAmount, gameMessageId);
    }
  
    const winner = roll1 > roll2 ? player1Data : player2Data;
    const loser = winner === player1Data ? player2Data : player1Data;
  
    // Update money 
    winner.money += betAmount;
    loser.money -= betAmount;
  
    // Log updated player data before saving
    console.log(`Winner (${winner.name}) money after update:`, winner.money);
    console.log(`Loser (${loser.name}) money after update (if not commented out):`, loser.money);
  
    // Ensure changes are saved to playerData
    updatePlayerData(winner);
    updatePlayerData(loser);
  
    await new Promise(resolve => setTimeout(resolve, 1000));
    const resultMessage = `${winner.name} wins ${betAmount} money!`;
    gameProgress += `\n${resultMessage}`;
    await gameMessage.edit(gameProgress); // Final update with the result
  }  

module.exports = {
    data: new SlashCommandBuilder()
      .setName('gamba')
      .setDescription('Gamba with another player.')
      .addUserOption(option =>
        option.setName('user')
          .setDescription('The user to gamba with.')
          .setRequired(true))
      .addIntegerOption(option =>
        option.setName('money')
          .setDescription('The amount of money to gamba.')
          .setRequired(true)
          .setMinValue(1)), // Ensure money is at least 1

  async execute(interaction) {
    const playerData = loadPlayerData();
    const player1 = interaction.user; // Player initiating the command
    const player2 = interaction.options.getUser('user'); // Opponent
    const betAmount = interaction.options.getInteger('money');

    // Check if the player is trying to challenge themselves
    // if (player1.id === player2.id) {
    //   await interaction.reply({ content: "You cannot challenge yourself to a gamba.", ephemeral: true });
    //   return;
    // }

    // Check if there's any ongoing gamba request
    if (ongoingRequests.size > 0) {
      await interaction.reply({ content: "There is already an ongoing gamba request.", ephemeral: true });
      return;
    }

    let player1Data = getPlayer(playerData, player1.id);
    let player2Data = getPlayer(playerData, player2.id);

    if (!player1Data) player1Data = addPlayer(playerData, player1.id, player1.username);
    if (!player2Data) player2Data = addPlayer(playerData, player2.id, player2.username);

    if (player1Data.money < betAmount) {
      await interaction.reply({ content: `${player1.username} does not have enough money to gamba!`, ephemeral: true });
      return;
    }
    if (player2Data.money < betAmount) {
      await interaction.reply({ content: `${player2.username} does not have enough money to gamba!`, ephemeral: true });
      return;
    }

    const confirmRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('confirm')
          .setLabel('Confirm')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('cancel')
          .setLabel('Cancel')
          .setStyle(ButtonStyle.Secondary),
      );

    await interaction.reply({
      content: `Are you sure you want to gamba ${betAmount} money against ${player2.username}?`,
      components: [confirmRow],
      ephemeral: true
    });

    const filter = i => i.user.id === player1.id;
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 300000 });

    collector.on('collect', async i => {
      if (i.customId === 'cancel') {
        await i.update({ content: 'Gamba cancelled.', components: [], ephemeral: true });
        collector.stop();
        ongoingRequests.clear();
      } else if (i.customId === 'confirm') {
        await i.update({ content: 'Confirmed! Challenging the opponent...', components: [], ephemeral: true });

        // Prompt the opponent to accept or refuse
        const acceptRow = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('accept')
              .setLabel('Accept')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId('refuse')
              .setLabel('Refuse')
              .setStyle(ButtonStyle.Danger),
          );

        // Send a message to the channel tagging the opponent
        const opponentPrompt = await interaction.followUp({
          content: `<@${player2.id}>, do you accept a game of dice against ${player1.username} for ${betAmount} money?`,
          components: [acceptRow]
        });

        // Create a separate collector for the opponent's response
        const opponentFilter = i => i.user.id === player2.id;
        const opponentCollector = interaction.channel.createMessageComponentCollector({ filter: opponentFilter, time: 300000 });

        // Set the request as ongoing
        const requestKey = `${player1.id}-${player2.id}`;
        ongoingRequests.set(requestKey, { collector, opponentCollector });

        opponentCollector.on('collect', async i => {
          try {
            if (i.customId === 'refuse') {
              await i.update({ content: `${player2.username} refused. What a pussy...`, components: [] });
              collector.stop();
              opponentCollector.stop();
              ongoingRequests.delete(requestKey);
            } else if (i.customId === 'accept') {
              await i.update({ content: 'Gamba accepted!', components: [], ephemeral: true });

              const gameStartMessage = `${player1.username} bets ${betAmount} money against ${player2.username} in a game of dice!`;
              const gameMessage = await interaction.followUp({ content: gameStartMessage, ephemeral: false });

              await new Promise(resolve => setTimeout(resolve, 4000)); // Wait for 4 seconds

              await playDiceGame(interaction, player1Data, player2Data, betAmount, gameMessage.id);
              collector.stop();
              opponentCollector.stop();
              ongoingRequests.delete(requestKey);
            }
          } catch (error) {
            console.error('Error handling interaction:', error);
          }
        });

        opponentCollector.on('end', collected => {
          if (collected.size === 0) {
            interaction.followUp({ content: 'Gamba request timed out.', ephemeral: true });
            ongoingRequests.delete(requestKey);
          }
        });
      }
    });

    collector.on('end', collected => {
      if (collected.size === 0) {
        interaction.followUp({ content: 'Gamba request timed out.', ephemeral: true });
        ongoingRequests.clear();
      }
    });
  }
};

function getSecureRandomInt(min, max) {
  const randomBytes = crypto.randomBytes(4);
  const randomInt = randomBytes.readUInt32BE(0);
  return min + (randomInt % (max - min));
}
