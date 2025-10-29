const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, AttachmentBuilder } = require('discord.js');

let io;

async function dataURLToAttachment(dataUrl, fileName) {
    // Extraire les données base64 du data URL
    const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);

    if (!matches || matches.length !== 3) {
        throw new Error('Format de data URL invalide');
    }

    // Convertir base64 en Buffer
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    return new AttachmentBuilder(buffer, { name: fileName });
}

function startWebServer(client) {
  const app = express();
  const server = http.createServer(app);
  io = new Server(server, {
    maxHttpBufferSize: 10e6 // 10 MB pour permettre l'upload d'images
  });

  const PORT = process.env.PORT || 3000;

  app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
  });

  app.use(express.static(__dirname + '/public'));

  server.listen(PORT, () => {
    console.log(`🌐 Serveur web E-Ven en ligne sur http://localhost:${PORT}`);
  });

  io.on('connection', async (socket) => {
    console.log('👀 Un visiteur a ouvert la page');

    // Envoyer les informations du Bot
    socket.on('getBotInfo', () => {
        try {
            const botInfo = {
                username: client.user.username,
                avatarURL: client.user.displayAvatarURL({ extension: 'png', size: 128 })
            };
            socket.emit('botInfo', botInfo);
        } catch (error) {
            console.error('Erreur lors de la récupération des infos du bot:', error);
            socket.emit('botInfo', { username: 'Bot E-Ven', avatarURL: '' });
        }
    });

    // Envoyer la liste des salons
    socket.on('getChannels', async () => {
      try {
        const guild = client.guilds.cache.first();
        if (!guild) {
          socket.emit('channelsList', []);
          return;
        }

        const channels = guild.channels.cache
          .filter(channel => channel.isTextBased() && channel.type === 0)
          .map(channel => ({
            id: channel.id,
            name: channel.name
          }))
          .sort((a, b) => a.name.localeCompare(b.name));

        socket.emit('channelsList', channels);
      } catch (error) {
        console.error('Erreur lors de la récupération des salons:', error);
        socket.emit('channelsList', []);
      }
    });

    // Envoyer la liste des rôles
    socket.on('getRoles', async () => {
        try {
            const guild = client.guilds.cache.first();
            if (!guild) {
                socket.emit('rolesList', []);
                return;
            }

            const roles = guild.roles.cache
                .filter(role => !role.managed && role.id !== guild.id)
                .map(role => ({
                    id: role.id,
                    name: role.name,
                    color: role.hexColor === '#000000' ? null : role.hexColor,
                    type: 'role'
                }))
                .sort((a, b) => a.position - b.position)
                .reverse();

            socket.emit('rolesList', roles);
        } catch (error) {
            console.error('Erreur lors de la récupération des rôles:', error);
            socket.emit('rolesList', []);
        }
    });

    // Envoyer la liste des emojis custom
    socket.on('getCustomEmojis', async () => {
        try {
            const guild = client.guilds.cache.first();
            if (!guild) {
                socket.emit('customEmojisList', []);
                return;
            }

            await guild.emojis.fetch();

            const emojis = guild.emojis.cache
                .map(emoji => ({
                    id: emoji.id,
                    name: emoji.name,
                    url: emoji.url,
                    animated: emoji.animated
                }))
                .sort((a, b) => a.name.localeCompare(b.name));

            socket.emit('customEmojisList', emojis);
        } catch (error) {
            console.error('Erreur lors de la récupération des émojis:', error);
            socket.emit('customEmojisList', []);
        }
    });


    // Envoyer un message
    socket.on('sendMessage', async (messageData) => {
      try {
        const channel = await client.channels.fetch(messageData.channelId);

        if (!channel) {
          socket.emit('messageSent', { success: false, error: 'Salon introuvable' });
          return;
        }

        const payload = {};
        payload.files = []; // Initialiser le tableau de fichiers

        // Contenu texte
        if (messageData.content) {
          payload.content = messageData.content;
        }

        // Gérer les attachements (message simple et embed)
        try {
            if (messageData.attachment && messageData.attachment.data) {
                console.log('📎 Traitement attachment principal...');
                const attachment = await dataURLToAttachment(messageData.attachment.data, messageData.attachment.name || 'attachment.png');
                payload.files.push(attachment);
            }

            if (messageData.embedUrlAttachment && messageData.embedUrlAttachment.data) {
                console.log('📎 Traitement embedUrlAttachment...');
                const attachment = await dataURLToAttachment(messageData.embedUrlAttachment.data, messageData.embedUrlAttachment.name || 'url_image.png');
                payload.files.push(attachment);
            }

            if (messageData.embedAuthorIconAttachment && messageData.embedAuthorIconAttachment.data) {
                console.log('📎 Traitement embedAuthorIconAttachment...');
                const attachment = await dataURLToAttachment(messageData.embedAuthorIconAttachment.data, messageData.embedAuthorIconAttachment.name || 'author_icon.png');
                payload.files.push(attachment);
            }

            if (messageData.embedFooterIconAttachment && messageData.embedFooterIconAttachment.data) {
                console.log('📎 Traitement embedFooterIconAttachment...');
                const attachment = await dataURLToAttachment(messageData.embedFooterIconAttachment.data, messageData.embedFooterIconAttachment.name || 'footer_icon.png');
                payload.files.push(attachment);
            }

            if (messageData.embedThumbnailAttachment && messageData.embedThumbnailAttachment.data) {
                console.log('📎 Traitement embedThumbnailAttachment...');
                const attachment = await dataURLToAttachment(messageData.embedThumbnailAttachment.data, messageData.embedThumbnailAttachment.name || 'thumbnail.png');
                payload.files.push(attachment);
            }

            if (messageData.embedImageAttachment && messageData.embedImageAttachment.data) {
                console.log('📎 Traitement embedImageAttachment...');
                const attachment = await dataURLToAttachment(messageData.embedImageAttachment.data, messageData.embedImageAttachment.name || 'image.png');
                payload.files.push(attachment);
            }
        } catch (attachError) {
            console.error('Erreur lors du traitement des attachments:', attachError);
            socket.emit('messageSent', {
                success: false,
                error: 'Erreur lors du traitement des fichiers: ' + attachError.message
            });
            return;
        }


        // Embed
        if (messageData.embed) {
          const embed = new EmbedBuilder();

          if (messageData.embed.color) {
            embed.setColor(messageData.embed.color);
          }

          if (messageData.embed.title) {
            embed.setTitle(messageData.embed.title);
          }

          if (messageData.embed.description) {
            embed.setDescription(messageData.embed.description);
          }

          // L'URL du titre peut être une URL standard ou 'attachment://...'
          if (messageData.embed.url) {
            embed.setURL(messageData.embed.url);
          }

          // Author
          if (messageData.embed.author) {
            embed.setAuthor({
              name: messageData.embed.author.name,
              iconURL: messageData.embed.author.icon_url
            });
          }

          // Thumbnail
          if (messageData.embed.thumbnail) {
            embed.setThumbnail(messageData.embed.thumbnail.url);
          }

          if (messageData.embed.image) {
            embed.setImage(messageData.embed.image.url);
          }

          // Footer
          if (messageData.embed.footer) {
            embed.setFooter({
              text: messageData.embed.footer.text,
              iconURL: messageData.embed.footer.icon_url
            });
          }

          if (messageData.embed.timestamp) {
            embed.setTimestamp(new Date(messageData.embed.timestamp));
          }

          if (messageData.embed.fields && messageData.embed.fields.length > 0) {
            messageData.embed.fields.forEach(field => {
              embed.addFields({
                name: field.name,
                value: field.value,
                inline: field.inline || false
              });
            });
          }

          payload.embeds = [embed];
        }

        // Boutons
        if (messageData.buttons && messageData.buttons.length > 0) {
          const row = new ActionRowBuilder();

          messageData.buttons.forEach(button => {
            const buttonStyleMap = {
              'primary': ButtonStyle.Primary,
              'secondary': ButtonStyle.Secondary,
              'success': ButtonStyle.Success,
              'danger': ButtonStyle.Danger,
              'link': ButtonStyle.Link
            };

            const btn = new ButtonBuilder()
              .setLabel(button.label)
              .setStyle(buttonStyleMap[button.style] || ButtonStyle.Primary);

            if (button.style === 'link') {
              if (!button.url) return;
              btn.setURL(button.url);
            } else {
              btn.setCustomId(`btn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
            }

            row.addComponents(btn);
          });

          if (row.components.length > 0) {
              payload.components = [row];
          }
        }

        // Vérifier qu'il y a du contenu
        const totalFiles = payload.files ? payload.files.length : 0;
        if (!payload.content && (!payload.embeds || payload.embeds.length === 0) && (!payload.components || payload.components.length === 0) && totalFiles === 0) {
            socket.emit('messageSent', { success: false, error: 'Le message est vide' });
            return;
        }

        console.log(`📤 Envoi du message avec ${totalFiles} fichier(s)`);

        // Envoyer le message
        await channel.send(payload);
        socket.emit('messageSent', { success: true });

      } catch (error) {
        console.error('Erreur lors de l\'envoi du message:', error);
        socket.emit('messageSent', {
          success: false,
          error: error.message || 'Erreur inconnue'
        });
      }
    });

    socket.on('disconnect', () => {
      console.log('👋 Un visiteur a quitté la page');
    });
  });
}

module.exports = { startWebServer };