const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const User = require('../models/User');
const allItems = require('../data/items');

module.exports = {
    // --- Autocomplete Handler ---
	async autocomplete(interaction) {
		const focusedOption = interaction.options.getFocused(true);
        const subcommand = interaction.options.getSubcommand();
		const choices = [];

        if (subcommand === 'sell') {
            const userProfile = await User.findOne({ userId: interaction.user.id });
            if (!userProfile) return interaction.respond([]);

            userProfile.inventory.forEach(item => {
                const itemData = Array.from(allItems.values()).find(i => i.name === item.name);
                if (itemData && item.name.toLowerCase().includes(focusedOption.value.toLowerCase())) {
                    choices.push({ name: item.name, value: itemData.id });
                }
            });
        } 
        else if (subcommand === 'buy') {
            // --- THIS IS THE NEW LOGIC ---
            // First, get the category the user has already selected.
            const category = interaction.options.getString('category');
            if (!category) return; // If no category is selected yet, show no options.

            // Filter all items by the selected category and the user's typing.
            allItems.forEach(item => {
                if (item.type === category && item.name.toLowerCase().includes(focusedOption.value.toLowerCase())) {
                    choices.push({ name: item.name, value: item.id });
                }
            });
        }
        
        // Discord's API has a limit of 25 choices
		await interaction.respond(choices.slice(0, 25));
	},

    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('Buy and sell goods from the store.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all available items for sale.')
                .addStringOption(option => 
                    option.setName('category')
                    .setDescription('Filter by item category.')
                    .setRequired(false)
                    .addChoices(
                        { name: 'Seeds', value: 'seed' },
                        { name: 'Nutrients', value: 'nutrient' }
                    )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('buy')
                .setDescription('Buy an item from the shop.')
                .addStringOption(option => 
                    option.setName('category')
                    .setDescription('The category of the item to buy.')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Seeds', value: 'seed' },
                        { name: 'Nutrients', value: 'nutrient' }
                    ))
                .addStringOption(option =>
                    option.setName('item')
                        .setDescription('The item to buy from the selected category.')
                        .setRequired(true)
                        .setAutocomplete(true)
                    )
                // --- ADDING QUANTITY OPTION BACK ---
                .addIntegerOption(option =>
                    option.setName('quantity').setDescription('The amount you want to sell. Defaults to 1.'))
                )
        .addSubcommand(subcommand =>
            subcommand
                .setName('sell')
                // ... (sell subcommand is unchanged)
                .setDescription('Sell an item from your inventory.')
                .addStringOption(option =>
                    option.setName('item')
                        .setDescription('Start typing to see sellable items.')
                        .setRequired(true)
                        .setAutocomplete(true)
                    )
                // --- ADDING QUANTITY OPTION BACK ---
                .addIntegerOption(option =>
                    option.setName('quantity').setDescription('The amount you want to sell. Defaults to 1.'))
                ),

    async execute(interaction) {
        // The execute function remains the same as it correctly handles the logic
        // based on the item ID provided by the autocomplete.
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        const userProfile = await User.findOneAndUpdate({ userId: interaction.user.id }, { $setOnInsert: { username: interaction.user.username } }, { upsert: true, new: true });
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'list') {
            const category = interaction.options.getString('category');
            const shopEmbed = new EmbedBuilder()
                .setTitle('🌱 CannaBot Shop 🌱')
                .setColor('#5865F2');

            const itemsToList = category ? Array.from(allItems.values()).filter(i => i.type === category) : Array.from(allItems.values());

            if (itemsToList.length === 0) {
                 shopEmbed.setDescription("No items found in this category.");
            } else {
                itemsToList.forEach(item => {
                    const fieldName = item.id === "freedom_bloom" ? `🎆 **${item.name}** (Seasonal!)` : `**${item.name}**`;
                    shopEmbed.addFields({ name: fieldName, value: `*${item.description}*\nPrice: ${item.price} coins` });
                });
            }
            return interaction.editReply({ embeds: [shopEmbed] });
        }
        
        else if (subcommand === 'buy') {
            const itemId = interaction.options.getString('item');
            const quantity = 1;
            const item = allItems.get(itemId);

            if (!item) return interaction.editReply('That item does not exist!');

            const totalCost = item.price * quantity;
            if (userProfile.coins < totalCost) return interaction.editReply(`You need ${totalCost} coins, but only have ${userProfile.coins}.`);

            userProfile.coins -= totalCost;
            const itemIndex = userProfile.inventory.findIndex(i => i.name === item.name);
            if (itemIndex > -1) {
                userProfile.inventory[itemIndex].quantity += quantity;
            } else {
                userProfile.inventory.push({ name: item.name, quantity: quantity });
            }

            await userProfile.save();
            return interaction.editReply(`You bought ${quantity}x **${item.name}** for ${totalCost} coins.`);
        }
        
        else if (subcommand === 'sell') {
            const itemId = interaction.options.getString('item');
            const quantity = 1;
            const itemData = allItems.get(itemId);

            if (!itemData || !itemData.sellPrice) return interaction.editReply("This item cannot be sold.");

            const itemInInventory = userProfile.inventory.find(i => i.name === itemData.name);
            if (!itemInInventory) return interaction.editReply("You don't have that item to sell.");
            if (itemInInventory.quantity < quantity) return interaction.editReply(`You only have ${itemInInventory.quantity}x ${itemData.name}.`);
            
            const totalGain = itemData.sellPrice * quantity;
            userProfile.coins += totalGain;
            itemInInventory.quantity -= quantity;
            if (itemInInventory.quantity <= 0) {
                userProfile.inventory = userProfile.inventory.filter(i => i.name !== itemData.name);
            }
            
            await userProfile.save();
            return interaction.editReply(`You sold ${quantity}x **${itemData.name}** for ${totalGain} coins!`);
        }
    },
};