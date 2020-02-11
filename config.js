const dotenv = require('dotenv');

dotenv.config();

let SE_CHAIN_ID = 'ssc-mainnet1';
let SE_RPC = 'https://api.steem-engine.com/rpc2/contracts';
let SE_HISTORY = 'https://history.steem-engine.com/accountHistory';

if (process.env.NODE_ENV !== 'production') {
  SE_CHAIN_ID = 'ssc-00000000000000000002';
  SE_RPC = 'https://testapi.steem-engine.com/contracts';
  SE_HISTORY = 'https://testaccounts.steem-engine.com/history';
}

module.exports = {
  BOT_ACCOUNT: process.env.BOT_ACCOUNT || 'steemflagrewards',
  POSTING_KEY: process.env.POSTING_KEY,
  TREASURY_ACCOUNT: process.env.TREASURY_ACCOUNT || process.env.BOT_ACCOUNT,
  ACTIVE_KEY: process.env.ACTIVE_KEY,
  BOT_TOKEN: process.env.BOT_TOKEN,
  PREFIX: '$',
  // can be pegged or percentage
  MODE: 'pegged',
  // If mode is percentage, each token will give 1% upvote,
  // if set to pegged 1, 1 coin will give 1 SBD upvote
  RATIO: 2,
  MIN_VP: 8400,
  MIN_BID: 0.01,
  MIN_POST_AGE: 5, // In minutes (5 mins)
  MAX_POST_AGE: 144, // In hours (6 days)
  ALLOW_COMMENT: true,
  SE_COIN_SYMBOL: 'SFR',
  SE_CHAIN_ID,
  SE_RPC,
  SE_HISTORY,
  MEMOS: {
    bot_disabled: 'Refund for invalid bid: {amount} - The bot is currently disabled.',
    low_vp: 'Refund for invalid bid: {amount} - Our voting mana is below {vp}%.',
    below_min_bid: 'Refund for invalid bid: {amount} - Min bid amount is {min_bid}.',
    above_max_bid: 'Refund for invalid bid: {amount} - Max bid amount is {max_bid}.',
    no_comments: 'Refund for invalid bid: {amount} - Bids not allowed on comments.',
    already_voted: 'Refund for invalid bid: {amount} - Bot already voted on this post.',
    max_age: 'Refund for invalid bid: {amount} - Posts cannot be older than {max_age}.',
    min_age: 'Refund for invalid bid: {amount} - Posts cannot be less than {min_age} minutes old.',
    invalid_post_url: 'Refund for invalid bid: {amount} - Invalid post URL in memo.',
    not_whitelisted: 'Refund for invalid bid: {amount} - You are not whitelisted. Please contact SFR team.',
    partial_bid: 'Partial refund: - {amount} - You bid exceeded our max vote value.',
  },
  WHITELIST_MANAGER: ['Admin', 'Flag Rewards Admin', 'SFR Moderator'],
};
