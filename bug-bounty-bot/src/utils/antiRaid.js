const config = require('../config');
const { logToModChannel, buildLogEmbed } = require('./logger');

const joinTimestamps = new Map();
const channelDeleteTimestamps = new Map();
const roleCreateTimestamps = new Map();

function recordJoin(guildId) {
  const now = Date.now();
  if (!joinTimestamps.has(guildId)) joinTimestamps.set(guildId, []);
  const timestamps = joinTimestamps.get(guildId);
  timestamps.push(now);

  const cutoff = now - config.antiRaid.joinWindowMs;
  const recent = timestamps.filter(t => t > cutoff);
  joinTimestamps.set(guildId, recent);

  return recent.length >= config.antiRaid.joinThreshold;
}

function recordChannelDelete(guildId) {
  const now = Date.now();
  if (!channelDeleteTimestamps.has(guildId)) channelDeleteTimestamps.set(guildId, []);
  const timestamps = channelDeleteTimestamps.get(guildId);
  timestamps.push(now);

  const cutoff = now - config.antiRaid.channelDeleteWindowMs;
  const recent = timestamps.filter(t => t > cutoff);
  channelDeleteTimestamps.set(guildId, recent);

  return recent.length >= config.antiRaid.channelDeleteThreshold;
}

function recordRoleCreate(guildId) {
  const now = Date.now();
  if (!roleCreateTimestamps.has(guildId)) roleCreateTimestamps.set(guildId, []);
  const timestamps = roleCreateTimestamps.get(guildId);
  timestamps.push(now);

  const cutoff = now - config.antiRaid.roleCreateWindowMs;
  const recent = timestamps.filter(t => t > cutoff);
  roleCreateTimestamps.set(guildId, recent);

  return recent.length >= config.antiRaid.roleCreateThreshold;
}

async function triggerLockdown(guild, reason) {
  const state = guild.client.antiRaidState;
  if (state.get(guild.id)) return;
  state.set(guild.id, true);

  const embed = buildLogEmbed({
    title: '🚨 ANTI-RAID LOCKDOWN ACTIVATED',
    description: `**Reason:** ${reason}\n\nServer has been locked down for ${config.antiRaid.lockdownDurationMs / 1000}s. ` +
      'All channels have been restricted. Admins: review audit log immediately.',
    color: '#E74C3C',
  });

  await logToModChannel(guild, embed);

  for (const [, channel] of guild.channels.cache) {
    try {
      await channel.permissionOverwrites.edit(guild.roles.everyone, {
        SendMessages: false,
        Connect: false,
      });
    } catch { /* skip */ }
  }

  setTimeout(async () => {
    state.set(guild.id, false);
    const unlockEmbed = buildLogEmbed({
      title: '✅ Lockdown Lifted',
      description: 'Automatic lockdown has been lifted. Please review the situation and re-run `/setup` if channels were damaged.',
      color: '#2ECC71',
    });
    await logToModChannel(guild, unlockEmbed);

    for (const [, channel] of guild.channels.cache) {
      try {
        await channel.permissionOverwrites.edit(guild.roles.everyone, {
          SendMessages: null,
          Connect: null,
        });
      } catch { /* skip */ }
    }
  }, config.antiRaid.lockdownDurationMs);
}

module.exports = { recordJoin, recordChannelDelete, recordRoleCreate, triggerLockdown };
