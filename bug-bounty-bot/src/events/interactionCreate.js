const { Events, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');
const { getVerificationLogChannel } = require('../utils/logger');
const { createTicket, closeTicket, getTicketByChannel } = require('../utils/database');
const { enterGiveaway, getGiveawayByMessage } = require('../utils/database');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (interaction.isChatInputCommand()) {
      return handleSlashCommand(interaction);
    }
    if (interaction.isButton()) {
      return handleButton(interaction);
    }
    if (interaction.isModalSubmit()) {
      return handleModal(interaction);
    }
  },
};

async function handleSlashCommand(interaction) {
  const command = interaction.client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error executing /${interaction.commandName}:`, error);
    const reply = { content: '❌ An error occurred while executing this command.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
}

async function handleButton(interaction) {
  const { customId } = interaction;

  if (customId === 'verify_member') {
    return handleVerify(interaction);
  }

  if (customId.startsWith('role_')) {
    return handleNotificationRole(interaction);
  }

  if (customId.startsWith('ticket_')) {
    return handleTicketCreate(interaction);
  }

  if (customId === 'ticket_close') {
    return handleTicketClose(interaction);
  }

  if (customId === 'giveaway_enter') {
    return handleGiveawayEntry(interaction);
  }
}

async function handleVerify(interaction) {
  const guild = interaction.guild;
  const member = interaction.member;

  const unverifiedRole = guild.roles.cache.find(r => r.name === 'Unverified');
  const verifiedRole = guild.roles.cache.find(r => r.name === 'Verified Member');

  if (!verifiedRole) {
    return interaction.reply({ content: '❌ Verified role not found. Contact an admin.', ephemeral: true });
  }

  if (member.roles.cache.has(verifiedRole.id)) {
    return interaction.reply({ content: '✅ You are already verified!', ephemeral: true });
  }

  try {
    if (unverifiedRole && member.roles.cache.has(unverifiedRole.id)) {
      await member.roles.remove(unverifiedRole, 'Verified');
    }
    await member.roles.add(verifiedRole, 'Member verified via button');
  } catch (error) {
    console.error('Verification role error:', error);
    return interaction.reply({ content: '❌ Failed to assign role. Contact an admin.', ephemeral: true });
  }

  await interaction.reply({ content: '✅ You have been verified! Welcome to the community.', ephemeral: true });

  const logChannel = await getVerificationLogChannel(guild);
  if (logChannel) {
    const embed = new EmbedBuilder()
      .setTitle('✅ Member Verified')
      .setDescription(`<@${member.id}> has been verified.`)
      .setColor('#2ECC71')
      .setThumbnail(member.user.displayAvatarURL())
      .setTimestamp()
      .setFooter({ text: `ID: ${member.id}` });

    await logChannel.send({ embeds: [embed] });
  }
}

async function handleNotificationRole(interaction) {
  const roleMap = {
    role_cve_alerts: 'CVE Alerts',
    role_ctf_events: 'CTF Events',
    role_giveaway_ping: 'Giveaway Pings',
  };

  const roleName = roleMap[interaction.customId];
  if (!roleName) return;

  let role = interaction.guild.roles.cache.find(r => r.name === roleName);
  if (!role) {
    role = await interaction.guild.roles.create({
      name: roleName,
      mentionable: true,
      reason: 'Notification role auto-created',
    });
  }

  const member = interaction.member;
  if (member.roles.cache.has(role.id)) {
    await member.roles.remove(role);
    return interaction.reply({ content: `🔕 Removed **${roleName}** notifications.`, ephemeral: true });
  }

  await member.roles.add(role);
  return interaction.reply({ content: `🔔 You will now receive **${roleName}** notifications.`, ephemeral: true });
}

async function handleTicketCreate(interaction) {
  const ticketType = interaction.customId === 'ticket_report' ? 'Report' : 'Support';

  const modal = new ModalBuilder()
    .setCustomId(`ticket_modal_${ticketType.toLowerCase()}`)
    .setTitle(`${ticketType} Ticket`);

  const subjectInput = new TextInputBuilder()
    .setCustomId('ticket_subject')
    .setLabel('Subject')
    .setPlaceholder(`Brief description of your ${ticketType.toLowerCase()}`)
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100);

  const detailsInput = new TextInputBuilder()
    .setCustomId('ticket_details')
    .setLabel('Details')
    .setPlaceholder('Provide as much detail as possible')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(2000);

  modal.addComponents(
    new ActionRowBuilder().addComponents(subjectInput),
    new ActionRowBuilder().addComponents(detailsInput),
  );

  await interaction.showModal(modal);
}

async function handleTicketClose(interaction) {
  const ticket = getTicketByChannel(interaction.channel.id);
  if (!ticket) {
    return interaction.reply({ content: '❌ This is not a ticket channel.', ephemeral: true });
  }

  await interaction.reply({ content: '🔒 Closing ticket and saving transcript...' });

  const messages = await interaction.channel.messages.fetch({ limit: 100 });
  const transcript = messages.reverse().map(m =>
    `[${m.createdAt.toISOString()}] ${m.author.tag}: ${m.content || '*embed/attachment*'}`
  ).join('\n');

  const transcriptChannel = interaction.guild.channels.cache.find(c => c.name === 'ticket-transcripts');
  if (transcriptChannel) {
    const embed = new EmbedBuilder()
      .setTitle(`📋 Ticket #${ticket.id} Transcript`)
      .setDescription(`**Type:** ${ticket.type}\n**Subject:** ${ticket.subject}\n**Opened by:** <@${ticket.user_id}>`)
      .setColor('#9B59B6')
      .setTimestamp();

    const transcriptText = transcript.length > 4000 ? transcript.slice(0, 4000) + '\n... (truncated)' : transcript;
    await transcriptChannel.send({
      embeds: [embed],
      content: `\`\`\`\n${transcriptText}\n\`\`\``,
    });
  }

  closeTicket(ticket.id);

  setTimeout(async () => {
    try { await interaction.channel.delete('Ticket closed'); } catch { /* ignore */ }
  }, 5000);
}

