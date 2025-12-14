const Discord = require('discord.js');
const { ActivityType } = Discord;
const loadSlashCommands = require("../Loaders/loadSlashCommands");
const { startWebServer } = require("../Web/webServer");

module.exports = async client => {
    try {
        await loadSlashCommands(client);

        console.log(`Le bot est en ligne ! ID: ${client.user.tag}`);
        startWebServer(client);

        // Définir l'activité initiale
        const guild = client.guilds.cache.first();
        if (guild) {
            const memberCount = guild.memberCount;
            client.user.setActivity(`${memberCount} membres`, { type: ActivityType.Watching });
            console.log(`📊 Activité initiale: Watching ${memberCount} membres`);
        }

        // Notification initiale
        const channelId = '1430581638856708288';
        const channel = await client.channels.fetch(channelId).catch(console.error);
        if (channel) {
            await channel.send('Le bot est en ligne 🚀 !');
            await channel.send('https://tenor.com/view/waddle-waddle-bitcoin-runes-pengu-waddle-waddle-pengu-gif-14234498873207878683');
        }

    } catch (error) {
        console.error('Erreur dans l\'événement ready:', error);
    }
};