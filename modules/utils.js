const fs = require('fs');
const dsteem = require('./dsteem');
const config = require('../config');

const STEEM_VOTE_REGENERATION_SECONDS = (5 * 60 * 60 * 24);

let rewardBalance;
let recentClaims;
let steemPrice;
let maxVoteDenom;

const isURL = (url) => {
  const urlRegExp = new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/gi);

  return urlRegExp.test(url);
};

const getUsername = (rawUser) => {
  let user = rawUser;
  if (user.includes('#')) [user] = user.split('#').reverse();

  user = (user.startsWith('@')) ? user.slice(1) : user;

  return user;
};

const getAuthorAndPermlink = (url) => {
  let permlink;
  let author;

  if (isURL(url)) {
    [permlink, author] = url.split('/').reverse();
    author = getUsername(author);
  }

  return {
    permlink,
    author,
  };
};

const log = (message) => {
  console.log(new Date().toLocaleString(), message);
};

const round = (t, l) => {
  const a = 10 ** l;
  const s = t * a;
  return Math.round(s) / a;
};

const saveWhitelist = (whitelist) => {
  fs.writeFileSync('./whitelist.json', JSON.stringify(whitelist, null, 2));
};
const loadWhitelist = () => {
  let whitelist = [];

  if (fs.existsSync('./whitelist.json')) {
    whitelist = JSON.parse(fs.readFileSync('./whitelist.json', { encoding: 'utf-8' }));
  }

  return whitelist;
};

const checkPost = async (author, permlink) => {
  const content = await dsteem.client.database.call('get_content', [author, permlink]);

  let status = { success: true, error: null };

  if (content && ((content.id && content.id > 0) || (content.post_id && content.post_id > 0))) {
    const created = new Date(`${content.created}Z`);

    if (!config.ALLOW_COMMENT && content.depth > 0) {
      status = { success: false, error: 'comment_not_allowed' };
    } else if (content.active_votes.some((v) => v.voter === config.BOT_ACCOUNT)) {
      status = { success: false, error: 'already_voted' };
    } else if ((new Date() - created) >= (config.MAX_POST_AGE * 60 * 60 * 1000)) {
      status = { success: false, error: 'max_age' };
    } else if (config.MIN_POST_AGE && config.MIN_POST_AGE > 0
      && (new Date() - created) < (config.MIN_POST_AGE * 60 * 1000)) {
      status = { success: false, error: 'min_age' };
    }
  } else {
    status = { success: false, error: 'invalid_post_url' };
  }

  return status;
};

const updateSteemVariables = () => {
  dsteem.client.database.call('get_reward_fund', ['post'])
    .then((r) => {
      rewardBalance = parseFloat(r.reward_balance);
      recentClaims = Number(r.recent_claims);
    })
    .catch((e) => log(`Error loading reward fund: ${e.message}`));

  dsteem.client.database.getCurrentMedianHistoryPrice()
    .then((r) => {
      steemPrice = r.base.amount / r.quote.amount;
    })
    .catch((e) => log(`Error loading steem price: ${e.message}`));

  dsteem.client.database.getDynamicGlobalProperties()
    .then((r) => {
      maxVoteDenom = r.vote_power_reserve_rate * STEEM_VOTE_REGENERATION_SECONDS;
    })
    .catch((e) => log(`Errorloading global props: ${e.message}`));

  setTimeout(() => { updateSteemVariables(); }, 180 * 1000);
};

const getVPMana = (account) => {
  const maxMana = dsteem.getVests(account) * 1000000;

  const lastMana = parseInt(account.voting_manabar.current_mana);
  const lastUpdateTime = account.voting_manabar.last_update_time;
  const lastUpdate = new Date(lastUpdateTime * 1000);
  const elapsed = (new Date().getTime() - lastUpdate.getTime()) / 1000;

  let currentMana = lastMana + elapsed * (maxMana / 432000);

  if (currentMana > maxMana) {
    currentMana = maxMana;
  }

  let currentManaPct = 0;

  if (maxMana > 0) {
    currentManaPct = (currentMana / maxMana) * 100;
  }

  return Math.round(currentManaPct * 100);
};

