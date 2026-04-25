const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder,
  ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { createGiveaway, getGiveawayEntries, endGiveaway, getGiveawayByMessage } = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Start a giveaway')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption(opt => opt.setName('prize').setDescription('The prize').setRequired(true))
    .addIntegerOption(opt => opt.setName('duration').setDescription('Duration in minutes').setRequired(true))
    .addIntegerOption(opt => opt.setName('winners').setDescription('Number of winners (default: 1)').setRequired(false)),

  async execute(interaction) {
    const prize = interaction.options.getString('prize');
    const duration = interaction.options.getInteger('duration');
    const winnersCount = interaction.options.getInteger('winners') || 1;
    const endsAt = Math.floor(Date.now() / 1000) + duration * 60;

    const embed = new EmbedBuilder()
      .setTitle('🎉 GIVEAWAY 🎉')
      .setDescription(
        `**Prize:** ${prize}\n` +
        `**Winners:** ${winnersCount}\n` +
        `**Ends:** <t:${endsAt}:R>\n` +
        `**Hosted by:** <@${interaction.user.id}>\n\n` +
        `Click the button below to enter!`
      )
      .setColor('#F1C40F')
      .setTimestamp(new Date(endsAt * 1000));

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('giveaway_enter')
        .setLabel('🎉 Enter Giveaway')
        .setStyle(ButtonStyle.Success),
    );

    const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

    createGiveaway(
      interaction.guild.id, interaction.channel.id, msg.id,
      interaction.user.id, prize, winnersCount, endsAt
    );

    setTimeout(async () => {
      await concludeGiveaway(interaction.guild, msg.id);
    }, duration * 60 * 1000);
  },
};

async function concludeGiveaway(guild, messageId) {
  const giveaway = getGiveawayByMessage(messageId);
  if (!giveaway || giveaway.ended) return;

  endGiveaway(giveaway.id);

  const entries = getGiveawayEntries(giveaway.id);
  const channel = guild.channels.cache.get(giveaway.channel_id);
  if (!channel) return;

  let message;
  try {
    message = await channel.messages.fetch(messageId);
  } catch { return; }

  if (entries.length === 0) {
    const embed = EmbedBuilder.from(message.embeds[0])
      .setDescription(`**Prize:** ${giveaway.prize}\n\n**No entries!** Nobody won the giveaway.`)
      .setColor('#95A5A6');
    await message.edit({ embeds: [embed], components: [] });
    return;
  }

  const shuffled = entries.sort(() => Math.random() - 0.5);
  const winners = shuffled.slice(0, giveaway.winners).map(e => `<@${e.user_id}>`);

  const embed = EmbedBuilder.from(message.embeds[0])
    .setDescription(
      `**Prize:** ${giveaway.prize}\n` +
      `**Winner${winners.length > 1 ? 's' : ''}:** ${winners.join(', ')}\n\n` +
      `**Entries:** ${entries.length}`
    )
    .setColor('#2ECC71');

  await message.edit({ embeds: [embed], components: [] });
  await channel.send(`🎉 Congratulations ${winners.join(', ')}! You won **${giveaway.prize}**!`);
}
