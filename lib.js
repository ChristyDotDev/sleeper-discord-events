function buildPickupMessage(players, leagueRosters, leagueUsers, txn) {
    const pickups = [];
    const drops = [];
    const txn_type = txn.type === 'waiver' ? 'Waiver Claim' : 'Free Agent Move';
    const username = getUsernameForRosterId(leagueRosters, leagueUsers, txn.roster_ids[0]);
    const stringParts = [`__**${txn_type}**__\n**${username}**`];
    if (txn.adds) {
        for (const [playerId] of Object.entries(txn.adds)) {
            const playerName = players[playerId].full_name || (players[playerId].first_name + " " + players[playerId].last_name);
            pickups.push(`+${playerName}`);
        }
        stringParts.push(pickups.join('\n'));
    }
    if (txn.drops) {
        for (const [playerId] of Object.entries(txn.drops)) {
            const playerName = players[playerId].full_name || (players[playerId].first_name + " " + players[playerId].last_name);
            drops.push(`-${playerName}`);
        }
        stringParts.push(drops.join('\n'));
    }
    return stringParts.join("\n");
}

function buildTradeMessage(players, leagueRosters, leagueUsers, txn) {
    const trade = {};
    if (txn.adds) {
        for (const [playerId, rosterId] of Object.entries(txn.adds)) {
            const username = getUsernameForRosterId(leagueRosters, leagueUsers, rosterId);
            const playerName = players[playerId].full_name || (players[playerId].first_name + " " + players[playerId].last_name);
            if (!trade[username]) {
                trade[username] = [];
            }
            trade[username].push(`+ ${playerName}`);
        }
    }
    if (txn.draft_picks) {
        txn.draft_picks.forEach(pick => {
            const username = getUsernameForRosterId(leagueRosters, leagueUsers, pick.owner_id);
            if (!trade[username]) {
                trade[username] = [];
            }
            trade[username].push(`+ ${pick.season} ${pick.round}`);
        });
    }
    const stringParts = ["__**Trade**__"];
    for (const [username, tradeParts] of Object.entries(trade)) {
        stringParts.push(`**${username}**`);
        stringParts.push(tradeParts.join('\n'));
    }
    return stringParts.join("\n");
}

function getUsernameForRosterId(rosters, users, rosterId) {
    const roster = rosters.find(r => {
        return r.roster_id === rosterId;
    });
    const user = users.find(u => {
        return u.user_id === roster.owner_id;
    });
    const username = user && user.display_name;
    return username || "Unknown";
}

function draftSlot(pick) {
    let num = pick.draft_slot;
    if (pick.round % 2 === 0) {
        num = 11 - pick.draft_slot;
    }
    num = num.toString();
    while (num.length < 2) num = "0" + num;
    return num;
}

module.exports = {
    buildPickupMessage,
    buildTradeMessage,
    getUsernameForRosterId,
    draftSlot,
};