async function handleModal(interaction) {
  if (!interaction.customId.startsWith('ticket_modal_')) return;

  const ticketType = interaction.customId.replace('ticket_modal_', '');
  const subject = interaction.fields.getTextInputValue('ticket_subject');
  const details = interaction.fields.getTextInputValue('ticket_details');

  const guild = interaction.guild;
  const member = interaction.member;

  const adminRole = guild.roles.cache.find(r => r.name === 'Admin');
  const modRole = guild.roles.cache.find(r => r.name === 'Moderator');
  const modCategory = guild.channels.cache.find(
    c => c.type === ChannelType.GuildCategory && c.name.includes('MODERATION')
  );

  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
  ];
  if (adminRole) overwrites.push({ id: adminRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages] });
  if (modRole) overwrites.push({ id: modRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages] });

  const ticketChannel = await guild.channels.create({
    name: `ticket-${ticketType}-${member.user.username}`.slice(0, 100),
    type: ChannelType.GuildText,
    parent: modCategory || null,
    permissionOverwrites: overwrites,
    topic: `${ticketType} ticket by ${member.user.tag}: ${subject}`,
    reason: 'Ticket created',
  });

  const ticketId = createTicket(guild.id, ticketChannel.id, member.id, ticketType, subject);

  const embed = new EmbedBuilder()
    .setTitle(`🎫 Ticket #${ticketId} — ${ticketType}`)
    .setDescription(`**Subject:** ${subject}\n\n**Details:**\n${details}`)
    .addFields(
      { name: 'Opened by', value: `<@${member.id}>`, inline: true },
      { name: 'Type', value: ticketType, inline: true },
    )
    .setColor(ticketType === 'report' ? '#E74C3C' : '#3498DB')
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_close')
      .setLabel('🔒 Close Ticket')
      .setStyle(ButtonStyle.Danger),
  );

  await ticketChannel.send({ embeds: [embed], components: [row] });
  await ticketChannel.send(`<@${member.id}> — A moderator will be with you shortly.`);

  await interaction.reply({
    content: `✅ Your ticket has been created: <#${ticketChannel.id}>`,
    ephemeral: true,
  });
}

async function handleGiveawayEntry(interaction) {
  const giveaway = getGiveawayByMessage(interaction.message.id);
  if (!giveaway) {
    return interaction.reply({ content: '❌ This giveaway no longer exists.', ephemeral: true });
  }
  if (giveaway.ended) {
    return interaction.reply({ content: '❌ This giveaway has ended.', ephemeral: true });
  }

  const entered = enterGiveaway(giveaway.id, interaction.user.id);
  if (!entered) {
    return interaction.reply({ content: '⚠️ You have already entered this giveaway.', ephemeral: true });
  }

  return interaction.reply({ content: '🎉 You have entered the giveaway! Good luck!', ephemeral: true });
}
