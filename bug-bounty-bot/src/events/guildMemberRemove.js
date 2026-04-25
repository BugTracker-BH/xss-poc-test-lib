const { Events, EmbedBuilder } = require('discord.js');
const { logToModChannel, buildLogEmbed } = require('../utils/logger');

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    const embed = buildLogEmbed({
      title: '📤 Member Left',
      description: `**${member.user.tag}** left the server.`,
      color: '#E74C3C',
      user: member.user,
      fields: [
        { name: 'Roles', value: member.roles.cache.filter(r => r.name !== '@everyone').map(r => r.name).join(', ') || 'None' },
        { name: 'Member Count', value: `${member.guild.memberCount}` },
      ],
    });

    await logToModChannel(member.guild, embed);
  },
};
