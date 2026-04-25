const { Events } = require('discord.js');
const { logToModChannel, buildLogEmbed } = require('../utils/logger');

module.exports = {
  name: Events.MessageDelete,
  async execute(message) {
    if (!message.guild || message.author?.bot) return;
    if (message.partial) return;

    const embed = buildLogEmbed({
      title: '🗑️ Message Deleted',
      color: '#E74C3C',
      user: message.author,
      fields: [
        { name: 'Channel', value: `<#${message.channel.id}>`, inline: true },
        { name: 'Content', value: message.content?.slice(0, 1024) || '*No text content*', inline: false },
      ],
    });

    await logToModChannel(message.guild, embed);
  },
};
