const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder } = require('@discordjs/builders');
const { ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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

// Save player data
function savePlayerData(data) {
  try {
    fs.writeFileSync(playerDataPath, JSON.stringify(data, null, 2));
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
  let winner;
  if (roll1 > roll2) {
    winner = player1Data;
  } else if (roll2 > roll1) {
    winner = player2Data;
  } else {
    gameProgress += `\nTie. Rolling again...`;
    await gameMessage.edit(gameProgress);
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for 5 seconds
    return await playDiceGame(interaction, player1Data, player2Data, betAmount, gameMessageId);
  }

  const loser = winner.id === player1Data.id ? player2Data : player1Data;

  // Update player data
  winner.money += betAmount;
  loser.money -= betAmount;
  savePlayerData({ players: loadPlayerData().players });

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
        .setRequired(true)),

  async execute(interaction) {
    const playerData = loadPlayerData();
    const player1 = interaction.user; // Player initiating the command
    const player2 = interaction.options.getUser('user'); // Opponent
    const betAmount = interaction.options.getInteger('money');

    // Check if the player is challenging themselves
    if (player1.id === player2.id) {
      await interaction.reply({ content: "You cannot gamba against yourself.", ephemeral: true });
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

        // Send a message to the channel that will be invisible to everyone except the opponent
        const opponentPrompt = await interaction.followUp({
          content: `${player1.username} challenges you to gamba ${betAmount} money. Do you want to proceed or refuse?`,
          components: [acceptRow],
          ephemeral: true // Keep this message ephemeral
        });

        // Create a separate collector for the opponent's response
        const opponentFilter = i => i.user.id === player2.id;
        const opponentCollector = interaction.channel.createMessageComponentCollector({ filter: opponentFilter, time: 300000 });

        opponentCollector.on('collect', async i => {
          if (i.customId === 'refuse') {
            await i.update({ content: 'What a pussy...', components: [], ephemeral: true });
            await interaction.followUp({ content: `${player2.username} refused the gamble.`, ephemeral: true });
            collector.stop();
            opponentCollector.stop();
          } else if (i.customId === 'accept') {
            await i.update({ content: 'Gamba accepted! Rolling the dice...', components: [], ephemeral: true });

            const gameStartMessage = `${player1.username} bets ${betAmount} money against ${player2.username} in a game of dice!`;
            const gameMessage = await interaction.followUp({ content: gameStartMessage, ephemeral: false });

            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for 5 seconds

            await playDiceGame(interaction, player1Data, player2Data, betAmount, gameMessage.id);
            collector.stop();
            opponentCollector.stop();
          }
        });

        opponentCollector.on('end', collected => {
          if (collected.size === 0) {
            interaction.followUp({ content: 'Gamba request timed out.', ephemeral: true });
          }
        });
      }
    });

    collector.on('end', collected => {
      if (collected.size === 0) {
        interaction.followUp({ content: 'Gamba request timed out.', ephemeral: true });
      }
    });
  },
};

function getSecureRandomInt(min, max) {
  const randomBytes = crypto.randomBytes(4);
  const randomInt = randomBytes.readUInt32BE(0);
  return min + (randomInt % (max - min));
}
