const { Client, MessageEmbed, WebhookClient } = require('discord.js');
const axios = require('axios');
const createClient = require('@supabase/supabase-js').createClient

require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)
const client = new Client();
const playersResponse = axios.get("https://api.sleeper.app/v1/players/nfl").then(r => { return r.data })

client.login(process.env.BOT_TOKEN);
client.on('ready', async () => {
    console.log('The Bot is ready!');
    setInterval(function(){ // repeat this every 5 minutes
        checkTransactions();
    }, 5000 )
});

client.on('message', async (msg) => {
  if (msg.content === '!ping') {
    console.log(msg.channel.id);
    console.log(msg.guild.id);
    msg.channel.send("Pong");
  } else if (msg.content.startsWith("!sleeper-subscribe")){
    const parts = msg.content.split(" ");
    if(parts.length != 2){
      msg.channel.send("Usage: `!sleeper-subscribe 123` where 123 is the Sleeper league ID");
      return;
    }
    const leagueId = parts[1];
    axios.get(`https://api.sleeper.app/v1/league/${leagueId}`).then( async res => {
      saveSubscription(msg.channel.guild.id, msg.channel.id, leagueId);
      msg.channel.send(`Subscribed to league ${res.data.name}`);
    }).catch(err => {
      console.log(err);
      msg.channel.send(`Couldn't subscribe to Sleeper league ${leagueId}`);
      return;
    });
  }
});

async function checkTransactions() {
    //TODO - send the latest transactions to the webhook
    const nflInfo = await axios.get('https://api.sleeper.app/v1/state/nfl')
    const nflWeek = nflInfo.data.leg > 0 ? nflInfo.data.leg : 1;
    const epochMillis = Math.round(Date.now())
    
    const subs = await supabase.from('sleeper-subs')
        .select();
    subs.data.forEach(async sub => {
        const channel = await client.channels.cache.find(c => c.guild.id == sub.guild &&
            c.type == 'text' &&
            c.id == sub.channel);

        const leagueRosters = await axios.get(`https://api.sleeper.app/v1/league/${sub.league_id}/rosters`).then(r => r.data);
        const leagueUsers = await axios.get(`https://api.sleeper.app/v1/league/${sub.league_id}/users`).then(r => r.data);
        
        const txns = await axios.get(`https://api.sleeper.app/v1/league/${sub.league_id}/transactions/${nflWeek}`)
        const newTxns = txns.data.filter(txn => txn.status == 'complete' && txn.status_updated > sub.latest);
        newTxns.forEach(async txn => {
            const players = await playersResponse
            if(txn.type=='trade'){
                const tradeMessage = buildTradeMessage(players, leagueRosters, leagueUsers, txn);
                channel.send(tradeMessage);          
            }
            if(txn.type=='waiver' || txn.type=='free_agent'){
                const pickupMessage = buildPickupMessage(players, leagueRosters, leagueUsers, txn);
                channel.send(pickupMessage);          
            }
        })
        //TODO - update latest txn time in DB here
    });
};

function buildPickupMessage(players, leagueRosters, leagueUsers, txn){
    const trade = {}
    const stringParts = ["__**Free Agent Pickup**__"];
    for (const [playerId, rosterId] of Object.entries(txn.adds)) {
        const username = getUsernameForRosterId(leagueRosters, leagueUsers, rosterId);
        if (!trade[username]){
            trade[username] = []
        }
        trade[username].push(players[playerId].full_name);
    }   
    txn.draft_picks.forEach(pick => {
        const username = getUsernameForRosterId(leagueRosters, leagueUsers, pick.owner_id);
        if (!trade[username]){
            trade[username] = []
        }
        trade[username].push(`${pick.season} ${pick.round}`);
    })
    for (const [username, tradeParts] of Object.entries(trade)) {
        stringParts.push(`**${username}** adds`);
        stringParts.push(tradeParts.join('\n'));
    }
    return stringParts.join("\n");
}

function buildTradeMessage(players, leagueRosters, leagueUsers, txn){
    const trade = {}
    for (const [playerId, rosterId] of Object.entries(txn.adds)) {
        const username = getUsernameForRosterId(leagueRosters, leagueUsers, rosterId);
        if (!trade[username]){
            trade[username] = []
        }
        trade[username].push(players[playerId].full_name);
    }   
    txn.draft_picks.forEach(pick => {
        const username = getUsernameForRosterId(leagueRosters, leagueUsers, pick.owner_id);
        if (!trade[username]){
            trade[username] = []
        }
        trade[username].push(`${pick.season} ${pick.round}`);
    })
    const stringParts = ["__**Trade**__"];
    for (const [username, tradeParts] of Object.entries(trade)) {
        stringParts.push(`**${username}** adds`);
        stringParts.push(tradeParts.join('\n'));
    }
    return stringParts.join("\n");
}

function getUsernameForRosterId( rosters, users, rosterId){
    const roster = rosters.find(r => {
        return r.roster_id == rosterId;
    });
    const user = users.find(u => {
        return u.user_id == roster.owner_id
    });
    return user.display_name;
}

async function saveSubscription(guildId, channelId, leagueId) {
    const exists = await subscriptionExists(guildId, channelId, leagueId);
    if (!exists) {
        const epochMillis = Math.round(Date.now())
        supabase.from('sleeper-subs')
            .insert([
                { guild: guildId, channel: channelId, league_id: leagueId, latest: epochMillis }
            ]).then(dbRes => {
                return true;
            }).catch(err => {
                msg.channel.send(`Couldn't save subscription to Sleeper league ${leagueId}`);
                return false;
            });
    }
};

async function subscriptionExists(guildId, channelId, leagueId) {
    return await supabase.from('sleeper-subs')
        .select()
        .eq('guild', guildId)
        .eq('channel', channelId)
        .eq('league_id', leagueId)
        .then(dbRes => {
            return dbRes.data.length > 0;
        }).catch(err => {
            return false;
        });
}

//TODO - add slash command ("add sleeper league subscription") rather than !add-sub