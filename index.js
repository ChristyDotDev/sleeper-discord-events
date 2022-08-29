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
    setInterval(function(){ // repeat this every 2 minutes
        checkTransactions();
        checkDraftPicks();
    }, 1000 * 60 * 2 )
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
    const exists = await channelSubscriptionExists(msg.channel.guild.id, msg.channel.id);
    if(exists){
        msg.channel.send(`Already subscribed. Please run !sleeper-unsubscribe first if you want to change the league this channel is subscribed to`);
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
  } else if (msg.content == ("!sleeper-unsubscribe")){
    removeSubscription(msg.channel.guild.id, msg.channel.id);
    msg.channel.send(`Unsubscribed`);
  } else if (msg.content.startsWith("!draft-subscribe")){
    const parts = msg.content.split(" ");
    if(parts.length != 2){
      msg.channel.send("Usage: `!draft-subscribe 123` where 123 is the Sleeper Draft ID");
      return;
    }
    //TODO -validations
    /*
    const exists = await channelSubscriptionExists(msg.channel.guild.id, msg.channel.id);
    if(exists){
        msg.channel.send(`Already subscribed. Please run !draft-unsubscribe first if you want to change the league this channel is subscribed to`);
        return;
    }
    */
    const draftId = parts[1];

    axios.get(`https://api.sleeper.app/v1/draft//${draftId}/picks`).then( async res => {
      let latestPlayer = 0
      if (res.data.length > 0){
        latestPlayer = res.data[res.data.length-1].player_id
      }
      console.log(latestPlayer)
      saveDraftSubscription(msg.channel.guild.id, msg.channel.id, draftId, res.data.length);
      msg.channel.send(`Subscribed to draft ${draftId}`);
    }).catch(err => {
      console.log(err);
      msg.channel.send(`Couldn't subscribe to Sleeper Draft ${draftId}`);
      return;
    });
  }
});

async function checkTransactions() {
    const nflInfo = await axios.get('https://api.sleeper.app/v1/state/nfl')
    const nflWeek = nflInfo.data.leg > 0 ? nflInfo.data.leg : 1;
    const epochMillis = Math.round(Date.now());
    
    const subs = await supabase.from(process.env.SUBS_TABLE_NAME)
        .select();
    subs.data.forEach(async sub => {
        const channel = client.channels.cache.find(c => c.guild.id == sub.guild &&
            c.type == 'text' &&
            c.id == sub.channel);
        console.log(`Checking subscription for league: ${sub.league_id} for week ${nflWeek}`);
        const txns = await axios.get(`https://api.sleeper.app/v1/league/${sub.league_id}/transactions/${nflWeek}`)
        if(nflWeek > 1){
            const prevWeekTxns = await axios.get(`https://api.sleeper.app/v1/league/${sub.league_id}/transactions/${nflWeek-1}`)
            txns.data = txns.data.concat(prevWeekTxns.data);
        }
        const newTxns = txns.data.filter(txn => txn.status == 'complete' && txn.status_updated > sub.latest);
        if(newTxns.length > 0){
            const leagueRosters = await axios.get(`https://api.sleeper.app/v1/league/${sub.league_id}/rosters`).then(r => r.data);
            const leagueUsers = await axios.get(`https://api.sleeper.app/v1/league/${sub.league_id}/users`).then(r => r.data);
            newTxns.forEach(async txn => {
                const players = await playersResponse
                if(txn.type=='trade'){
                    const tradeMessage = buildTradeMessage(players, leagueRosters, leagueUsers, txn);
                    await channel.send(tradeMessage);          
                }
                if(txn.type=='waiver' || txn.type=='free_agent'){
                    const pickupMessage = buildPickupMessage(players, leagueRosters, leagueUsers, txn);
                    await channel.send(pickupMessage);          
                }
            })
        }
        const updatedSub = await updateSub(sub, epochMillis);
        console.log(`Finished checking subscription for league: ${updatedSub.data[0].league_id}`)
    });
};

async function checkDraftPicks() {
    const epochMillis = Math.round(Date.now());
    
    const subs = await supabase.from(process.env.DRAFT_TABLE_NAME)
        .select();
    subs.data.forEach(async sub => {
        const channel = client.channels.cache.find(c => c.guild.id == sub.guild &&
            c.type == 'text' &&
            c.id == sub.channel);
        //TODO - get team/player names
        const picks = await axios.get(`https://api.sleeper.app/v1/draft/${sub.draft_id}/picks`)
        const newPicks = picks.data.slice(sub.latest)
        console.log(newPicks)
        newPicks.forEach(async pick => {
            const pickMessage = pick.round + "." + draftSlot(pick) + ": " +pick.metadata.first_name + " " + pick.metadata.last_name;
            await channel.send(pickMessage); 
            await updateDraftSub(sub, pick.pick_no)
        });
    });
};

