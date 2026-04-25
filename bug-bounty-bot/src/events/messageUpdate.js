const { Events } = require('discord.js');
const { logToModChannel, buildLogEmbed } = require('../utils/logger');

module.exports = {
  name: Events.MessageUpdate,
  async execute(oldMessage, newMessage) {
    if (!newMessage.guild || newMessage.author?.bot) return;
    if (oldMessage.partial || newMessage.partial) return;
    if (oldMessage.content === newMessage.content) return;

    const embed = buildLogEmbed({
      title: '✏️ Message Edited',
      color: '#F1C40F',
      user: newMessage.author,
      fields: [
        { name: 'Channel', value: `<#${newMessage.channel.id}>`, inline: true },
        { name: 'Before', value: oldMessage.content?.slice(0, 1024) || '*empty*', inline: false },
        { name: 'After', value: newMessage.content?.slice(0, 1024) || '*empty*', inline: false },
      ],
    });

    await logToModChannel(newMessage.guild, embed);
  },
};
