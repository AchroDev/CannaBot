require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

client.once('ready', () => {
  console.log(`🌿 CannaBot is online as ${client.user.tag}`);
});

client.on('messageCreate', message => {
  if (message.author.bot) return;

  if (message.content === '!ping') {
    message.reply('🌱 Pong! The grow lights are humming.');
  }

  if (message.content === '!smoke') {
    message.reply('💨 You light up some sticky icky and chill out...');
  }
});

client.login(process.env.DISCORD_TOKEN);
