const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const User = require('../models/User');
const allItems = require('../data/items');
// --- Import the new experience utility ---
const { checkLevelUp } = require('../utils/experience'); 

module.exports = {
    data: new SlashCommandBuilder()
        .setName('grow')
        .setDescription('Manage your plants.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('plant')
                .setDescription('Plant a seed in an empty plot.')
                .addStringOption(option => {
                    option.setName('seed').setDescription('The type of seed to plant.').setRequired(true).setAutocomplete(true);
                    return option;
                }))
        .addSubcommand(subcommand =>
            subcommand
                .setName('harvest')
                .setDescription('Harvest a ready plant.')
                .addIntegerOption(option => 
                    option.setName('plot')
                    .setDescription('The plot number to harvest from.')
                    .setRequired(true))),
    
    // Autocomplete handler for the 'plant' subcommand
    // --- THIS IS THE CORRECTED AUTOCOMPLETE HANDLER ---
    async autocomplete(interaction) {
		const focusedValue = interaction.options.getFocused();
        // Find the user's profile to check their inventory
        const userProfile = await User.findOne({ userId: interaction.user.id });
        if (!userProfile) {
            return interaction.respond([]); // If no profile, no suggestions
        }

		const choices = [];
        // Iterate through the user's inventory
        userProfile.inventory.forEach(item => {
            // Find the full item data from our master list
            const itemData = Array.from(allItems.values()).find(i => i.name === item.name);
            
            // Check if the item is a seed and matches the user's typing
            if (itemData && itemData.type === 'seed' && item.name.toLowerCase().includes(focusedValue.toLowerCase())) {
                choices.push({ name: item.name, value: itemData.id });
            }
        });
        
		await interaction.respond(choices.slice(0, 25));
	},

    async execute(interaction) {
        const userProfile = await User.findOneAndUpdate({ userId: interaction.user.id }, { $setOnInsert: { username: interaction.user.username } }, { upsert: true, new: true });

        if (interaction.options.getSubcommand() === 'plant') {
            const seedId = interaction.options.getString('seed');
            const seedData = allItems.get(seedId);

            if (!seedData || seedData.type !== 'seed') {
                return interaction.reply({ content: 'That is not a valid seed.', flags: [MessageFlags.Ephemeral] });
            }

            const seedInInventory = userProfile.inventory.find(i => i.name === seedData.name);
            if (!seedInInventory || seedInInventory.quantity < 1) {
                return interaction.reply({ content: `You don't have any ${seedData.name} to plant!`, flags: [MessageFlags.Ephemeral] });
            }

            const plotIndex = userProfile.plots.findIndex(p => !p.hasPlant);
            if (plotIndex === -1) {
                return interaction.reply({ content: 'You have no empty plots!', flags: [MessageFlags.Ephemeral] });
            }

            // Consume one seed
            seedInInventory.quantity -= 1;
            if (seedInInventory.quantity <= 0) {
                userProfile.inventory = userProfile.inventory.filter(i => i.name !== seedData.name);
            }

            userProfile.plots[plotIndex] = {
                hasPlant: true,
                plantId: seedData.id, // Store the ID for easy lookup
                plantedAt: new Date()
            };
            
            const readyTime = new Date(Date.now() + seedData.growTime);
            await userProfile.save();
            
            return interaction.reply(`You've planted **${seedData.name}** in plot ${plotIndex + 1}. It will be ready <t:${Math.floor(readyTime.getTime() / 1000)}:R>.`);
        } 
        
        else if (interaction.options.getSubcommand() === 'harvest') {
            await interaction.deferReply(); // Defer reply as leveling up can send its own message.
            const plotNumber = interaction.options.getInteger('plot');
            const plotIndex = plotNumber - 1;

            if (!userProfile.plots[plotIndex] || !userProfile.plots[plotIndex].hasPlant) {
                return interaction.editReply({ content: 'There is no plant in that plot.', flags: [MessageFlags.Ephemeral] });
            }

            const plot = userProfile.plots[plotIndex];
            const plantData = allItems.get(plot.plantId);
            const harvestReadyTime = new Date(plot.plantedAt.getTime() + plantData.growTime);

            if (new Date() < harvestReadyTime) {
                return interaction.editReply({ content: `Your **${plantData.name}** isn't ready yet! It will be ready <t:${Math.floor(harvestReadyTime.getTime() / 1000)}:R>.`, flags: [MessageFlags.Ephemeral] });
            }
            
            // --- THIS IS THE NEW LOGIC ---
            const reward = plantData.reward;
            const xpGained = plantData.xp;
            
            userProfile.coins += reward;
            userProfile.xp += xpGained;
            
            const harvestedItemName = plantData.growsInto;
            const itemIndex = userProfile.inventory.findIndex(item => item.name === harvestedItemName);
            if (itemIndex > -1) {
                userProfile.inventory[itemIndex].quantity += 1;
            } else {
                userProfile.inventory.push({ name: harvestedItemName, quantity: 1 });
            }
            
            userProfile.plots[plotIndex] = { hasPlant: false, plantId: null, plantedAt: null };

            // Check if the user leveled up
            await checkLevelUp(interaction, userProfile);
            
            // Save all changes (coins, xp, inventory, level) at once
            await userProfile.save();

            return interaction.editReply(`You harvested your **${plantData.name}** and received ${reward} coins and ${xpGained} XP!`);
        }
    },
};