const config = require('../config');
const { logToModChannel, buildLogEmbed } = require('./logger');

function containsScam(content) {
  const lower = content.toLowerCase();
  return config.automod.scamPhrases.some(phrase => lower.includes(phrase));
}

function containsPhishing(content) {
  const lower = content.toLowerCase();
  return config.automod.phishingDomains.some(domain => lower.includes(domain));
}

function hasExcessiveMentions(message) {
  return message.mentions.users.size + message.mentions.roles.size >= config.automod.maxMentions;
}

async function checkMessage(message) {
  if (message.author.bot) return false;
  if (message.member?.permissions?.has('ManageMessages')) return false;

  const content = message.content;

  if (containsPhishing(content)) {
    await handleViolation(message, 'Phishing link detected');
    return true;
  }

  if (containsScam(content)) {
    await handleViolation(message, 'Scam phrase detected');
    return true;
  }

  if (hasExcessiveMentions(message)) {
    await handleViolation(message, 'Excessive mentions');
    return true;
  }

  return false;
}

async function handleViolation(message, reason) {
  try {
    await message.delete();
  } catch { /* may already be deleted */ }

  try {
    await message.author.send(
      `⚠️ Your message in **${message.guild.name}** was removed.\n**Reason:** ${reason}\n` +
      'Repeated violations may result in a mute or ban.'
    );
  } catch { /* DMs may be disabled */ }

  try {
    const member = message.member || await message.guild.members.fetch(message.author.id);
    await member.timeout(5 * 60 * 1000, `Auto-mod: ${reason}`);
  } catch { /* may lack permissions */ }

  const embed = buildLogEmbed({
    title: '🚨 Auto-Moderation Action',
    color: '#E74C3C',
    user: message.author,
    fields: [
      { name: 'Reason', value: reason },
      { name: 'Channel', value: `<#${message.channel.id}>` },
      { name: 'Content', value: message.content.slice(0, 1024) || '*empty*' },
      { name: 'Action', value: '5-minute timeout + message deleted' },
    ],
  });

  await logToModChannel(message.guild, embed);
}

module.exports = { checkMessage };
