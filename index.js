require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { onBotStart } = require('./lib/programs/duckoftheday');
const commandLoader = require('./lib/programs/commandLoader');
const fs = require('fs');
const path = require('path');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');

// Define paths
const baseDir = path.resolve('./data');
const imagesDir = path.join(baseDir, 'duck-images');
const playerDataPath = path.join(baseDir, 'playerdata.json');
const usedDuckImagesPath = path.join(baseDir, 'usedDuckImages.json');

// Ensure directories and files exist
if (!fs.existsSync(baseDir)) {
  fs.mkdirSync(baseDir, { recursive: true });
  console.log(`Created directory at: ${baseDir}`);
}

if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
  console.log(`Created directory at: ${imagesDir}`);
}

if (!fs.existsSync(playerDataPath)) {
  fs.writeFileSync(playerDataPath, JSON.stringify({ players: [] }), 'utf8');
  console.log(`Created new playerdata.json at: ${playerDataPath}`);
}

if (!fs.existsSync(usedDuckImagesPath)) {
  fs.writeFileSync(usedDuckImagesPath, JSON.stringify([]), 'utf8');
  console.log(`Created new usedDuckImages.json at: ${usedDuckImagesPath}`);
}

// Configure bot's intents (permissions)
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageTyping,
  ],
});

// Initialize the commands Map
client.commands = new Map();

(async () => {
  try {
    const commands = commandLoader(client); // Load commands
    const rest = new REST({ version: '9' }).setToken(process.env.BOT_TOKEN); // Use BOT_TOKEN

    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), // Replace 'YOUR_GUILD_ID' with the actual guild ID
      { body: commands }
    );    

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('Error registering commands:', error);
  }
})();

// Handle interactions
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    // Execute the command
    await command.execute(interaction, client); // Pass the client to the execute function
  } catch (error) {
    console.error('Error executing command:', error);
    await interaction.reply({
      content: 'There was an error while executing this command!',
      ephemeral: true,
    });
  }
});

// Initialize tasks
client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);

  // Set the duck channel as a constant
  const duck_channel = client.channels.cache.get(process.env.DUCK_CHANNEL);
  
  // Check if the channel was found
  if (!duck_channel) {
    console.error('The specified channel could not be found.');
    return; // Exit if the channel is invalid
  }

  // Call the onBotStart function
  await onBotStart(client, duck_channel);
});

// Log in to Discord if the code is not run inside CI/CD pipeline test environment
if (process.env.NODE_ENV !== 'test') {
  client.login(process.env.BOT_TOKEN)
    .then(() => {
      console.log('Bot logged in successfully!');
    })
    .catch(err => {
      console.error('Failed to log in:', err);
    });
}
