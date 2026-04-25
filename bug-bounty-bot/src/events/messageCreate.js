const { Events } = require('discord.js');
const { checkMessage } = require('../utils/automod');
const { addXp, getXp, setLevel, xpForLevel } = require('../utils/database');
const config = require('../config');

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot || !message.guild) return;

    const flagged = await checkMessage(message);
    if (flagged) return;

    const verifiedRole = message.guild.roles.cache.find(r => r.name === 'Verified Member');
    if (!verifiedRole || !message.member?.roles.cache.has(verifiedRole.id)) return;

    const userData = getXp(message.author.id, message.guild.id);
    const cooldownMs = config.xp.perMessage ? config.xp.cooldownMs : 60_000;

    if (Date.now() - userData.last_xp_at < cooldownMs) return;

    const xpGain = Math.floor(
      Math.random() * (config.xp.perMessage.max - config.xp.perMessage.min + 1) + config.xp.perMessage.min
    );

    const updated = addXp(message.author.id, message.guild.id, xpGain);
    const currentLevel = updated.level;
    const xpNeeded = xpForLevel(currentLevel);

    if (updated.xp >= xpNeeded) {
      const newLevel = currentLevel + 1;
      setLevel(message.author.id, message.guild.id, newLevel);

      const generalChat = message.guild.channels.cache.find(c => c.name === 'general-chat');
      if (generalChat) {
        await generalChat.send(
          `🎉 <@${message.author.id}> has reached **Level ${newLevel}**! Keep it up!`
        );
      }

      for (const milestone of config.xp.milestones) {
        if (newLevel === milestone.level) {
          let role = message.guild.roles.cache.find(r => r.name === milestone.roleName);
          if (role) {
            try {
              await message.member.roles.add(role, `XP milestone: Level ${newLevel}`);
              if (generalChat) {
                await generalChat.send(
                  `🏆 <@${message.author.id}> has earned the **${milestone.roleName}** role!`
                );
              }
            } catch { /* ignore */ }
          }
        }
      }
    }
  },
};
