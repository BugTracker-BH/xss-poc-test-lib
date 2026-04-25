module.exports = {
  serverName: 'Bug Bounty Underground',

  colors: {
    admin: '#E74C3C',
    moderator: '#9B59B6',
    coreResearcher: '#E67E22',
    verified: '#3498DB',
    unverified: '#95A5A6',
    bots: '#2ECC71',
    eliteHacker: '#F1C40F',
  },

  xp: {
    perMessage: { min: 15, max: 25 },
    cooldownMs: 60_000,
    milestones: [
      { level: 5, roleName: 'Active Researcher', color: '#1ABC9C' },
      { level: 10, roleName: 'Elite Hacker', color: '#F1C40F' },
      { level: 20, roleName: 'Legendary Hunter', color: '#E91E63' },
    ],
  },

  automod: {
    maxMentions: 5,
    scamPhrases: [
      'free nitro',
      'steam gift',
      'claim your prize',
      'click here to verify',
      'discord-gift',
      'discordapp.gift',
      'you have been selected',
      'airdrop claim',
    ],
    phishingDomains: [
      'discord-nitro.gift',
      'discorcl.com',
      'dlscord-app.com',
      'discordgift.site',
      'steamcommunlty.com',
    ],
  },

  antiRaid: {
    joinThreshold: 10,
    joinWindowMs: 10_000,
    channelDeleteThreshold: 3,
    channelDeleteWindowMs: 30_000,
    roleCreateThreshold: 5,
    roleCreateWindowMs: 30_000,
    lockdownDurationMs: 300_000,
  },

  roles: [
    { name: 'Admin', color: '#E74C3C', hoist: true, permissions: ['Administrator'] },
    { name: 'Moderator', color: '#9B59B6', hoist: true, permissions: [
      'ManageMessages', 'KickMembers', 'BanMembers', 'MuteMembers',
      'ManageChannels', 'ViewAuditLog', 'ManageNicknames', 'ModerateMembers',
    ]},
    { name: 'Core Researcher', color: '#E67E22', hoist: true, permissions: [] },
    { name: 'Verified Member', color: '#3498DB', hoist: false, permissions: [] },
    { name: 'Unverified', color: '#95A5A6', hoist: false, permissions: [] },
    { name: 'Bots', color: '#2ECC71', hoist: false, permissions: [
      'SendMessages', 'EmbedLinks', 'ReadMessageHistory', 'ManageMessages',
      'ManageRoles', 'ViewChannel',
    ]},
  ],

  categories: [
    {
      name: '📋 INFORMATION & RULES',
      channels: [
        { name: 'rules', topic: 'Server rules and legal disclaimer. Read before participating.', type: 'text' },
        { name: 'announcements', topic: 'Official announcements from the admin team.', type: 'text' },
        { name: 'server-info', topic: 'Bot commands, how-to guides, and notification pings.', type: 'text' },
        { name: 'welcome', topic: 'Welcome! Click the Verify button below to gain access.', type: 'text' },
        { name: 'verification-logs', topic: 'Automated log of member verifications.', type: 'text' },
      ],
      visibility: 'unverified',
    },
    {
      name: '💬 COMMUNITY',
      channels: [
        { name: 'general-chat', topic: 'General discussion for verified members.', type: 'text' },
        { name: 'off-topic', topic: 'Anything goes (within reason).', type: 'text' },
        { name: 'memes', topic: 'Security memes and humor.', type: 'text' },
        { name: 'introductions', topic: 'Introduce yourself to the community.', type: 'text' },
      ],
      visibility: 'verified',
    },
    {
      name: '🐛 BUG BOUNTY & VULN RESEARCH',
      channels: [
        { name: 'discovery-sharing', topic: 'Share your latest findings and discoveries.', type: 'text' },
        { name: 'bug-bounty-programs', topic: 'Discuss active bug bounty programs.', type: 'text' },
        { name: 'cve-news', topic: 'Latest CVE announcements and analysis.', type: 'text' },
        { name: 'recon-discussion', topic: 'Reconnaissance methodology and techniques.', type: 'text' },
      ],
      visibility: 'verified',
    },
    {
      name: '💥 EXPLOIT DEVELOPMENT & PoC',
      channels: [
        { name: 'poc-showcase', topic: 'Share proof-of-concept demonstrations.', type: 'text' },
        { name: 'exploit-dev-general', topic: 'General exploit development discussion.', type: 'text' },
        { name: 'web-exploitation', topic: 'Web application security and exploitation.', type: 'text' },
        { name: 'binary-exploitation', topic: 'Binary exploitation, RE, and pwn.', type: 'text' },
        { name: 'mobile-and-iot', topic: 'Mobile and IoT security research.', type: 'text' },
        { name: 'cloud-and-kubernetes', topic: 'Cloud infrastructure and Kubernetes security.', type: 'text' },
      ],
      visibility: 'verified',
    },
    {
      name: '📚 TOOLS, RESOURCES & WRITEUPS',
      channels: [
        { name: 'tools', topic: 'Security tools, frameworks, and utilities.', type: 'text' },
        { name: 'writeups', topic: 'Bug bounty and CTF writeups.', type: 'text' },
        { name: 'cheatsheets', topic: 'Quick-reference cheatsheets.', type: 'text' },
        { name: 'learning-resources', topic: 'Courses, books, and learning materials.', type: 'text' },
      ],
      visibility: 'verified',
    },
    {
      name: '🔒 PRIVATE RESEARCH LABS',
      channels: [
        { name: 'trusted-research', topic: 'Trusted researcher collaboration space.', type: 'text' },
        { name: 'zero-day-coordination', topic: 'Coordinated vulnerability disclosure.', type: 'text' },
        { name: 'exploit-refinement', topic: 'Refining and improving exploit techniques.', type: 'text' },
      ],
      visibility: 'researcher',
    },
    {
      name: '🔊 VOICE CHANNELS',
      channels: [
        { name: '🔊 General Voice', type: 'voice', visibility: 'verified' },
        { name: '🔊 Research Collab', type: 'voice', visibility: 'verified' },
        { name: '🔊 CTF War Room', type: 'voice', visibility: 'verified' },
        { name: '🔊 Private Researcher VC', type: 'voice', visibility: 'researcher' },
      ],
      visibility: 'verified',
    },
    {
      name: '🛡️ MODERATION & TICKETS',
      channels: [
        { name: 'mod-chat', topic: 'Private staff discussion.', type: 'text' },
        { name: 'mod-logs', topic: 'Automated moderation and server logs.', type: 'text' },
        { name: 'ticket-transcripts', topic: 'Auto-saved transcripts of closed tickets.', type: 'text' },
        { name: 'create-ticket', topic: 'Click a button below to open a support or report ticket.', type: 'text' },
      ],
      visibility: 'mod',
    },
  ],
};
