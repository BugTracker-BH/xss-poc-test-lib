const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { setupServer } = require('../utils/setup');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Run the full server setup (creates all roles, channels, and categories)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      await setupServer(interaction.guild, async (msg) => {
        try { await interaction.editReply({ content: `⏳ ${msg}` }); } catch { /* ignore */ }
      });
      await interaction.editReply({ content: '✅ Server setup complete! All channels, roles, and messages have been created.' });
    } catch (error) {
      console.error('Setup command error:', error);
      await interaction.editReply({ content: `❌ Setup failed: ${error.message}` });
    }
  },
};
