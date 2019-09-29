const config = require('../config');
const dsteem = require('../modules/dsteem');
const { loadWhitelist, saveWhitelist } = require('../modules/utils');

module.exports = {
  name: 'whitelist',
  args: true,
  guildOnly: true,
  usage: '<USERNAME>',
  description: 'Whitelist a steem user.',
  async hasPermission(message) {
    return message.member.roles.some((r) => config.WHITELIST_MANAGER.includes(r.name));
  },
  async execute(message, args) {
    const username = args[0].trim().toLowerCase();
    const [account] = await dsteem.client.database.getAccounts([username]);

    if (!account) {
      message.reply(`we could not find \`@${username}\` on the chain.`);
    } else {
      const whitelist = loadWhitelist();

      if (!whitelist.includes(username)) {
        whitelist.push(username);

        saveWhitelist(whitelist);

        message.reply(`\`${username}\` has been added to the whitelist.`);
      } else {
        message.reply(`\`${username}\` is already a whitelisted user.`);
      }
    }
  },
};
