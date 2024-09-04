module.exports = {
  description: 'Checks the bot\'s latency',
  execute(msg) {
    msg.channel.send('Pinging...').then(sent => {
      const ping = sent.createdTimestamp - msg.createdTimestamp;
      sent.edit(`Pong! Latency is ${ping}ms`);
    });
  }
};
