const { SlashCommandBuilder } = require('@discordjs/builders');
const crypto = require('crypto');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('testinoppa') // Updated slash command name
    .setDescription('Rolls a dice. Optionally specify the number of rolls.')
    .addIntegerOption(option =>
      option.setName('number')
        .setDescription('The number of rolls (maximum 10)')
        .setMinValue(1) // Minimum value for the number of rolls
        .setMaxValue(10) // Maximum value for the number of rolls
    ),

  async execute(interaction) {
    // Get the number of rolls from the command options
    const numberOfRolls = interaction.options.getInteger('number');

    // Validate the number of rolls
    if (numberOfRolls === null || numberOfRolls < 1 || numberOfRolls > 10) {
      await interaction.reply({ content: 'Please specify a number of rolls between 1 and 10.', ephemeral: true });
      return; // Exit the function if the input is invalid
    }

    // Roll the dice the specified number of times
    let results = [];
    for (let i = 0; i < numberOfRolls; i++) {
      const diceRoll = crypto.randomInt(1, 7); // Roll the dice
      results.push(diceRoll);
    }

    // Send the results as a response
    await interaction.reply(`You rolled: ${results.join(', ')}`);

    // Delete the response message after 10 seconds
    setTimeout(() => {
      interaction.deleteReply().catch(console.error);
    }, 10000);
  },
};
