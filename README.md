# Sleeper Discord Notifications

This bot can be added to your Discord server and allows you to subscribe to transactions in your Sleeper fantasy football league (at the time of writing it handles trades/adds and drops). 

## Notifications format

For now, the notification is quite a simple text message. An Example of a drop message:

<img width="412" alt="Screenshot 2021-09-08 at 21 49 33" src="https://user-images.githubusercontent.com/6845036/132583626-98d955cd-600d-49fd-ab08-c3fcf2bda0fe.png">

I'm hoping to prettify them a bit later

## Known Issues

Please check the Issues tab in github to see known issues or raise new ones

## Bot limits

I've not implemented any limits on how many subscriptions you can add per server so please be sensible. Adding a "one league per server" rule would be quite easy, but I don't really want to have to

## Adding your league subscription

### Adding the bot to your server

Adding the bot is simple. Click the link below to add it to your Discord server

[<img src="https://user-images.githubusercontent.com/6845036/132582011-11cf086f-af8f-467f-9399-cc1211cbb0e9.png">](https://discord.com/api/oauth2/authorize?client_id=878165405728919573&scope=bot&permissions=54224170048)

If the channel you are subscribing in has some locked down permissions, please make sure the bot has [permissions](https://discord.com/developers/docs/topics/permissions) to view and send messages

### Subscribing to a league's transactions

Once the bot is added, to subscribe to a league on Sleeper grab the league ID from the URL and send the following command in the discord channel

`!sleeper-subscribe 1111111`

Where 111111 is your league ID. You should get a message from the bot in response saying something like "Subscribed to league YourleagueName"

The bot runs on a schedule so notifications will not be immediate but will appear when it's doing it's scheduled run.

### Unsubscribing from a league

Running `!sleeper-unsubscribe` in a channel will remove any subscriptions associated with it and no notifications should be sent.
