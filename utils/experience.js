const { EmbedBuilder } = require('discord.js');

// This function calculates the XP required to reach the next level.
// We're using a common RPG formula for a smooth progression curve.
function calculateRequiredXp(level) {
    return 5 * (level ** 2) + (50 * level) + 100;
}

// This function handles the actual level-up check and process.
async function checkLevelUp(interaction, userProfile) {
    const requiredXp = calculateRequiredXp(userProfile.level);
    let leveledUp = false;

    // A while loop is used to handle multi-level ups from a single XP gain.
    while (userProfile.xp >= requiredXp) {
        leveledUp = true;
        userProfile.level += 1;
        userProfile.xp -= requiredXp; // Subtract this level's requirement, don't reset to 0.

        const levelUpReward = userProfile.level * 100; // Reward of 100 coins per level.
        userProfile.coins += levelUpReward;

        // Re-calculate required XP for the new level for the next loop iteration.
        requiredXp = calculateRequiredXp(userProfile.level);

        const levelUpEmbed = new EmbedBuilder()
            .setColor('#FFD700') // Gold color for leveling up
            .setTitle('🎆 Level Up! 🎆')
            .setDescription(`Congratulations, ${interaction.user.username}! You've reached **Level ${userProfile.level}**!`)
            .addFields(
                { name: '💰 Reward', value: `You received **${levelUpReward}** coins!` }
            );

        // Send a public message in the channel announcing the level up.
        // We use interaction.channel.send because we may have already replied to the interaction.
        await interaction.channel.send({ content: `${interaction.user}`, embeds: [levelUpEmbed] });
    }

    // Return whether the user leveled up so we know if we need to save the profile.
    return leveledUp;
}

module.exports = { checkLevelUp, calculateRequiredXp };