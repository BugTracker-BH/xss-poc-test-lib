const { Events } = require('discord.js');
const { logToModChannel, buildLogEmbed } = require('../utils/logger');
const { recordChannelDelete, triggerLockdown } = require('../utils/antiRaid');

module.exports = {
  name: Events.ChannelDelete,
  async execute(channel) {
    if (!channel.guild) return;

    if (recordChannelDelete(channel.guild.id)) {
      await triggerLockdown(channel.guild, 'Mass channel deletion detected (possible nuke)');
    }

    const embed = buildLogEmbed({
      title: '📛 Channel Deleted',
      color: '#E74C3C',
      fields: [
        { name: 'Channel', value: `#${channel.name}`, inline: true },
        { name: 'Type', value: `${channel.type}`, inline: true },
      ],
    });

    await logToModChannel(channel.guild, embed);
  },
};