async function updateSub(sub, epochMillis){
    return await supabase.from(process.env.SUBS_TABLE_NAME)
        .update({latest: epochMillis})
        .match({guild: sub.guild, channel: sub.channel, league_id: sub.league_id})
        .then(r => {
            console.log(r);
            return r;
        })
        .catch(err => {
            console.log(err);
            throw err;
        });
}

async function updateDraftSub(sub, latest){
    return await supabase.from(process.env.DRAFT_TABLE_NAME)
        .update({latest: latest})
        .match({guild: sub.guild, channel: sub.channel, draft_id: sub.draft_id})
        .then(r => {
            console.log(r);
            return r;
        })
        .catch(err => {
            console.log(err);
            throw err;
        });
}

function buildPickupMessage(players, leagueRosters, leagueUsers, txn){
    const pickups = []
    const drops = []
    const txn_type = txn.type =='waiver' ? 'Waiver Claim' : 'Free Agent Move'
    const username = getUsernameForRosterId(leagueRosters, leagueUsers, txn.roster_ids[0]);
    const stringParts = [`__**${txn_type}**__\n**${username}**`];
    if(txn.adds){
        for (const [playerId, rosterId] of Object.entries(txn.adds)) {
            const playerName = players[playerId].full_name || players[playerId].first_name + " " + players[playerId].last_name
            pickups.push(`+ ${playerName}`);
        }
        stringParts.push(pickups.join('\n'));
    }
    if(txn.drops){
        for (const [playerId, rosterId] of Object.entries(txn.drops)) {
            const playerName = players[playerId].full_name || players[playerId].first_name + " " + players[playerId].last_name
            drops.push(`- ${playerName}`);
        }
        stringParts.push(drops.join('\n'));
    }
    return stringParts.join("\n");
}

function buildTradeMessage(players, leagueRosters, leagueUsers, txn){
    const trade = {}
    for (const [playerId, rosterId] of Object.entries(txn.adds)) {
        const username = getUsernameForRosterId(leagueRosters, leagueUsers, rosterId);
        const playerName = players[playerId].full_name || players[playerId].first_name + " " + players[playerId].last_name
        if (!trade[username]){
            trade[username] = []
        }
        trade[username].push(`+ ${playerName}`);
    }   
    txn.draft_picks.forEach(pick => {
        const username = getUsernameForRosterId(leagueRosters, leagueUsers, pick.owner_id);
        if (!trade[username]){
            trade[username] = []
        }
        trade[username].push(`+ ${pick.season} ${pick.round}`);
    })
    const stringParts = ["__**Trade**__"];
    for (const [username, tradeParts] of Object.entries(trade)) {
        stringParts.push(`**${username}**`);
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
        const epochMillis = Math.round(Date.now());
        supabase.from(process.env.SUBS_TABLE_NAME)
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

async function saveDraftSubscription(guildId, channelId, draftId, latestPick) {
    supabase.from(process.env.DRAFT_TABLE_NAME)
        .upsert([
            { guild: guildId, channel: channelId, draft_id: draftId, latest: latestPick }
        ]).then(dbRes => {
            console.log(dbRes)
            return true;
        }).catch(err => {
            msg.channel.send(`Couldn't save subscription to Sleeper league ${leagueId}`);
            return false;
        });
};

async function removeSubscription(guildId, channelId) {
    supabase.from(process.env.SUBS_TABLE_NAME)
        .delete()
        .match({ guild: guildId, channel: channelId })
        .then(dbRes => {
            return true;
        }).catch(err => {
            msg.channel.send(`Couldn't remove subscription to channel ${channelId} in guild ${guildId}`);
            return false;
        });
};

async function subscriptionExists(guildId, channelId, leagueId) {
    return await supabase.from(process.env.SUBS_TABLE_NAME)
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

async function channelSubscriptionExists(guildId, channelId) {
    return await supabase.from(process.env.SUBS_TABLE_NAME)
        .select()
        .eq('guild', guildId)
        .eq('channel', channelId)
        .then(dbRes => {
            return dbRes.data.length > 0;
        }).catch(err => {
            return false;
        });
}

function draftSlot(pick) {
    let num = pick.draft_slot
    if(pick.round % 2 == 0) {
        num = 11-pick.draft_slot
    }
    num = num.toString();
    while (num.length < 2) num = "0" + num;
    return num;
}

//TODO - add slash command ("add sleeper league subscription") rather than !add-sub