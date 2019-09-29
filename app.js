const Discord = require('discord.js');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const eachSeries = require('async/eachSeries');
const obs = require('require-all')(path.join(__dirname, 'commands'));
const dsteem = require('./modules/dsteem');
const config = require('./config');
const {
  calculateMaxBid,
  checkPost,
  getAuthorAndPermlink,
  getVoteValue,
  getVPMana,
  loadWhitelist,
  refund,
  vote,
  updateSteemVariables,
} = require('./modules/utils');

let account = null;
let lastProcessed = {};
let processing = false;

// DISCORD BOT
const bot = new Discord.Client();
bot.commands = new Discord.Collection();

Object.values(obs).forEach((command) => {
  bot.commands.set(command.name, command);
});

bot.on('ready', () => console.log(`${bot.user.username} is ready...`));

bot.on('message', (message) => {
  if (!message.content.startsWith(config.PREFIX) || message.author.bot) return;

  const args = message.content.slice(config.PREFIX.length).split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = bot.commands.get(commandName)
    || bot.commands.find((cmd) => cmd.aliases && cmd.aliases.includes(commandName));

  if (!command) return;

  if (command.guildOnly && message.channel.type !== 'text') {
    return message.reply('I cannot execute that command inside DMs!');
  }

  if (command.args && !args.length) {
    let reply = `You didn't provide any arguments, ${message.author}!`;

    if (command.usage) {
      reply += `\nThe proper usage would be: \`${config.PREFIX}${command.name} ${command.usage}\``;
    }

    return message.channel.send(reply);
  }

  if (typeof command.hasPermission === 'function') {
    if (!command.hasPermission(message)) return message.reply('you do not have permission to use this command.');
  }

  try {
    command.execute(message, args);
  } catch (error) {
    console.error(error.message);
    message.reply('there was an error trying to execute that command!');
  }
});

bot.on('error', (error) => console.error(error.message));

bot.login(config.BOT_TOKEN);
// END OF DISCORD BOT


const getTransactions = async (user, symbol, limit = 50) => {
  let transactions = [];

  try {
    const call = await axios.get(config.SE_HISTORY, {
      params: {
        account: user,
        symbol,
        limit,
        offset: 0,
        type: 'user',
      },
    });

    transactions = call.data;
  } catch (e) {
    console.log(e.message);
  }

  return transactions;
};

const saveState = () => {
  const state = {
    last_processed: lastProcessed,
  };

  fs.writeFile('state.json', JSON.stringify(state, null, 2), (err) => {
    if (err) { console.log(err); }
  });
};

const loadState = async () => {
  if (fs.existsSync('state.json')) {
    const state = JSON.parse(fs.readFileSync('state.json'));
    if (state.last_processed) lastProcessed = state.last_processed;
  } else {
    const [trx] = (await getTransactions(config.BOT_ACCOUNT, config.SE_COIN_SYMBOL, 1));
    lastProcessed = trx.txid;
    saveState();
  }
};

const getNewerTransfers = (txs, txid) => txs.slice(txs.findIndex((t) => t.txid === txid) + 1);

const processTransfers = async () => {
  try {
    if (!processing) {
      processing = true;

      // Loading Steem Engine transfers
      const transactions = await getTransactions(config.BOT_ACCOUNT, config.SE_COIN_SYMBOL);

      // Finding un-processed transfers
      const unProcessed = getNewerTransfers(transactions.reverse(), lastProcessed);

      // Getting only transfers to the bot
      const transfers = unProcessed.filter((t) => t.from_type === 'user' && t.to === config.BOT_ACCOUNT).reverse();

      eachSeries(transfers, async (bid) => {
        try {
          // Loading bot account
          [account] = await dsteem.client.database.getAccounts([config.BOT_ACCOUNT]);
          const maxBid = calculateMaxBid(account);
          const vp = getVPMana(account);

          const whitelist = loadWhitelist();

          if (!whitelist.includes(bid.from)) {
            await refund(bid.quantity, bid.symbol, bid.from, 'not_whitelisted');
          } else if (config.MIN_VP >= vp) {
            await refund(bid.quantity, bid.symbol, bid.from, 'low_vp');
          } else if (Number(bid.quantity) < config.MIN_BID) {
            await refund(bid.quantity, bid.symbol, bid.from, 'below_min_bid');
          } else if (Number(bid.quantity) > maxBid) {
            await refund(bid.quantity, bid.symbol, bid.from, 'above_max_bid', maxBid);
          } else {
            const { author, permlink } = getAuthorAndPermlink(bid.memo);

            const status = await checkPost(author, permlink);

            if (!status.success) {
              await refund(bid.quantity, bid.symbol, bid.from, status.error);
            } else {
              const voteValue = getVoteValue(account, vp);
              const valueRequired = Number(bid.quantity) * config.RATIO;
              const voteWeight = Math.ceil((valueRequired / voteValue) * 10000);

              await vote(author, permlink, voteWeight);
            }
          }
        } catch (e) {
          console.log(e.message);
        }

        lastProcessed = bid.txid;
        saveState();
      }, () => {
        processing = false;
      });
    }
  } catch (e) {
    console.log(e.message);
  }

  setTimeout(processTransfers, 30 * 1000);
};

(async () => {
  await loadState();

  await updateSteemVariables();
  await processTransfers();
})();
