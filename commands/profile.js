const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Shows your grower profile and inventory.'),
  async execute(interaction) {
    // We'll add database logic here later
    await interaction.reply({ 
      content: `Welcome to your profile, ${interaction.user.username}! Your inventory is currently empty.`,
      ephemeral: true // 'ephemeral' means only the user who ran the command can see the reply
    });
  },
};