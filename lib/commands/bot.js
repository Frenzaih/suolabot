const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bot') // Slash command name
    .setDescription('Ei toimi'), // Description of the slash command

  async execute(interaction) {
    // Formatted message to be sent when the command is used
    const formattedMessage = 
      `Ihan ok, mutta ootko kuullu vittu korjatusta botista? ` +
      `Siinä osallistuu vain ~~Arttu Samu~~ chatgpt ja myös ` +
      `paskapostauksen ~~Arttu Samu~~ chatgpt fanit saavat ` +
      `nauraa ja naurrattaahan se toki myös ehjä botti ja muut :D ` +
      `Kannattaa hei kattoo nopee`;

    // Send the formatted message as a response to the interaction
    await interaction.reply(formattedMessage);
  },
};
