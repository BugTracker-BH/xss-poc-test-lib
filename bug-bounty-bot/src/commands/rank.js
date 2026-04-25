const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getXp, xpForLevel } = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('View your XP rank and level')
    .addUserOption(opt =>
      opt.setName('user').setDescription('User to check (defaults to you)').setRequired(false)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    const data = getXp(target.id, interaction.guild.id);
    const xpNeeded = xpForLevel(data.level);
    const progress = Math.min(100, Math.round((data.xp / xpNeeded) * 100));

    const progressBar = '█'.repeat(Math.floor(progress / 10)) + '░'.repeat(10 - Math.floor(progress / 10));

    const embed = new EmbedBuilder()
      .setTitle(`📊 Rank — ${target.username}`)
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        { name: 'Level', value: `${data.level}`, inline: true },
        { name: 'XP', value: `${data.xp} / ${xpNeeded}`, inline: true },
        { name: 'Messages', value: `${data.total_messages}`, inline: true },
        { name: 'Progress', value: `\`${progressBar}\` ${progress}%` },
      )
      .setColor('#3498DB')
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
