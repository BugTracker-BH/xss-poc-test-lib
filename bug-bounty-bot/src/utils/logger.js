const { EmbedBuilder } = require('discord.js');

async function getModLogChannel(guild) {
  return guild.channels.cache.find(c => c.name === 'mod-logs');
}

async function getVerificationLogChannel(guild) {
  return guild.channels.cache.find(c => c.name === 'verification-logs');
}

async function logToModChannel(guild, embed) {
  const channel = await getModLogChannel(guild);
  if (channel) {
    try { await channel.send({ embeds: [embed] }); } catch { /* channel may not exist yet */ }
  }
}

function buildLogEmbed({ title, description, color, fields, footer, user }) {
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description || null)
    .setColor(color || '#3498DB')
    .setTimestamp();

  if (fields) {
    for (const f of fields) {
      embed.addFields({ name: f.name, value: f.value, inline: f.inline ?? true });
    }
  }
  if (footer) embed.setFooter({ text: footer });
  if (user) {
    embed.setAuthor({ name: user.tag || user.username, iconURL: user.displayAvatarURL() });
    embed.setFooter({ text: `User ID: ${user.id}` });
  }

  return embed;
}

module.exports = { logToModChannel, getModLogChannel, getVerificationLogChannel, buildLogEmbed };
