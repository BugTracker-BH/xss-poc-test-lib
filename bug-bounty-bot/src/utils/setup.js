const {
  ChannelType, PermissionFlagsBits, ActionRowBuilder,
  ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionsBitField,
} = require('discord.js');
const config = require('../config');
const { markSetupComplete } = require('./database');

const PERM = PermissionFlagsBits;

async function setupServer(guild, statusCallback) {
  const log = statusCallback || (() => {});

  await log('Renaming server...');
  await guild.setName(config.serverName);

  await log('Creating roles...');
  const roles = await createRoles(guild);

  await log('Deleting existing channels...');
  const existingChannels = guild.channels.cache.filter(c => c.deletable);
  for (const [, ch] of existingChannels) {
    try { await ch.delete('Server setup'); } catch { /* skip undeletable */ }
  }

  await log('Creating categories and channels...');
  const channelMap = await createChannelsAndCategories(guild, roles);

  await log('Posting welcome verification message...');
  await postWelcomeMessage(channelMap.get('welcome'), roles);

  await log('Posting rules...');
  await postRulesMessage(channelMap.get('rules'));

  await log('Posting server info and ticket button...');
  await postServerInfoMessage(channelMap.get('server-info'));
  await postTicketMessage(channelMap.get('create-ticket'));

  await log('Configuring @everyone role...');
  await guild.roles.everyone.setPermissions([
    PERM.ViewChannel, PERM.ReadMessageHistory,
  ]);

  await log('Assigning bot role...');
  const botMembers = guild.members.cache.filter(m => m.user.bot);
  const botRole = roles.get('Bots');
  for (const [, member] of botMembers) {
    try { await member.roles.add(botRole); } catch { /* ignore */ }
  }

  markSetupComplete(guild.id);
  await log('Setup complete!');

  return { roles, channelMap };
}

async function createRoles(guild) {
  const roleMap = new Map();

  for (const existing of guild.roles.cache.values()) {
    if (existing.name !== '@everyone' && existing.managed === false && existing.deletable) {
      try { await existing.delete('Server setup cleanup'); } catch { /* skip */ }
    }
  }

  for (const roleDef of [...config.roles].reverse()) {
    const permissions = new PermissionsBitField();
    for (const perm of roleDef.permissions) {
      if (PERM[perm]) permissions.add(PERM[perm]);
    }

    const role = await guild.roles.create({
      name: roleDef.name,
      color: roleDef.color,
      hoist: roleDef.hoist,
      permissions: permissions,
      reason: 'Server setup',
    });
    roleMap.set(roleDef.name, role);
  }

  for (const milestone of config.xp.milestones) {
    const role = await guild.roles.create({
      name: milestone.roleName,
      color: milestone.color,
      hoist: false,
      reason: 'XP milestone role',
    });
    roleMap.set(milestone.roleName, role);
  }

  return roleMap;
}

