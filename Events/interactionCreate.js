const Discord = require('discord.js');

module.exports = async (client, interaction) => {
    try {
        // Gérer les slash commands
        if (interaction.type === Discord.InteractionType.ApplicationCommand) {
            const command = client.commands.get(interaction.commandName);

            if (!command) {
                return await interaction.reply({
                    content: '❌ Cette commande n\'existe pas.',
                    ephemeral: true
                });
            }

            try {
                await command.run(client, interaction);
            } catch (error) {
                console.error(`Erreur lors de l'exécution de ${interaction.commandName}:`, error);

                const errorMessage = {
                    content: '❌ Une erreur est survenue lors de l\'exécution de cette commande.',
                    ephemeral: true
                };

                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(errorMessage);
                } else {
                    await interaction.reply(errorMessage);
                }
            }
        }

        // Gérer les interactions de boutons
        if (interaction.type === Discord.InteractionType.MessageComponent) {
            if (interaction.componentType === Discord.ComponentType.Button) {
                const customId = interaction.customId;

                console.log(`🔘 Bouton cliqué: ${customId} par ${interaction.user.tag}`);

                await interaction.reply({
                    content: '⚠️ Cette interaction n\'est pas encore configurée.',
                    ephemeral: true
                });
            }

            if (interaction.componentType === Discord.ComponentType.StringSelect) {
                console.log(`📋 Menu sélection: ${interaction.customId} par ${interaction.user.tag}`);

                await interaction.reply({
                    content: `Vous avez sélectionné: ${interaction.values.join(', ')}`,
                    ephemeral: true
                });
            }
        }

        // Gérer les autocomplete
        if (interaction.type === Discord.InteractionType.ApplicationCommandAutocomplete) {
            const command = client.commands.get(interaction.commandName);

            if (command && command.autocomplete) {
                try {
                    await command.autocomplete(client, interaction);
                } catch (error) {
                    console.error(`Erreur autocomplete pour ${interaction.commandName}:`, error);
                }
            }
        }

    } catch (error) {
        console.error('Erreur dans interactionCreate:', error);
    }
};