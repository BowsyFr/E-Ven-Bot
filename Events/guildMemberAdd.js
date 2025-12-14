const { ActivityType } = require('discord.js');

module.exports = async (client, member) => {
    try {
        // Mettre à jour l'activité du bot
        const memberCount = member.guild.memberCount;
        client.user.setActivity(`${memberCount} membres`, { type: ActivityType.Watching });
        console.log(`👋 ${member.user.tag} a rejoint le serveur | Membres: ${memberCount}`);
    } catch (error) {
        console.error('Erreur dans guildMemberAdd:', error);
    }
};