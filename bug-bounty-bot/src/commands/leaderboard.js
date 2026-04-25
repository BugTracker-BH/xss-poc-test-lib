const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getLeaderboard } = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the top members by XP'),

  async execute(interaction) {
    const rows = getLeaderboard(interaction.guild.id, 10);

    if (rows.length === 0) {
      return interaction.reply({ content: 'No XP data yet. Start chatting to earn XP!', ephemeral: true });
    }

    const lines = rows.map((row, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**${i + 1}.**`;
      return `${medal} <@${row.user_id}> — Level ${row.level} (${row.xp} XP)`;
    });

    const embed = new EmbedBuilder()
      .setTitle('🏆 XP Leaderboard')
      .setDescription(lines.join('\n'))
      .setColor('#F1C40F')
      .setTimestamp()
      .setFooter({ text: `Top ${rows.length} members` });

    await interaction.reply({ embeds: [embed] });
  },
};
