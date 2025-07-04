const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../models/User');
const plants = require('../utils/plants'); // Import our plant data

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('Buy and sell goods.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all available seeds for sale.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('buy')
                .setDescription('Buy a seed from the shop.')
                .addStringOption(option => {
                    option.setName('seed').setDescription('The name of the seed to buy.').setRequired(true);
                    // Dynamically add choices from our plants file
                    for (const plantKey in plants) {
                        option.addChoices({ name: plants[plantKey].seedName, value: plantKey });
                    }
                    return option;
                })
                .addIntegerOption(option =>
                    option.setName('quantity')
                        .setDescription('How many seeds to buy.')
                        .setRequired(false))) // Optional, defaults to 1
        .addSubcommand(subcommand =>
            subcommand
                .setName('sell')
                .setDescription('Sell an item from your inventory.')
                // We will build this out later
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true }); // Acknowledge the command, gives us time to work
        const userProfile = await User.findOneAndUpdate({ userId: interaction.user.id }, { $setOnInsert: { username: interaction.user.username } }, { upsert: true, new: true });

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'list') {
            const shopEmbed = new EmbedBuilder()
                .setTitle('🌱 CannaBot Seed Shop 🌱')
                .setColor('#5865F2')
                .setDescription('Use `/shop buy` to purchase seeds.');

            // Add a seasonal item for fun!
            shopEmbed.addFields({ name: `🎆 **Freedom Bloom Seed** (Seasonal!)`, value: `Price: 75 coins` });

            for (const plantKey in plants) {
                const plant = plants[plantKey];
                shopEmbed.addFields({ name: `**${plant.seedName}**`, value: `Price: ${plant.seedPrice} coins` });
            }

            return interaction.editReply({ embeds: [shopEmbed] });
        } else if (subcommand === 'buy') {
            const seedKey = interaction.options.getString('seed');
            const quantity = interaction.options.getInteger('quantity') || 1;
            const plant = plants[seedKey];

            if (!plant) {
                return interaction.editReply('That seed does not exist!');
            }

            const totalCost = plant.seedPrice * quantity;

            if (userProfile.coins < totalCost) {
                return interaction.editReply(`You do not have enough coins. You need ${totalCost} coins, but you only have ${userProfile.coins}.`);
            }

            // Subtract coins
            userProfile.coins -= totalCost;

            // Add item to inventory
            const itemIndex = userProfile.inventory.findIndex(item => item.name === plant.seedName);
            if (itemIndex > -1) {
                // Item exists, increment quantity
                userProfile.inventory[itemIndex].quantity += quantity;
            } else {
                // Item does not exist, add new item
                userProfile.inventory.push({ name: plant.seedName, quantity: quantity });
            }

            await userProfile.save();
            return interaction.editReply(`You have successfully purchased ${quantity}x **${plant.seedName}** for ${totalCost} coins.`);
        }
        // We will add the 'sell' logic later
    },
};