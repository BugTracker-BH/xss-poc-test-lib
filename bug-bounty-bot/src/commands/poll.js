const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder,
  ButtonStyle, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create a poll')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption(opt => opt.setName('question').setDescription('The poll question').setRequired(true))
    .addStringOption(opt => opt.setName('option1').setDescription('Option 1').setRequired(true))
    .addStringOption(opt => opt.setName('option2').setDescription('Option 2').setRequired(true))
    .addStringOption(opt => opt.setName('option3').setDescription('Option 3').setRequired(false))
    .addStringOption(opt => opt.setName('option4').setDescription('Option 4').setRequired(false))
    .addStringOption(opt => opt.setName('option5').setDescription('Option 5').setRequired(false))
    .addIntegerOption(opt => opt.setName('duration').setDescription('Duration in minutes (default: 60)').setRequired(false)),

  async execute(interaction) {
    const question = interaction.options.getString('question');
    const duration = interaction.options.getInteger('duration') || 60;

    const options = [];
    for (let i = 1; i <= 5; i++) {
      const opt = interaction.options.getString(`option${i}`);
      if (opt) options.push(opt);
    }

    const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];
    const votes = new Map();
    options.forEach((_, i) => votes.set(i, new Set()));

    const description = options.map((opt, i) => `${emojis[i]} **${opt}** — 0 votes`).join('\n');
    const endsAt = Math.floor(Date.now() / 1000) + duration * 60;

    const embed = new EmbedBuilder()
      .setTitle(`📊 Poll: ${question}`)
      .setDescription(description)
      .setColor('#3498DB')
      .setFooter({ text: `Ends at` })
      .setTimestamp(new Date(endsAt * 1000));

    const rows = [];
    const buttons = options.map((opt, i) =>
      new ButtonBuilder()
        .setCustomId(`poll_vote_${i}`)
        .setLabel(opt.slice(0, 80))
        .setEmoji(emojis[i])
        .setStyle(ButtonStyle.Secondary)
    );

    for (let i = 0; i < buttons.length; i += 5) {
      rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
    }

    const msg = await interaction.reply({ embeds: [embed], components: rows, fetchReply: true });

    const collector = msg.createMessageComponentCollector({
      time: duration * 60 * 1000,
    });

    collector.on('collect', async (btnInteraction) => {
      if (!btnInteraction.customId.startsWith('poll_vote_')) return;

      const optionIndex = parseInt(btnInteraction.customId.replace('poll_vote_', ''));
      const userId = btnInteraction.user.id;

      for (const [, voterSet] of votes) {
        voterSet.delete(userId);
      }
      votes.get(optionIndex).add(userId);

      const updatedDesc = options.map((opt, i) => {
        const count = votes.get(i).size;
        return `${emojis[i]} **${opt}** — ${count} vote${count !== 1 ? 's' : ''}`;
      }).join('\n');

      const updatedEmbed = EmbedBuilder.from(msg.embeds[0]).setDescription(updatedDesc);

      await msg.edit({ embeds: [updatedEmbed] });
      await btnInteraction.reply({ content: `✅ You voted for **${options[optionIndex]}**`, ephemeral: true });
    });

    collector.on('end', async () => {
      const finalDesc = options.map((opt, i) => {
        const count = votes.get(i).size;
        return `${emojis[i]} **${opt}** — ${count} vote${count !== 1 ? 's' : ''}`;
      }).join('\n');

      const finalEmbed = EmbedBuilder.from(msg.embeds[0])
        .setDescription(finalDesc + '\n\n**Poll has ended!**')
        .setColor('#95A5A6');

      await msg.edit({ embeds: [finalEmbed], components: [] });
    });
  },
};
