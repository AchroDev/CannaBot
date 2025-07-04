const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, MessageFlags } = require('discord.js');
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
                    .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check the status of your grow plots.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('water')
                .setDescription('Water a plant in one of your plots.')
                .addIntegerOption(option =>
                    option.setName('plot')
                    .setDescription('The plot number to water.')
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
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'plant') {
            await interaction.deferReply();
            const seedId = interaction.options.getString('seed');
            const seedData = allItems.get(seedId);

            if (!seedData || seedData.type !== 'seed') {
                return interaction.editReply({ content: 'That is not a valid seed.', flags: [MessageFlags.Ephemeral] });
            }

            const seedInInventory = userProfile.inventory.find(i => i.name === seedData.name);
            if (!seedInInventory || seedInInventory.quantity < 1) {
                return interaction.editReply({ content: `You don't have any ${seedData.name} to plant!`, flags: [MessageFlags.Ephemeral] });
            }

            const plotIndex = userProfile.plots.findIndex(p => !p.hasPlant);
            if (plotIndex === -1) {
                return interaction.editReply({ content: 'You have no empty plots!', flags: [MessageFlags.Ephemeral] });
            }

            // Consume one seed
            seedInInventory.quantity -= 1;
            if (seedInInventory.quantity <= 0) {
                userProfile.inventory = userProfile.inventory.filter(i => i.name !== seedData.name);
            }

            userProfile.plots[plotIndex] = {
                hasPlant: true,
                plantId: seedData.id, // Store the ID for easy lookup
                plantedAt: new Date(),
                lastWatered: new Date()
            };
            
            const readyTime = new Date(Date.now() + seedData.growTime);
            await userProfile.save();
            
            return interaction.editReply(`You've planted **${seedData.name}** in plot ${plotIndex + 1}. It will be ready <t:${Math.floor(readyTime.getTime() / 1000)}:R>.`);
        } 
        
        else if (subcommand === 'harvest') {
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
            
            const reward = plantData.reward;
            const xpGained = plantData.xp;
            
            userProfile.coins += reward;
            userProfile.xp += xpGained;

            // --- "DRIED & DIED" LOGIC ---
            // Define a wither time in milliseconds (e.g., 24 hours)
            const witherTime = 24 * 60 * 60 * 1000; 
            const timeSinceWatered = Date.now() - new Date(plot.lastWatered).getTime();

            if (timeSinceWatered > witherTime) {
                // Clear the plot
                userProfile.plots[plotIndex] = { hasPlant: false, plantId: null, plantedAt: null, lastWatered: null };
                await userProfile.save();
                return interaction.editReply(`Oh no! You forgot to water your **${plantData.name}**. It dried up and died. 🏜️`);
            }
            
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

        // --- LOGIC FOR THE STATUS SUBCOMMAND ---
        else if (subcommand === 'status') {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

            if (!userProfile.plots || userProfile.plots.length === 0) {
                return interaction.editReply("You don't have any grow plots yet. Try planting a seed!");
            }

            const statusEmbed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setTitle(`${interaction.user.username}'s Grow Plots`)
                .setDescription('Manage your garden from here. Plants will die if not watered within 24 hours!');

            const componentRows = [];

            for (let i = 0; i < userProfile.plots.lenth; i++) {
                const plot = userProfile.plots[i];

                let plotStatus;
                // Create a new row of buttons for each plot
                const actionRow = new ActionRowBuilder();

                if (plot.hasPlant) {
                    const plantData = allItems.get(plot.plantId);
                    const harvestReadyTime = new Date(new Date(plot.plantedAt).getTime() + plantData.growTime);
                    const isReady = new Date() >= harvestReadyTime;
                    
                    // Determine watering status
                    const witherTime = 24 * 60 * 60 * 1000;
                    const timeSinceWatered = Date.now() - new Date(plot.lastWatered).getTime();
                    const needsWater = timeSinceWatered > witherTime / 2; // Example: show water button if >12 hours have passed

                    plotStatus = `**${plantData.name}**\n`;
                    plotStatus += isReady ? "✅ Ready to Harvest!" : `Ready <t:${Math.floor(harvestReadyTime.getTime() / 1000)}:R>`;

                    // Water Button
                    actionRow.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`water-${i}`) // e.g., water-0
                            .setLabel('Water')
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji('💧')
                            .setDisabled(!needsWater) // Disable if recently watered
                    );

                    // Harvest Button
                    actionRow.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`harvest-${i}`) // e.g., harvest-0
                            .setLabel('Harvest')
                            .setStyle(ButtonStyle.Success)
                            .setEmoji('🧑‍🌾')
                            .setDisabled(!isReady) // Disable if not ready
                    );

                } else {
                    plotStatus = "Empty 🌱";
                    // Plant Button (disabled for now, could be a future feature)
                     actionRow.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`plant-${i}`)
                            .setLabel('Plant')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('🌿')
                            .setDisabled(true)
                    );
                }
                statusEmbed.addFields({ name: `Plot ${i + 1}`, value: plotStatus, inline: true });
                componentRows.push(actionRow);
            }

            return interaction.editReply({ embeds: [statusEmbed], components: componentRows });
        }

        // Logic for watering plots
        else if (subcommand === 'water') {
            await interaction.deferReply({ ephemeral: true });
            const plotNumber = interaction.options.getInteger('plot');
            const plotIndex = plotNumber - 1;

            const plot = userProfile.plots[plotIndex];
            if (!plot || !plot.hasPlant) {
                return interaction.editReply("There's no plant in that plot to water.");
            }

            // You could add a cooldown for watering here if you want
            plot.lastWatered = new Date();
            await userProfile.save();

            const plantData = allItems.get(plot.plantId);
            return interaction.editReply(`You watered your **${plantData.name}** in plot ${plotNumber}. It looks refreshed! 💧`);
        }
    },
};