const getDVMana = (account) => {
  const maxMana = (dsteem.getVests(account) / 4) * 1000000;

  const lastMana = parseInt(account.downvote_manabar.current_mana);
  const lastUpdateTime = account.downvote_manabar.last_update_time;
  const lastUpdate = new Date(lastUpdateTime * 1000);
  const elapsed = (new Date().getTime() - lastUpdate.getTime()) / 1000;

  let currentMana = lastMana + elapsed * (maxMana / 432000);

  if (currentMana > maxMana) {
    currentMana = maxMana;
  }

  let currentManaPct = 0;

  if (maxMana > 0) {
    currentManaPct = (currentMana / maxMana) * 100;
  }

  return Math.round(currentManaPct * 100);
};

const getVoteValue = (account, power) => {
  const weight = 10000;
  const totalVests = dsteem.getVests(account);
  const finalVest = totalVests * 1e6;
  let usedPower = parseInt(((power * Math.abs(weight)) / 10000) * (60 * 60 * 24), 10);
  usedPower = parseInt((usedPower + maxVoteDenom - 1) / maxVoteDenom, 10);
  const rshares = parseInt((usedPower * finalVest) / 10000, 10);

  const voteValue = (rshares / recentClaims) * rewardBalance * steemPrice;

  return voteValue;
};

const refund = async (quantity, symbol, to, reason, data = null) => {
  const amount = `${quantity} ${symbol}`;

  let memo = config.MEMOS[reason];

  memo = memo.replace(/{amount}/g, amount);
  memo = memo.replace(/{currency}/g, symbol);
  memo = memo.replace(/{vp}/g, (config.MIN_VP / 100).toFixed(2));
  memo = memo.replace(/{min_bid}/g, config.MIN_BID);
  memo = memo.replace(/{min_age}/g, config.MIN_POST_AGE);

  if (data) {
    memo = memo.replace(/{max_bid}/g, data.toFixed(3));
  }

  const days = Math.floor(config.MAX_POST_AGE / 24);
  const hours = (config.MAX_POST_AGE % 24);
  memo = memo.replace(/{max_age}/g, `${days} Day(s)${(hours > 0) ? ` ${hours} Hour(s)` : ''}`);

  const json = {
    contractName: 'tokens',
    contractAction: 'transfer',
    contractPayload: {
      symbol,
      to,
      quantity: Number(quantity).toFixed(3),
      memo,
    },
  };

  dsteem.client.broadcast.json({
    required_auths: [config.TREASURY_ACCOUNT],
    required_posting_auths: [],
    id: config.SE_CHAIN_ID,
    json: JSON.stringify(json),
  }, dsteem.PrivateKey.fromString(config.ACTIVE_KEY))
    .then(() => {
      console.log(`REFUND: ${memo}`);
    })
    .catch((e) => console.log(e));
};

const vote = async (author, permlink, weight, retries = 0) => {
  try {
    await dsteem.client.broadcast.vote({
      voter: config.BOT_ACCOUNT,
      author,
      permlink,
      weight,
    }, dsteem.PrivateKey.from(config.POSTING_KEY))
      .then(() => {
        log(`Voted @${author}/${permlink} with ${weight / 100}% weight.`);
      })
      .catch((e) => {
        console.log(e);
        if (retries < 2) {
          setTimeout(() => { vote(author, permlink, weight, retries + 1); }, 10000);
        } else {
          log(`Voting failed three times for @${author}/${permlink}.`);
        }
      });
  } catch (e) {
    log(e.message);
  }
};

const calculateMaxBid = (accountData) => {
  let { MAX_BID } = config;
  if (config.MODE === 'percentage' && !config.MAX_BID) {
    MAX_BID = 100 / config.RATIO;
  }

  if (config.MODE === 'pegged' && !config.MAX_BID) {
    const vv = getVoteValue(accountData, getVPMana(accountData));

    MAX_BID = (vv / config.RATIO);
  }

  return MAX_BID;
};

const toFixed = (num, fixed) => {
  const re = new RegExp(`^-?\\d+(?:.\\d{0,${fixed || -1}})?`);
  return num.toString().match(re)[0];
};

module.exports = {
  calculateMaxBid,
  checkPost,
  getAuthorAndPermlink,
  getUsername,
  getDVMana,
  getVPMana,
  getVoteValue,
  loadWhitelist,
  log,
  refund,
  round,
  saveWhitelist,
  toFixed,
  vote,
  updateSteemVariables,
};
