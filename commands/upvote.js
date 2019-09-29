const config = require('../config');
const { checkPost, getAuthorAndPermlink } = require('../modules/utils');

module.exports = {
  name: 'upvote',
  args: true,
  guildOnly: true,
  usage: '<AMOUNT> <URL>',
  description: 'Request upvote from the bot account.',
  async execute(message, args) {
    let [amount, url] = args;

    amount = parseFloat(amount);
    url = url.trim().replace(/<|>/g, '');

    if (Number.isNaN(amount)) {
      return message.reply('Invalid Amount! Amount should be a number.');
    }

    const { author, permlink } = getAuthorAndPermlink(url);

    if (!author || !permlink) {
      return message.reply('Invalid URL! Please enter URL in `@author/permalink` format.');
    }

    const status = await checkPost(author, permlink);

    if (status.success && status.error === null) {
      const json = JSON.stringify({
        contractName: 'tokens',
        contractAction: 'transfer',
        contractPayload: {
          symbol: config.SE_COIN_SYMBOL,
          to: config.BOT_ACCOUNT,
          quantity: `${amount}`,
          memo: url,
        },
      });

      let sc = 'https://steemconnect.com/sign/custom-json?';
      sc += `required_posting_auths=${encodeURI('[]')}`;
      sc += `&required_auths=${encodeURI(`["${author}"]`)}`;
      sc += `&id=${config.SE_CHAIN_ID}`;
      sc += `&json=${encodeURI(json)}`;

      message.channel.send(`${message.member} please send:\nAmount: \`${amount} ${config.SE_COIN_SYMBOL}\`\nTo: \`${config.BOT_ACCOUNT}\`\nMemo: \`${url}\`\nSteemConnect: ${sc}`);
    } else {
      let msg = '';

      switch (status.error) {
        case 'not_whitelisted':
          msg = 'Author is not whitelisted.';
          break;
        case 'comment_not_allowed':
          msg = 'Comment not allowed.';
          break;
        case 'already_voted':
          msg = 'We already upvoted the content.';
          break;
        case 'max_age':
          msg = `Post is older than ${config.MAX_POST_AGE} hours.`;
          break;
        case 'min_age':
          msg = `Post should be at least ${config.MIN_POST_AGE} minutes old.`;
          break;

        default:
      }

      message.reply(msg);
    }
  },
};