function buildOverwrites(guild, roles, visibility, channelOverride) {
  const effectiveVis = channelOverride || visibility;
  const adminRole = roles.get('Admin');
  const modRole = roles.get('Moderator');
  const coreRole = roles.get('Core Researcher');
  const verifiedRole = roles.get('Verified Member');
  const unverifiedRole = roles.get('Unverified');
  const botRole = roles.get('Bots');

  const base = [
    { id: botRole.id, allow: [PERM.ViewChannel, PERM.SendMessages, PERM.EmbedLinks, PERM.ManageMessages, PERM.ReadMessageHistory] },
    { id: adminRole.id, allow: [PERM.ViewChannel, PERM.SendMessages, PERM.ManageChannels, PERM.ManageMessages, PERM.ReadMessageHistory] },
    { id: modRole.id, allow: [PERM.ViewChannel, PERM.SendMessages, PERM.ManageMessages, PERM.ReadMessageHistory] },
  ];

  switch (effectiveVis) {
    case 'unverified':
      return [
        ...base,
        { id: guild.roles.everyone.id, deny: [PERM.SendMessages], allow: [PERM.ViewChannel, PERM.ReadMessageHistory] },
        { id: unverifiedRole.id, allow: [PERM.ViewChannel, PERM.ReadMessageHistory], deny: [PERM.SendMessages] },
        { id: verifiedRole.id, allow: [PERM.ViewChannel, PERM.ReadMessageHistory], deny: [PERM.SendMessages] },
        { id: coreRole.id, allow: [PERM.ViewChannel, PERM.ReadMessageHistory] },
      ];

    case 'verified':
      return [
        ...base,
        { id: guild.roles.everyone.id, deny: [PERM.ViewChannel] },
        { id: unverifiedRole.id, deny: [PERM.ViewChannel] },
        { id: verifiedRole.id, allow: [PERM.ViewChannel, PERM.SendMessages, PERM.ReadMessageHistory, PERM.AddReactions, PERM.AttachFiles, PERM.Connect, PERM.Speak] },
        { id: coreRole.id, allow: [PERM.ViewChannel, PERM.SendMessages, PERM.ReadMessageHistory, PERM.Connect, PERM.Speak] },
      ];

    case 'researcher':
      return [
        ...base,
        { id: guild.roles.everyone.id, deny: [PERM.ViewChannel] },
        { id: unverifiedRole.id, deny: [PERM.ViewChannel] },
        { id: verifiedRole.id, deny: [PERM.ViewChannel] },
        { id: coreRole.id, allow: [PERM.ViewChannel, PERM.SendMessages, PERM.ReadMessageHistory, PERM.Connect, PERM.Speak] },
      ];

    case 'mod':
      return [
        ...base,
        { id: guild.roles.everyone.id, deny: [PERM.ViewChannel] },
        { id: unverifiedRole.id, deny: [PERM.ViewChannel] },
        { id: verifiedRole.id, deny: [PERM.ViewChannel] },
        { id: coreRole.id, deny: [PERM.ViewChannel] },
      ];

    default:
      return base;
  }
}

async function createChannelsAndCategories(guild, roles) {
  const channelMap = new Map();

  for (const catDef of config.categories) {
    const category = await guild.channels.create({
      name: catDef.name,
      type: ChannelType.GuildCategory,
      permissionOverwrites: buildOverwrites(guild, roles, catDef.visibility),
      reason: 'Server setup',
    });

    for (const chDef of catDef.channels) {
      const isVoice = chDef.type === 'voice';
      const channelVisibility = chDef.visibility || catDef.visibility;
      const overwrites = buildOverwrites(guild, roles, channelVisibility, chDef.visibility);

      let extraOverwrites = [];
      if (chDef.name === 'announcements') {
        extraOverwrites = [
          { id: roles.get('Verified Member').id, allow: [PERM.ViewChannel, PERM.ReadMessageHistory], deny: [PERM.SendMessages] },
          { id: roles.get('Unverified').id, allow: [PERM.ViewChannel, PERM.ReadMessageHistory], deny: [PERM.SendMessages] },
        ];
      }
      if (chDef.name === 'verification-logs') {
        extraOverwrites = [
          { id: guild.roles.everyone.id, allow: [PERM.ViewChannel, PERM.ReadMessageHistory], deny: [PERM.SendMessages] },
        ];
      }
      if (chDef.name === 'create-ticket') {
        extraOverwrites = [
          { id: roles.get('Verified Member').id, allow: [PERM.ViewChannel, PERM.ReadMessageHistory], deny: [PERM.SendMessages] },
        ];
      }

      const mergedOverwrites = [...overwrites, ...extraOverwrites];

      const channel = await guild.channels.create({
        name: chDef.name,
        type: isVoice ? ChannelType.GuildVoice : ChannelType.GuildText,
        parent: category,
        topic: chDef.topic || null,
        permissionOverwrites: mergedOverwrites,
        reason: 'Server setup',
      });

      channelMap.set(chDef.name, channel);
    }
  }

  return channelMap;
}

