const Discord = require('discord.js');
require('dotenv').config();

const client = new Discord.Client();

client.login(process.env.BOT_TOKEN);

client.on('ready', () => console.log('The Bot is ready!'));

client.on('message', (msg) => {
  if (msg.content === '!ping') {
    console.log(msg.channel);
    msg.channel.send("Pong");
  }
});

//TODO - add slash command ("add sleeper league subscription")
//TODO - add create webhook permissions
//TODO - on slash addsub, create a webhook for the league/discord channel
//TODO - create DB table of webhooks/league IDs/latest transaction ID (is this sequential?)
//TODO - on schedule, run through the leagues and get transactions
//TODO - send the latest transactions to the webhook

//DB:
//TABLE: league_integration
//id, webhook_url, sleeper_league_id, latest_txn_id(or timestamp)
