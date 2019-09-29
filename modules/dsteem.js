const {
  Client, PrivateKey, Asset, getVests, getVestingSharePrice,
} = require('dsteem');

const client = new Client('https://anyx.io');

module.exports = {
  client,
  PrivateKey,
  Asset,
  getVests,
  getVestingSharePrice,
};
