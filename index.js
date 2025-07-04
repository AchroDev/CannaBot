require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const connectDB = require('./utils/db'); // Moved here to prevent race condition

// Create a new client instance
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// --- COMMAND HANDLER ---
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
  }
}

// --- EVENT HANDLER ---
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}

// Main function to start the bot
const start = async () => {
  try {
    // First, connect to the database
    console.log('Connecting to MongoDB...');
    await connectDB();
    
    // THEN, log in to Discord
    console.log('Logging in to Discord...');
    await client.login(process.env.DISCORD_TOKEN);

  } catch (error) {
    console.error("Failed to start the bot:");
    console.error(error);
  }
};

start();
