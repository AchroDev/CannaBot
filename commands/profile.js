const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../models/User'); // Import the User model

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Shows your grower profile and inventory.'),
  async execute(interaction) {
    // Find or create a user profile [UPDATED] More robust
    const userProfile = await User.findOneAndUpdate({ userId: interaction.user.id }, { $setOnInsert: { username: interaction.user.username } }, { upsert: true, new: true });

    const inventoryList = userProfile.inventory.map(item => `**${item.name}** (x${item.quantity})`).join('\n');

    // Create a nice embed to display the profile
    const profileEmbed = new EmbedBuilder()
      .setColor('#4CAF50') // A nice green color
      .setTitle(`${interaction.user.username}'s Grow House`)
      .setThumbnail(interaction.user.displayAvatarURL())
      .addFields(
        { name: '🌿 Level', value: `\`${userProfile.level}\``, inline: true },
        { name: '✨ XP', value: `\`${userProfile.xp}\``, inline: true },
        { name: '💰 Coins', value: `\`${userProfile.coins}\``, inline: true },
        { name: '🌱 Plots', value: `\`${userProfile.plots.length}\` available plots.`, inline: false},
        { name: '🎒 Inventory', value: userProfile.inventory.length > 0 ? inventoryList : 'Empty', inline: false },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [profileEmbed], ephemeral: true });
  },
};