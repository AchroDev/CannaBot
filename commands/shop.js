const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const User = require('../models/User');
const allItems = require('../data/items'); // Import the new master item list

module.exports = {
    // --- Autocomplete Handler ---
	async autocomplete(interaction) {
		const focusedValue = interaction.options.getFocused();
		const choices = [];
		allItems.forEach(item => {
			if (item.name.toLowerCase().includes(focusedValue.toLowerCase())) {
				choices.push({ name: item.name, value: item.id });
			}
		});
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
                    option.setName('item')
                        .setDescription('Start typing to see available items.')
                        .setRequired(true)
                        .setAutocomplete(true)) // Enable autocomplete
                .addIntegerOption(option =>
                    option.setName('quantity')
                        .setDescription('How many to buy.')))
        .addSubcommand(subcommand =>
            subcommand
                .setName('sell')
                .setDescription('Sell an item from your inventory.')
                .addStringOption(option =>
                    option.setName('item')
                        .setDescription('Start typing to see sellable items.')
                        .setRequired(true)
                        .setAutocomplete(true)) // Enable autocomplete
                .addIntegerOption(option =>
                    option.setName('quantity')
                        .setDescription('How many to sell.'))),

    async execute(interaction) {
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
            const quantity = interaction.options.getInteger('quantity') || 1;
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
            const quantity = interaction.options.getInteger('quantity') || 1;
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