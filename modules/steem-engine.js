const axios = require('axios');
const config = require('../config');

const send = async (request) => {
  const postData = {
    jsonrpc: '2.0',
    id: Date.now(),
    ...request,
  };

  return new Promise((resolve, reject) => {
    axios.post(config.SE_RPC, postData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      })
      .then((response) => {
        resolve(response.data.result);
      })
      .catch((error) => {
        reject(error);
      });
  });
};

const getBalance = async (account, symbol) => {
  const request = {
    method: 'findOne',
    params: {
      contract: 'tokens',
      table: 'balances',
      query: { account, symbol },
    },
  };

  return send(request);
};

module.exports = {
  getBalance,
};
