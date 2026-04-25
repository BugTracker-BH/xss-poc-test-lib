const { Events } = require('discord.js');
const { logToModChannel, buildLogEmbed } = require('../utils/logger');

module.exports = {
  name: Events.GuildMemberUpdate,
  async execute(oldMember, newMember) {
    const oldRoles = oldMember.roles.cache;
    const newRoles = newMember.roles.cache;

    const added = newRoles.filter(r => !oldRoles.has(r.id));
    const removed = oldRoles.filter(r => !newRoles.has(r.id));

    if (added.size === 0 && removed.size === 0) return;

    const fields = [];
    if (added.size > 0) fields.push({ name: 'Roles Added', value: added.map(r => r.name).join(', ') });
    if (removed.size > 0) fields.push({ name: 'Roles Removed', value: removed.map(r => r.name).join(', ') });

    const embed = buildLogEmbed({
      title: '🔄 Member Roles Updated',
      color: '#9B59B6',
      user: newMember.user,
      fields,
    });

    await logToModChannel(newMember.guild, embed);
  },
};
