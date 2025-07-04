const { Events, MessageFlags } = require('discord.js');

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
        const command = interaction.client.commands.get(interaction.commandName);

        if (!command) {
			console.error(`No command matching ${interaction.commandName} was found.`);
			return;
		}

        // --- Handle Autocomplete ---
        if (interaction.isAutocomplete()) {
            if (command.autocomplete) {
                try {
                    await command.autocomplete(interaction);
                } catch (error) {
                    console.error(error);
                }
            }
            return;
        }

        // --- Handle Slash Commands ---
		if (interaction.isChatInputCommand()) {
            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(`Error executing ${interaction.commandName}`);
                console.error(error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'There was an error while executing this command!', flags: [MessageFlags.Ephemeral] });
                } else {
                    await interaction.reply({ content: 'There was an error while executing this command!', flags: [MessageFlags.Ephemeral] });
                }
            }
        }

        // --- Handle Button Interactions ---
        else if (interaction.isButton()) {
            const [action, plotIndexStr] = interaction.customId.split('-');
            const plotIndex = parseInt(plotIndexStr, 10);

            const userProfile = await User.findOne({ userId: interaction.user.id });
            if (!userProfile) {
                return interaction.reply({ content: "Please create a profile first by using `/profile`.", flags: [MessageFlags.Ephemeral] });
            }

            const plot = userProfile.plots[plotIndex];
            if (!plot) {
                return interaction.reply({ content: "This plot does not exist.", flags: [MessageFlags.Ephemeral] });
            }

            // --- WATER ACTION ---
            if (action === 'water') {
                if (!plot.hasPlant) {
                    return interaction.reply({ content: "There's nothing to water in this plot.", flags: [MessageFlags.Ephemeral] });
                }
                plot.lastWatered = new Date();
                await userProfile.save();
                return interaction.reply({ content: `You watered your plant in plot ${plotIndex + 1}! 💧`, flags: [MessageFlags.Ephemeral] });
            }

            // --- HARVEST ACTION ---
            if (action === 'harvest') {
                if (!plot.hasPlant) {
                    return interaction.reply({ content: "There's nothing to harvest in this plot.", flags: [MessageFlags.Ephemeral] });
                }

                const plantData = allItems.get(plot.plantId);
                const witherTime = 24 * 60 * 60 * 1000;
                if (Date.now() - new Date(plot.lastWatered).getTime() > witherTime) {
                    userProfile.plots[plotIndex] = { hasPlant: false, plantId: null, plantedAt: null, lastWatered: null };
                    await userProfile.save();
                    return interaction.reply({ content: `Your **${plantData.name}** in plot ${plotIndex + 1} dried up and died. 🏜️`, flags: [MessageFlags.Ephemeral] });
                }

                const harvestReadyTime = new Date(new Date(plot.plantedAt).getTime() + plantData.growTime);
                if (new Date() < harvestReadyTime) {
                    return interaction.reply({ content: `Your plant in plot ${plotIndex + 1} is not ready for harvest yet.`, flags: [MessageFlags.Ephemeral] });
                }

                userProfile.coins += plantData.reward;
                userProfile.xp += plantData.xp;
                
                const harvestedItemName = plantData.growsInto;
                const itemIndex = userProfile.inventory.findIndex(item => item.name === harvestedItemName);
                if (itemIndex > -1) userProfile.inventory[itemIndex].quantity += 1;
                else userProfile.inventory.push({ name: harvestedItemName, quantity: 1 });
                
                userProfile.plots[plotIndex] = { hasPlant: false, plantId: null, plantedAt: null, lastWatered: null };

                await checkLevelUp(interaction, userProfile);
                await userProfile.save();

                return interaction.reply({ content: `You harvested your **${plantData.name}** from plot ${plotIndex + 1} and received ${plantData.reward} coins and ${plantData.xp} XP!`, flags: [MessageFlags.Ephemeral] });
            }

            // Acknowledge the interaction to prevent it from failing
            await interaction.deferUpdate();
        }
	},
};