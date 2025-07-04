const { Events } = require('discord.js');

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`🌿 CannaBot is online as ${client.user.tag}`);
  },
};