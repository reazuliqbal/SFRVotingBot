const { stripIndents } = require('common-tags');
const config = require('../config');

module.exports = {
  name: 'help',
  description: 'List all of my commands or info about a specific command.',
  aliases: ['commands'],
  usage: '',
  ignore: true,
  execute(message) {
    let { commands } = message.client;

    commands = commands.filter((c) => !c.ignore);

    const data = [];

    commands.forEach((c) => {
      data.push(stripIndents`
      \`${config.PREFIX}${c.name} ${c.usage}\`
      ${c.description}
      `);
    });

    message.channel.send(data.join('\n\n'), { split: true });
  },
};
