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
	},
};