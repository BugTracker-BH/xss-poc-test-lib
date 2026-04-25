const { Events } = require('discord.js');
const { setupServer } = require('../utils/setup');

module.exports = {
  name: Events.GuildCreate,
  async execute(guild) {
    console.log(`Joined guild: ${guild.name} (${guild.id})`);
    try {
      await setupServer(guild, (msg) => console.log(`[Setup] ${msg}`));
      console.log(`Setup complete for ${guild.name}`);
    } catch (error) {
      console.error(`Setup failed for ${guild.name}:`, error);
    }
  },
};
