const { Events, MessageFlags } = require('discord.js'); // Add MessageFlags here

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		if (!interaction.isChatInputCommand()) return;

		const command = interaction.client.commands.get(interaction.commandName);

		if (!command) {
			console.error(`No command matching ${interaction.commandName} was found.`);
			return;
		}

		try {
			await command.execute(interaction);
		} catch (error) {
			console.error(`Error executing ${interaction.commandName}`);
			console.error(error);
			if (interaction.replied || interaction.deferred) {
				await interaction.followUp({ content: 'There was an error while executing this command!', flags: [MessageFlags.Ephemeral] }); // Changed here
			} else {
				await interaction.reply({ content: 'There was an error while executing this command!', flags: [MessageFlags.Ephemeral] }); // Changed here
			}
		}
	},
};