async function postWelcomeMessage(channel) {
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle('🛡️ Welcome to Bug Bounty Underground')
    .setDescription(
      'Welcome, researcher! This is a professional cybersecurity and bug bounty community.\n\n' +
      '**To gain access to the server, click the Verify button below.**\n\n' +
      'By verifying, you agree to our server rules and acknowledge that all activities ' +
      'must be conducted ethically and legally.\n\n' +
      '⚠️ **Disclaimer:** This server is for educational and authorized security research only. ' +
      'Any illegal activity will result in an immediate ban and may be reported to authorities.'
    )
    .setColor('#3498DB')
    .setFooter({ text: 'Bug Bounty Underground • Verification' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('verify_member')
      .setLabel('✅ Verify')
      .setStyle(ButtonStyle.Success),
  );

  await channel.send({ embeds: [embed], components: [row] });
}

async function postRulesMessage(channel) {
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle('📜 Server Rules & Legal Disclaimer')
    .setDescription(
      '**1.** All research and discussion must be ethical and legal. Only authorized testing is permitted.\n' +
      '**2.** No sharing of stolen data, credentials, or personally identifiable information.\n' +
      '**3.** No distribution of malware intended to cause harm to unauthorized targets.\n' +
      '**4.** Respect all members. Harassment, hate speech, and toxicity are not tolerated.\n' +
      '**5.** No spam, self-promotion, or phishing links.\n' +
      '**6.** Keep discussions in the appropriate channels.\n' +
      '**7.** Follow responsible disclosure practices at all times.\n' +
      '**8.** Do not share active zero-days outside of the Private Research Labs without coordination.\n' +
      '**9.** Moderator decisions are final. Appeal via the ticket system.\n' +
      '**10.** Violations may result in mute, kick, or permanent ban.\n\n' +
      '⚖️ **Legal Disclaimer:** This server is an educational community for authorized security research. ' +
      'The server owners and moderators are not responsible for any actions taken by members. ' +
      'All members are individually responsible for ensuring their activities comply with applicable laws. ' +
      'By participating, you agree to these terms.'
    )
    .setColor('#E74C3C')
    .setFooter({ text: 'Bug Bounty Underground • Rules' })
    .setTimestamp();

  await channel.send({ embeds: [embed] });
}

async function postServerInfoMessage(channel) {
  if (!channel) return;

  const infoEmbed = new EmbedBuilder()
    .setTitle('ℹ️ Server Information & Commands')
    .setDescription(
      '**Available Commands:**\n' +
      '`/rank` — View your XP rank and level\n' +
      '`/leaderboard` — See the top members by XP\n' +
      '`/poll` — Create a poll (Admin/Mod)\n' +
      '`/giveaway` — Start a giveaway (Admin/Mod)\n' +
      '`/ticket` — Open a support or report ticket\n' +
      '`/setup` — Run server setup (Admin only)\n\n' +
      '**How XP Works:**\n' +
      'You earn 15-25 XP per message (1 min cooldown). Level up to earn special roles!\n' +
      '• Level 5: Active Researcher\n' +
      '• Level 10: Elite Hacker\n' +
      '• Level 20: Legendary Hunter'
    )
    .setColor('#3498DB')
    .setFooter({ text: 'Bug Bounty Underground' })
    .setTimestamp();

  const pingEmbed = new EmbedBuilder()
    .setTitle('🔔 Notification Roles')
    .setDescription(
      'Click the buttons below to opt-in to notification pings:\n\n' +
      '🔴 **CVE Alerts** — Get pinged for critical CVE announcements\n' +
      '🟡 **CTF Events** — Get pinged for CTF competitions and events\n' +
      '🟢 **Giveaways** — Get pinged for server giveaways'
    )
    .setColor('#F1C40F');

  const notifRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('role_cve_alerts').setLabel('🔴 CVE Alerts').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('role_ctf_events').setLabel('🟡 CTF Events').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('role_giveaway_ping').setLabel('🟢 Giveaways').setStyle(ButtonStyle.Success),
  );

  await channel.send({ embeds: [infoEmbed] });
  await channel.send({ embeds: [pingEmbed], components: [notifRow] });
}

async function postTicketMessage(channel) {
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle('🎫 Create a Ticket')
    .setDescription(
      'Need help or want to report something? Click a button below to open a private ticket.\n\n' +
      '🔴 **Report** — Report a rule violation, suspicious activity, or security concern\n' +
      '🔵 **Support** — General support, questions, or role requests'
    )
    .setColor('#9B59B6')
    .setFooter({ text: 'Bug Bounty Underground • Tickets' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_report').setLabel('🔴 Report').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('ticket_support').setLabel('🔵 Support').setStyle(ButtonStyle.Primary),
  );

  await channel.send({ embeds: [embed], components: [row] });
}

module.exports = { setupServer };
