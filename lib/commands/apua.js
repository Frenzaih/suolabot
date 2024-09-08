const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('apua') // Slash command name
    .setDescription('Lists all available commands'), // Slash command description
  
  async execute(interaction, client) { // Accept client as a parameter
    // Initialize an array to hold command descriptions
    let commandList = [];

    // Iterate over the commands stored in the client
    client.commands.forEach(command => {
      // Skip the current command (apua)
      if (command.data.name === 'apua') return;

      if (command.data && command.data.description) {
        commandList.push(`**${command.data.name}**: ${command.data.description}`);
      } else {
        console.warn(`Command ${command.data.name} is missing a valid description.`);
      }
    });

    // Send the list of commands as a response
    await interaction.reply(`**Available Commands:**\n\n${commandList.join('\n')}`);

    // Schedule deletion of the bot's response after 60 seconds
    setTimeout(() => {
      interaction.deleteReply().catch(err => console.error('Failed to delete bot message:', err));
    }, 60000); // 60 seconds
  },
};
