require('dotenv').config();

const { Client, GatewayIntentBits } = require('discord.js');
const { postDuckImage, scheduleDailyDuckImagePosting, onBotStart } = require('./lib/programs/duckoftheday');
const pointsModule = require('./lib/programs/duckoftheday-points'); // Import the points module
const fs = require('fs');
const path = require('path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Load commands from the "lib/commands" folder
const commandFiles = fs.readdirSync(path.join(__dirname, 'lib', 'commands'))
  .filter(file => file.endsWith('.js'));

const commands = new Map();

// Register commands
for (const file of commandFiles) {
  const command = require(`./lib/commands/${file}`);
  commands.set(file.split('.')[0], command); // Use the filename (without extension) as the command name
}

// Listen for messages to handle commands
client.on('messageCreate', async (message) => {
  if (message.author.bot) return; // Ignore bot messages

  // Handle command execution
  if (message.content.startsWith('!')) {
    const commandName = message.content.split(' ')[0].slice(1); // Get the command name without the prefix

    if (commands.has(commandName)) {
      const command = commands.get(commandName);
      await command.execute(message); // Execute the command
    }
  }
});

// Initialize tasks
client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  const duck_channel = client.channels.cache.get(process.env.DUCK_CHANNEL); // Duck image channel (in .env)

  // Command to force post the duck image
  client.on('messageCreate', async (message) => {
    if (message.content === '!forcepost' && message.member.permissions.has('ADMINISTRATOR')) {
      await postDuckImage(client, duck_channel, false); // Pass false to not mark the image as used
    }
  });

  await onBotStart(client, duck_channel); // duckoftheday starting procedure
});

// Log in to Discord
client.login(process.env.BOT_TOKEN); // Token in .env
