const Discord = require('discord.js');
const axios = require('axios');
require('dotenv').config();

const client = new Discord.Client();

client.login(process.env.BOT_TOKEN);

client.on('ready', () => console.log('The Bot is ready!'));

client.on('message', (msg) => {
  if (msg.content === '!ping') {
    msg.channel.send("Pong");
  } else if (msg.content.startsWith("!sleeper-subscribe")){
    const parts = msg.content.split(" ");
    if(parts.length != 2){
      msg.channel.send("Usage: `!sleeper-subscribe 123` where 123 is the Sleeper league ID");
      return;
    }
    const league_id = parts[1];
    axios.get(`https://api.sleeper.app/v1/league/${league_id}`).then(res => {
      msg.channel.send(`Subscribe to league ${res.data.name}`);
    }).catch(err => {
      msg.channel.send(`Couldn't subscribe to Sleeper league ${league_id}`);
      return;
    });
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
