const utils = require('../modules/utils');
const dsteem = require('../modules/dsteem');
const config = require('../config');

module.exports = {
  name: 'stats',
  args: false,
  guildOnly: true,
  usage: '',
  description: 'Shows overall bots stats.',
  async execute(message) {
    const [account] = await dsteem.client.database.getAccounts([config.BOT_ACCOUNT]);

    const maxBid = utils.calculateMaxBid(account);
    const vp = utils.getVPMana(account);
    const dvp = utils.getDVMana(account);
    const voteValue = utils.getVoteValue(account, vp);

    message.channel.send(`\`\`\`Bot Account: ${config.BOT_ACCOUNT}\nVoting Power: ${vp / 100}%\nDownvoting Power: ${dvp / 100}%\nVote Value: ${voteValue.toFixed(3)}\nMax Bid: ${utils.toFixed(maxBid, 3)}\`\`\``);
  },
};
