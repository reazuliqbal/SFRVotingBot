# SFR Voting Bot

The voting bot we use at Steem Flag Rewards (SFR). This bot takes SFR token from whitelisted users and votes the content sent in memo.

The bot can be modified to take any Steem Engine tokens. User can send tokens for upvote from the bot account. It also has a discord bot using which users can check their token balance, bot's stats, send token to the bot, and mods can whitelist or unlist users.

### Installation

- Rename `whitelist.example` to `whitelist.json` and `example.env` to `.env`.
- Fill our necessary credentials in `.env`.
- Make necessary changes in `config.js`. All the properties there is pretty much self-explanatory.
- Start the bot `node app.js` or using PM2.
