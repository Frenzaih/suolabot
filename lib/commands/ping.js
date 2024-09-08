const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Checks the bot\'s latency'),

  async execute(interaction) {
    const sentMessage = await interaction.reply({ content: 'Pinging...', fetchReply: true });

    const botLatency = sentMessage.createdTimestamp - interaction.createdTimestamp; // Total bot latency
    const apiLatency = interaction.client.ws.ping; // API latency

    await interaction.editReply(`Pong! Total bot latency is **${botLatency}ms**, of which **${apiLatency}ms** is API latency.`);
  },
};
