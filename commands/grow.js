const { SlashCommandBuilder } = require('discord.js');
const User = require('../models/User');

// For now, let's define a plant's properties here. Later, this can move to its own file.
const plants = {
    "OG Kush": { growTime: 60 * 1000, // 60 seconds for testing
                 reward: 50, // coins
                xp: 10
                } 
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('grow')
    .setDescription('Manage your plants.')
    .addSubcommand(subcommand =>
        subcommand
            .setName('plant')
            .setDescription('Plant a seed in an empty plot.')
            .addStringOption(option => 
                option.setName('seed')
                .setDescription('The type of seed to plant.')
                .setRequired(true)
                .addChoices(
                    {name: 'OG Kush', value: 'OG Kush'}
                    // Add more choices as you create more plants
                )))
    .addSubcommand(subcommand =>
        subcommand
            .setName('harvest')
            .setDescription('Harvest a ready plant.')
            .addIntegerOption(option => 
                option.setName('plot')
                .setDescription('The plot number to harvest from.')
                .setRequired(true))),
  async execute(interaction) {
    const userProfile = await User.findOne({ userId: interaction.user.id });
    if (!userProfile) {
        return interaction.reply({ content: 'You need a profile first! Use `/profile` to get started.', ephemeral: true });
    }

    if (interaction.options.getSubcommand() === 'plant') {
        const seedToPlant = interaction.options.getString('seed');
        
        // Find an empty plot
        const plotIndex = userProfile.plots.findIndex(p => !p.hasPlant);
        if (plotIndex === -1) {
            return interaction.reply({ content: 'You have no empty plots!', ephemeral: true });
        }

        // TODO: Check if user has the seed in their inventory first
        
        userProfile.plots[plotIndex] = {
            hasPlant: true,
            plantType: seedToPlant,
            plantedAt: new Date()
        };
        await userProfile.save();

        const plantInfo = plants[seedToPlant];
        const readyTime = new Date(userProfile.plots[plotIndex].plantedAt.getTime() + plantInfo.growTime);
        
        return interaction.reply(`You've planted **${seedToPlant}** in plot ${plotIndex + 1}. It will be ready to harvest at <t:${Math.floor(readyTime.getTime() / 1000)}:T>.`);
    } 
    else if (interaction.options.getSubcommand() === 'harvest') {
        const plotNumber = interaction.options.getInteger('plot');
        const plotIndex = plotNumber - 1;

        if (!userProfile.plots[plotIndex] || !userProfile.plots[plotIndex].hasPlant) {
            return interaction.reply({ content: 'There is no plant in that plot.', ephemeral: true });
        }

        const plot = userProfile.plots[plotIndex];
        const plantInfo = plants[plot.plantType];
        const harvestReadyTime = new Date(plot.plantedAt.getTime() + plantInfo.growTime);

        if (new Date() < harvestReadyTime) {
            return interaction.reply({ content: `Your **${plot.plantType}** isn't ready yet! It will be ready <t:${Math.floor(harvestReadyTime.getTime() / 1000)}:R>.`});
        }
        
        // Harvest is ready!
        userProfile.coins += plantInfo.reward;
        userProfile.xp += plantInfo.xp;
        
        // Add harvested item to inventory
        userProfile.inventory.push(`${plot.plantType} Bud`);
        
        // Clear the plot
        userProfile.plots[plotIndex] = { hasPlant: false, plantType: null, plantedAt: null };

        await userProfile.save();
        return interaction.reply(`You harvested your **${plot.plantType}** and received ${plantInfo.reward} coins and ${plantInfo.xp} XP!`);
    }
  },
};