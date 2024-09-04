const crypto = require('crypto');

module.exports = {
  description: 'Rolls a dice. Optionally specify the number of rolls.',
  execute(msg) {
    // Split the message content into arguments
    const args = msg.content.split(' ').slice(1); // Get arguments after the command

    // Default to 1 roll if no argument is provided
    let numberOfRolls = 1;

    // Check if the argument is provided and is a valid number
    if (args.length > 0) {
      const parsedNumber = parseInt(args[0], 10);
      if (!isNaN(parsedNumber) && parsedNumber > 0) {
        numberOfRolls = parsedNumber; // Set the number of rolls to the parsed number
      }
    }

    // Roll the dice the specified number of times
    let results = [];
    for (let i = 0; i < numberOfRolls; i++) {
      const diceRoll = crypto.randomInt(1, 7); // Roll the dice
      results.push(diceRoll);
    }

    // Send the results as a message
    msg.channel.send(`You rolled: ${results.join(', ')}`);
  }
};
