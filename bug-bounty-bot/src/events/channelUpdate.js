const { Events } = require('discord.js');
const { logToModChannel, buildLogEmbed } = require('../utils/logger');

module.exports = {
  name: Events.ChannelUpdate,
  async execute(oldChannel, newChannel) {
    if (!newChannel.guild) return;
    if (oldChannel.name === newChannel.name && oldChannel.topic === newChannel.topic) return;

    const fields = [];
    if (oldChannel.name !== newChannel.name) {
      fields.push({ name: 'Name Changed', value: `\`${oldChannel.name}\` → \`${newChannel.name}\`` });
    }
    if (oldChannel.topic !== newChannel.topic) {
      fields.push({ name: 'Topic Changed', value: `\`${oldChannel.topic || 'None'}\` → \`${newChannel.topic || 'None'}\`` });
    }

    const embed = buildLogEmbed({
      title: '📝 Channel Updated',
      color: '#F1C40F',
      fields,
    });

    await logToModChannel(newChannel.guild, embed);
  },
};
