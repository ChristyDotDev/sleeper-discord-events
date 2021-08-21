const Discord = require('discord.js');
const axios = require('axios');
const createClient = require('@supabase/supabase-js').createClient
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)
const client = new Discord.Client();

client.login(process.env.BOT_TOKEN);
client.on('ready', async () => {
    console.log('The Bot is ready!');
    setInterval(function(){ // repeat this every 5 minutes
        checkTransactions();
    }, 300000 )
});

client.on('message', async (msg) => {
  if (msg.content === '!ping') {
    msg.channel.send("Pong");
  } else if (msg.content.startsWith("!sleeper-subscribe")){
    const parts = msg.content.split(" ");
    if(parts.length != 2){
      msg.channel.send("Usage: `!sleeper-subscribe 123` where 123 is the Sleeper league ID");
      return;
    }
    const leagueId = parts[1];
    axios.get(`https://api.sleeper.app/v1/league/${leagueId}`).then( async res => {
      saveSubscription(msg.channel.id, leagueId);
      console.log(res.data.name);
      console.log(res.data.avatar);
      const webhook = await createWebhook(msg.channel, res.data.name + " Transactions", "https://sleepercdn.com/avatars/thumbs/" + res.data.avatar);
      
      msg.channel.send(`Subscribed to league ${res.data.name}`);
    }).catch(err => {
      msg.channel.send(`Couldn't subscribe to Sleeper league ${leagueId}`);
      return;
    });
  }
});

async function createWebhook(channel, hookName, hookAvatar) {
    //TODO check if webhook exists - how?
    //TODO store the webhook ID- do we need the channel too?
    return await channel.createWebhook(hookName, {
        avatar: hookAvatar,
        })
        .then(webhook => {
            console.log(`Created webhook ${webhook}`);
            return webhook;
        })
        .catch(console.error);
        return undefined;
};

async function checkTransactions() {
    //TODO - on schedule, run through the subscriptions and get transactions
    //TODO - get the current game week (https://api.sleeper.app/v1/state/nfl)
    //TODO - send the latest transactions to the webhook
    console.log("TEST");
    const secondsSinceEpoch = Math.round(Date.now() / 1000)
    console.log(secondsSinceEpoch);
};

async function saveSubscription(channelId, leagueId) {
    const exists = await subscriptionExists(channelId, leagueId);
    if (!exists) {
        const secondsSinceEpoch = Math.round(Date.now() / 1000)
        supabase.from('sleeper-subs')
            .insert([
                { channel: channelId, league_id: leagueId, latest: secondsSinceEpoch }
            ]).then(dbRes => {
                return true;
            }).catch(err => {
                msg.channel.send(`Couldn't save subscription to Sleeper league ${leagueId}`);
                return false;
            });
    }
};

async function subscriptionExists(channelId, leagueId) {
    return await supabase.from('sleeper-subs')
        .select()
        .eq('channel', channelId)
        .eq('league_id', leagueId)
        .then(dbRes => {
            return dbRes.data.length > 0;
        }).catch(err => {
            return false;
        });
}

//TODO - add slash command ("add sleeper league subscription") rather than !add-sub