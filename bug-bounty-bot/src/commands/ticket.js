const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Open a support or report ticket'),

  async execute(interaction) {
    const createTicketChannel = interaction.guild.channels.cache.find(c => c.name === 'create-ticket');
    if (createTicketChannel) {
      await interaction.reply({
        content: `Please use the ticket buttons in <#${createTicketChannel.id}> to open a ticket.`,
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: '❌ Ticket system not set up. An admin needs to run `/setup` first.',
        ephemeral: true,
      });
    }
  },
};
