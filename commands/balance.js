const se = require('../modules/steem-engine');
const config = require('../config');

module.exports = {
  name: 'balance',
  args: true,
  guildOnly: true,
  usage: '<USERNAME>',
  description: 'Shows balance of the provided user.',
  async execute(message, args) {
    const username = args[0].trim().toLowerCase();

    const query = await se.getBalance(username, config.SE_COIN_SYMBOL);

    if (query) {
      message.channel.send(`\`\`\`Account: ${username}\nBalance: ${query.balance} ${query.symbol}\`\`\``);
    } else {
      message.channel.send(`We cannot find ${config.SE_COIN_SYMBOL} balance for \`@${username}\`.`);
    }
  },
};
