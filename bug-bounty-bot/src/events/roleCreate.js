const { Events } = require('discord.js');
const { logToModChannel, buildLogEmbed } = require('../utils/logger');
const { recordRoleCreate, triggerLockdown } = require('../utils/antiRaid');

module.exports = {
  name: Events.GuildRoleCreate,
  async execute(role) {
    if (recordRoleCreate(role.guild.id)) {
      await triggerLockdown(role.guild, 'Mass role creation detected (possible nuke)');
    }

    const embed = buildLogEmbed({
      title: '➕ Role Created',
      color: '#2ECC71',
      fields: [
        { name: 'Role', value: role.name, inline: true },
        { name: 'Color', value: role.hexColor, inline: true },
      ],
    });

    await logToModChannel(role.guild, embed);
  },
};
