const { Events } = require('discord.js');
const { logToModChannel, buildLogEmbed } = require('../utils/logger');

module.exports = {
  name: Events.GuildBanAdd,
  async execute(ban) {
    const embed = buildLogEmbed({
      title: '🔨 Member Banned',
      color: '#E74C3C',
      user: ban.user,
      fields: [
        { name: 'Reason', value: ban.reason || 'No reason provided' },
      ],
    });

    await logToModChannel(ban.guild, embed);
  },
};
