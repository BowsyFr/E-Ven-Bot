const Discord = require('discord.js');

module.exports = {
    name: "info",
    description: "Affiche les informations du bot",
    permission: "no",
    dm: true,

    async run(client, message) {
        const embed = new Discord.EmbedBuilder()
            .setColor('#f5aa20') // Couleur de l'embed
            .setTitle("🤖 Informations sur L'E-ven Bot")
            .setDescription("Bonjour ! Je suis l'**E-Ven Bot**, le bot officiel du serveur Discord d'E-Ven Community.")
            .addFields(
                { name: '👨‍💻 Développeur', value: `<@909874998934646855>`, inline: true }, // Mention du développeur
                { name: '🌐 Hébergeur', value: '[Oracle](https://www.oracle.com/)', inline: true },
                { name: '\u200B', value: '\u200B' }, // Espace vide pour séparer les sections
                { name: '📜 Conditions Générales d’Utilisation', value: 'Work in Progress', inline: false },
                { name: '🔒 Politique de Confidentialité', value: 'Work in Progress', inline: false },
                { name: '\u200B', value: '\u200B' }, // Espace vide pour séparer les sections
            )
            .setFooter({ text: 'E-Ven Bot - Bot officiel de E-Ven Community', iconURL: client.user.displayAvatarURL() })
            .setTimestamp();

        // Vérifier si la commande est exécutée en DM ou dans un serveur
        if (message.guild) {
            // Envoyer un message éphémère dans un serveur
            await message.reply({ embeds: [embed], ephemeral: true });
        } else {
            // Envoyer un message normal en DM
            await message.reply({ embeds: [embed] });
        }
    }
};
