const { Events, EmbedBuilder } = require('discord.js');
const { recordJoin } = require('../utils/antiRaid');
const { triggerLockdown } = require('../utils/antiRaid');
const { getVerificationLogChannel } = require('../utils/logger');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    if (recordJoin(member.guild.id)) {
      await triggerLockdown(member.guild, 'Mass join detected (possible raid)');
    }

    const unverifiedRole = member.guild.roles.cache.find(r => r.name === 'Unverified');
    if (unverifiedRole) {
      try { await member.roles.add(unverifiedRole, 'Auto-assign on join'); } catch { /* ignore */ }
    }

    try {
      await member.send(
        `👋 Welcome to **Bug Bounty Underground**!\n\n` +
        `To access the server, head to the **#welcome** channel and click the **Verify** button.\n\n` +
        `Make sure to read the **#rules** channel before participating. ` +
        `All activities must be ethical and legal. Happy hacking! 🛡️`
      );
    } catch { /* DMs disabled */ }

    const logChannel = await getVerificationLogChannel(member.guild);
    if (logChannel) {
      const embed = new EmbedBuilder()
        .setTitle('📥 Member Joined')
        .setDescription(`<@${member.id}> joined the server.`)
        .addFields(
          { name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
          { name: 'Member Count', value: `${member.guild.memberCount}`, inline: true },
        )
        .setColor('#2ECC71')
        .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp()
        .setFooter({ text: `ID: ${member.id}` });

      await logChannel.send({ embeds: [embed] });
    }
  },
};
