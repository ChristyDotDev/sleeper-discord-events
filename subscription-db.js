const createClient = require('@supabase/supabase-js').createClient
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

function saveSubscription(league_id, channel_id){
    console.log("SAVING SUBSCRIPTION");
    supabase.from('sleeper-subs')
        .insert([
            { channel: channel_id, league_id: league_id }
        ]).then(dbRes => {
            return true;
        }).catch(err => {
            console.log(err)
            msg.channel.send(`Couldn't save subscription to Sleeper league ${league_id}`);
            return false;
        });
}