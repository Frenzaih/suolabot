//Command that sends a formatted message when !bot is used.

module.exports = {
    description: 'ei toimi',
    execute: async (msg) => {
      // Check if the message starts with !bot and is not sent by a bot
      if (msg.content === '!bot' && !msg.author.bot) {
        const formattedMessage = `Ihan ok, mutta ootko kuullu vittu korjatusta botista? Siinä osallistuu vain ~~Arttu~~ Samu ja myös paskapostauksen ~~Arttu~~ Samu fanit saavat nauraa ja naurrattaahan se toki myös ehjä botti ja muut :D Kannattaa hei kattoo nopee`;
        await msg.channel.send(formattedMessage);
      }
    }
  };
  
  