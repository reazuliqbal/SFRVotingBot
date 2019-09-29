const config = require('../config');
const { loadWhitelist, saveWhitelist } = require('../modules/utils');

module.exports = {
  name: 'unlist',
  args: true,
  guildOnly: true,
  usage: '<USERNAME>',
  description: 'Removes a steem user from whitelist.',
  async hasPermission(message) {
    return message.member.roles.some((r) => config.WHITELIST_MANAGER.includes(r.name));
  },
  async execute(message, args) {
    const username = args[0].trim().toLowerCase();

    const whitelist = loadWhitelist();

    const user = whitelist.find((u) => u === username);

    if (user) {
      whitelist.pop(user);

      saveWhitelist(whitelist);

      message.reply(`\`${username}\` has been removed from the whitelist.`);
    } else {
      message.reply(`\`${username}\` is not a whitelisted user.`);
    }
  },
};
