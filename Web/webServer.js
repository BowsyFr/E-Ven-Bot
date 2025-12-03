const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const qs = require('qs');

let io;

// Configuration OAuth2
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const GUILD_ID = process.env.GUILD_ID;

// Sessions simples en mémoire (pour production, utiliser Redis ou une DB)
const sessions = new Map();

function generateSessionId() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

async function dataURLToAttachment(dataUrl, fileName) {
    const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);

    if (!matches || matches.length !== 3) {
        throw new Error('Format de data URL invalide');
    }

    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    return new AttachmentBuilder(buffer, { name: fileName });
}

// Middleware pour vérifier l'authentification
function requireAuth(req, res, next) {
    const sessionId = req.cookies?.sessionId;

    if (!sessionId || !sessions.has(sessionId)) {
        return res.redirect('/');
    }

    const session = sessions.get(sessionId);

    // Vérifier si la session n'a pas expiré (24h)
    if (Date.now() - session.createdAt > 24 * 60 * 60 * 1000) {
        sessions.delete(sessionId);
        return res.redirect('/');
    }

    req.user = session.user;
    next();
}

function startWebServer(client) {
    const app = express();
    const server = http.createServer(app);
    io = new Server(server, {
        maxHttpBufferSize: 10e6
    });

    const PORT = process.env.PORT;
    const REDIRECT_URI = process.env.REDIRECT_URI;

    // Middleware pour parser les cookies
    app.use((req, res, next) => {
        const cookies = {};
        const cookieHeader = req.headers.cookie;
        if (cookieHeader) {
            cookieHeader.split(';').forEach(cookie => {
                const [name, value] = cookie.trim().split('=');
                cookies[name] = value;
            });
        }
        req.cookies = cookies;
        next();
    });

    // Page d'accueil / Welcome
    app.get('/', (req, res) => {
        const sessionId = req.cookies?.sessionId;

        if (sessionId && sessions.has(sessionId)) {
            return res.redirect('/composer');
        }

        res.sendFile(__dirname + '/public/welcome.html');
    });

    // Route de login
    app.get('/login', (req, res) => {
        const scope = 'identify guilds guilds.members.read';
        const authUrl = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(scope)}`;
        res.redirect(authUrl);
    });

    // Callback OAuth2
    app.get('/callback', async (req, res) => {
        const { code } = req.query;

        if (!code) {
            return res.redirect('/?error=no_code');
        }

        try {
            // Échanger le code contre un token
            const tokenResponse = await axios.post(
                'https://discord.com/api/oauth2/token',
                qs.stringify({
                    client_id: CLIENT_ID,
                    client_secret: CLIENT_SECRET,
                    grant_type: 'authorization_code',
                    redirect_uri: REDIRECT_URI,
                    code
                }),
                { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
            );

            const accessToken = tokenResponse.data.access_token;

            // Récupérer les infos de l'utilisateur
            const userResponse = await axios.get('https://discord.com/api/users/@me', {
                headers: { Authorization: `Bearer ${accessToken}` }
            });

            const user = userResponse.data;

            // Vérifier les permissions dans le serveur
            const memberResponse = await axios.get(
                `https://discord.com/api/users/@me/guilds/${GUILD_ID}/member`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );

            const member = memberResponse.data;
            const perms = BigInt(member.permissions);
            const isAdmin = (perms & 0x8n) === 0x8n; // Permission ADMINISTRATOR

            if (!isAdmin) {
                return res.send(`
                    <!DOCTYPE html>
                    <html lang="fr">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Accès refusé - E-Ven</title>
                        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
                        <link rel="stylesheet" href="/styles.css">
                    </head>
                    <body>
                        <div style="display: flex; justify-content: center; align-items: center; min-height: 100vh; text-align: center;">
                            <div style="background: white; padding: 40px; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); max-width: 500px;">
                                <h1 style="color: #ed4245; margin-bottom: 20px;">❌ Accès refusé</h1>
                                <p style="color: #555; margin-bottom: 30px;">Vous devez être administrateur du serveur pour accéder à cette interface.</p>
                                <a href="/" class="btn btn-primary" style="display: inline-block; text-decoration: none; padding: 12px 24px; background: #5865F2; color: white; border-radius: 8px; font-weight: 600;">Retour à l'accueil</a>
                            </div>
                        </div>
                    </body>
                    </html>
                `);
            }

            // Créer une session
            const sessionId = generateSessionId();
            sessions.set(sessionId, {
                user: {
                    id: user.id,
                    username: user.username,
                    discriminator: user.discriminator,
                    avatar: user.avatar
                },
                createdAt: Date.now()
            });

            // Définir le cookie de session
            res.setHeader('Set-Cookie', `sessionId=${sessionId}; Path=/; HttpOnly; Max-Age=${24 * 60 * 60}`);
            res.redirect('/composer');

        } catch (error) {
            console.error('Erreur OAuth2:', error.response?.data || error.message);
            res.redirect('/?error=auth_failed');
        }
    });

    // Route de déconnexion
    app.get('/logout', (req, res) => {
        const sessionId = req.cookies?.sessionId;
        if (sessionId) {
            sessions.delete(sessionId);
        }
        res.setHeader('Set-Cookie', 'sessionId=; Path=/; HttpOnly; Max-Age=0');
        res.redirect('/');
    });

    // Route du composer (protégée)
    app.get('/composer', requireAuth, (req, res) => {
        res.sendFile(__dirname + '/public/index.html');
    });

    // Servir les fichiers statiques
    app.use(express.static(__dirname + '/public'));

    server.listen(PORT, () => {
        console.log(`🌐 Serveur web E-Ven en ligne sur http://localhost:${PORT}`);
    });

    // Socket.IO avec vérification d'authentification
    io.on('connection', async (socket) => {
        const cookies = {};
        const cookieHeader = socket.handshake.headers.cookie;
        if (cookieHeader) {
            cookieHeader.split(';').forEach(cookie => {
                const [name, value] = cookie.trim().split('=');
                cookies[name] = value;
            });
        }

        const sessionId = cookies.sessionId;

        if (!sessionId || !sessions.has(sessionId)) {
            console.log('❌ Tentative de connexion Socket.IO non autorisée');
            socket.disconnect();
            return;
        }

        const session = sessions.get(sessionId);
        console.log(`👀 ${session.user.username} a ouvert le composer`);

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

        socket.on('sendMessage', async (messageData) => {
            try {
                const channel = await client.channels.fetch(messageData.channelId);

                if (!channel) {
                    socket.emit('messageSent', { success: false, error: 'Salon introuvable' });
                    return;
                }

                const payload = {};
                payload.files = [];

                if (messageData.content) {
                    payload.content = messageData.content;
                }

                try {
                    if (messageData.attachment && messageData.attachment.data) {
                        const attachment = await dataURLToAttachment(messageData.attachment.data, messageData.attachment.name || 'attachment.png');
                        payload.files.push(attachment);
                    }

                    if (messageData.embedUrlAttachment && messageData.embedUrlAttachment.data) {
                        const attachment = await dataURLToAttachment(messageData.embedUrlAttachment.data, messageData.embedUrlAttachment.name || 'url_image.png');
                        payload.files.push(attachment);
                    }

                    if (messageData.embedAuthorIconAttachment && messageData.embedAuthorIconAttachment.data) {
                        const attachment = await dataURLToAttachment(messageData.embedAuthorIconAttachment.data, messageData.embedAuthorIconAttachment.name || 'author_icon.png');
                        payload.files.push(attachment);
                    }

                    if (messageData.embedFooterIconAttachment && messageData.embedFooterIconAttachment.data) {
                        const attachment = await dataURLToAttachment(messageData.embedFooterIconAttachment.data, messageData.embedFooterIconAttachment.name || 'footer_icon.png');
                        payload.files.push(attachment);
                    }

                    if (messageData.embedThumbnailAttachment && messageData.embedThumbnailAttachment.data) {
                        const attachment = await dataURLToAttachment(messageData.embedThumbnailAttachment.data, messageData.embedThumbnailAttachment.name || 'thumbnail.png');
                        payload.files.push(attachment);
                    }

                    if (messageData.embedImageAttachment && messageData.embedImageAttachment.data) {
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

                    if (messageData.embed.url) {
                        embed.setURL(messageData.embed.url);
                    }

                    if (messageData.embed.author) {
                        embed.setAuthor({
                            name: messageData.embed.author.name,
                            iconURL: messageData.embed.author.icon_url
                        });
                    }

                    if (messageData.embed.thumbnail) {
                        embed.setThumbnail(messageData.embed.thumbnail.url);
                    }

                    if (messageData.embed.image) {
                        embed.setImage(messageData.embed.image.url);
                    }

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

                const totalFiles = payload.files ? payload.files.length : 0;
                if (!payload.content && (!payload.embeds || payload.embeds.length === 0) && (!payload.components || payload.components.length === 0) && totalFiles === 0) {
                    socket.emit('messageSent', { success: false, error: 'Le message est vide' });
                    return;
                }

                console.log(`📤 ${session.user.username} envoie un message avec ${totalFiles} fichier(s)`);

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
            console.log(`👋 ${session.user.username} a quitté le composer`);
        });
    });
}

module.exports = { startWebServer };