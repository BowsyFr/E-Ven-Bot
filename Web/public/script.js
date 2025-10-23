const socket = io();

// État global
let fields = [];
let buttons = [];
let roles = [];
let channels = [];
let customEmojis = [];
let botInfo = {};
let messageAttachment = null; // Pièce jointe du message simple
let embedUrlAttachment = null; // NOUVEAU: Pièce jointe pour l'URL du titre
let embedAuthorIconAttachment = null; // NOUVEAU: Pièce jointe pour l'icône de l'auteur
let embedFooterIconAttachment = null; // NOUVEAU: Pièce jointe pour l'icône du footer
let embedThumbnailAttachment = null; // Pièce jointe pour le thumbnail d'embed
let embedImageAttachment = null; // Pièce jointe pour l'image principale d'embed

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    loadChannels();
    loadMentionData();
    setupEventListeners();
    updatePreview();
    renderFields();
    renderButtons();
});

// Charger les salons, rôles, émojis et infos bot
function loadChannels() {
    socket.emit('getChannels');
}

function loadMentionData() {
    socket.emit('getRoles');
    socket.emit('getCustomEmojis');
    socket.emit('getBotInfo');
}

socket.on('channelsList', (channelList) => {
    channels = channelList;
    const select = document.getElementById('channelSelect');
    select.innerHTML = '<option value="">Sélectionnez un salon...</option>';

    channels.forEach(channel => {
        const option = document.createElement('option');
        option.value = channel.id;
        option.textContent = `# ${channel.name}`;
        select.appendChild(option);
    });
});

socket.on('rolesList', (roleList) => {
    roles = roleList;
    if (document.getElementById('mentionModal').classList.contains('active')) {
        renderMentionList('roles');
    }
});

socket.on('customEmojisList', (emojiList) => {
    customEmojis = emojiList;
    renderCustomEmojis();
});

socket.on('botInfo', (info) => {
    botInfo = info;
    document.getElementById('preview-bot-username').textContent = botInfo.username;
    document.getElementById('preview-bot-avatar').src = botInfo.avatarURL;
    updatePreview();
});

// Configuration des écouteurs d'événements
function setupEventListeners() {
    // Toggle embed
    document.getElementById('enableEmbed').addEventListener('change', (e) => {
        document.getElementById('embedOptions').style.display = e.target.checked ? 'block' : 'none';
        updatePreview();
    });

    // Color picker sync
    const colorPicker = document.getElementById('embedColor');
    const colorHex = document.getElementById('embedColorHex');

    colorPicker.addEventListener('input', (e) => {
        colorHex.value = e.target.value.toUpperCase();
        updatePreview();
    });

    colorHex.addEventListener('input', (e) => {
        if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
            colorPicker.value = e.target.value;
            updatePreview();
        }
    });

    // Tous les champs du formulaire (pour la prévisualisation)
    const previewInputs = document.querySelectorAll('.input, input[type="checkbox"]');
    previewInputs.forEach(input => {
        input.addEventListener('input', updatePreview);
        input.addEventListener('change', updatePreview);
    });

    // Boutons d'action
    document.getElementById('addFieldBtn').addEventListener('click', addField);
    document.getElementById('addButtonBtn').addEventListener('click', addButton);
    document.getElementById('sendMessageBtn').addEventListener('click', sendMessage);
    document.getElementById('previewBtn').addEventListener('click', updatePreview);
    document.getElementById('resetBtn').addEventListener('click', resetForm);

    // Nouveaux Listeners pour les modales
    document.getElementById('openMentionModalBtn').addEventListener('click', () => openModal('mentionModal'));
    document.getElementById('openEmojiModalBtn').addEventListener('click', () => openModal('emojiModal'));

    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', (e) => closeModal(e.target.dataset.modal));
    });

    // Clic sur l'overlay pour fermer
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                closeModal(e.target.id);
            }
        });
    });

    // Tabs dans les modales
    document.getElementById('mentionTabs').addEventListener('click', handleMentionTabClick);
    document.getElementById('emojiTabs').addEventListener('click', handleEmojiTabClick);

    // Emojis standard
    document.getElementById('standardEmojiGrid').addEventListener('click', handleStandardEmojiClick);

    // DÉBUT: Configuration des zones de Drag & Drop/Sélection pour TOUS les attachements
    const dropAreas = [
        { id: 'dropArea', type: 'message' },
        { id: 'embedUrlDropArea', type: 'url' }, // NOUVEAU
        { id: 'embedAuthorIconDropArea', type: 'authorIcon' }, // NOUVEAU
        { id: 'embedFooterIconDropArea', type: 'footerIcon' }, // NOUVEAU
        { id: 'embedThumbnailDropArea', type: 'thumbnail' },
        { id: 'embedImageDropArea', type: 'image' }
    ];

    dropAreas.forEach(item => {
        const area = document.getElementById(item.id);
        if (area) {
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                area.addEventListener(eventName, preventDefaults, false);
            });
            ['dragenter', 'dragover'].forEach(eventName => {
                area.addEventListener(eventName, () => area.classList.add('drag-over'), false);
            });
            ['dragleave', 'drop'].forEach(eventName => {
                area.addEventListener(eventName, () => area.classList.remove('drag-over'), false);
            });
            area.addEventListener('drop', (e) => handleDrop(e, item.type), false);
        }

        const fileInput = document.getElementById(item.type + 'FileInput'); // fileInput, embedUrlFileInput, etc.
        if (fileInput) {
            fileInput.addEventListener('change', (e) => handleFileSelect(e, item.type));
        }

        const removeBtn = document.getElementById('remove' + item.type.charAt(0).toUpperCase() + item.type.slice(1) + 'Btn'); // removeAttachmentBtn, removeEmbedUrlBtn, etc.
        if (removeBtn) {
            removeBtn.addEventListener('click', () => removeAttachment(item.type));
        }
    });

    // Correction de l'ID du bouton du message simple
    const removeAttachmentBtn = document.getElementById('removeAttachmentBtn');
    if (removeAttachmentBtn) {
         removeAttachmentBtn.addEventListener('click', () => removeAttachment('message'));
    }
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', (e) => handleFileSelect(e, 'message'));
    }

    // FIN: Configuration des zones de Drag & Drop/Sélection
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function handleDrop(e, type) {
    const dt = e.dataTransfer;
    const files = dt.files;

    if (files.length) {
        handleFile(files[0], type);
    }
}

function handleFileSelect(e, type) {
    const files = e.target.files;
    if (files.length) {
        handleFile(files[0], type);
    }
}

function handleFile(file, type) {
    if (!file.type.startsWith('image/')) {
        showStatus('Le fichier doit être une image.', 'error');
        return;
    }

    let attachmentVar, attachmentName, attachmentPreview, fileInput, urlInputId, urlInput;

    switch (type) {
        case 'message':
            attachmentVar = 'messageAttachment';
            attachmentName = document.getElementById('attachmentName');
            attachmentPreview = document.getElementById('attachmentPreview');
            fileInput = document.getElementById('fileInput');
            break;
        case 'url': // NOUVEAU
            attachmentVar = 'embedUrlAttachment';
            attachmentName = document.getElementById('embedUrlName');
            attachmentPreview = document.getElementById('embedUrlPreview');
            fileInput = document.getElementById('embedUrlFileInput');
            urlInputId = 'embedUrl';
            urlInput = document.getElementById(urlInputId);
            break;
        case 'authorIcon': // NOUVEAU
            attachmentVar = 'embedAuthorIconAttachment';
            attachmentName = document.getElementById('embedAuthorIconName');
            attachmentPreview = document.getElementById('embedAuthorIconPreview');
            fileInput = document.getElementById('embedAuthorIconFileInput');
            urlInputId = 'embedAuthorIcon';
            urlInput = document.getElementById(urlInputId);
            break;
        case 'footerIcon': // NOUVEAU
            attachmentVar = 'embedFooterIconAttachment';
            attachmentName = document.getElementById('embedFooterIconName');
            attachmentPreview = document.getElementById('embedFooterIconPreview');
            fileInput = document.getElementById('embedFooterIconFileInput');
            urlInputId = 'embedFooterIcon';
            urlInput = document.getElementById(urlInputId);
            break;
        case 'thumbnail':
            attachmentVar = 'embedThumbnailAttachment';
            attachmentName = document.getElementById('embedThumbnailName');
            attachmentPreview = document.getElementById('embedThumbnailPreview');
            fileInput = document.getElementById('embedThumbnailFileInput');
            urlInputId = 'embedThumbnailUrl';
            urlInput = document.getElementById(urlInputId);
            break;
        case 'image':
            attachmentVar = 'embedImageAttachment';
            attachmentName = document.getElementById('embedImageName');
            attachmentPreview = document.getElementById('embedImagePreview');
            fileInput = document.getElementById('embedImageFileInput');
            urlInputId = 'embedImageUrl';
            urlInput = document.getElementById(urlInputId);
            break;
        default:
            return;
    }

    // Assigner le fichier à la variable d'état globale et nettoyer l'URL
    if (attachmentVar === 'messageAttachment') {
        messageAttachment = file;
    } else if (attachmentVar === 'embedUrlAttachment') {
        embedUrlAttachment = file;
        if (urlInput) urlInput.value = '';
    } else if (attachmentVar === 'embedAuthorIconAttachment') {
        embedAuthorIconAttachment = file;
        if (urlInput) urlInput.value = '';
    } else if (attachmentVar === 'embedFooterIconAttachment') {
        embedFooterIconAttachment = file;
        if (urlInput) urlInput.value = '';
    } else if (attachmentVar === 'embedThumbnailAttachment') {
        embedThumbnailAttachment = file;
        if (urlInput) urlInput.value = '';
    } else if (attachmentVar === 'embedImageAttachment') {
        embedImageAttachment = file;
        if (urlInput) urlInput.value = '';
    }

    attachmentName.textContent = file.name;
    attachmentPreview.style.display = 'flex';

    updatePreview();
}

function removeAttachment(type) {
    let attachmentPreview, fileInput, urlInput;

    switch (type) {
        case 'message':
            messageAttachment = null;
            attachmentPreview = document.getElementById('attachmentPreview');
            fileInput = document.getElementById('fileInput');
            document.getElementById('previewAttachmentImage').style.display = 'none';
            break;
        case 'url': // NOUVEAU
            embedUrlAttachment = null;
            attachmentPreview = document.getElementById('embedUrlPreview');
            fileInput = document.getElementById('embedUrlFileInput');
            urlInput = document.getElementById('embedUrl');
            if (urlInput) urlInput.value = '';
            break;
        case 'authorIcon': // NOUVEAU
            embedAuthorIconAttachment = null;
            attachmentPreview = document.getElementById('embedAuthorIconPreview');
            fileInput = document.getElementById('embedAuthorIconFileInput');
            urlInput = document.getElementById('embedAuthorIcon');
            if (urlInput) urlInput.value = '';
            break;
        case 'footerIcon': // NOUVEAU
            embedFooterIconAttachment = null;
            attachmentPreview = document.getElementById('embedFooterIconPreview');
            fileInput = document.getElementById('embedFooterIconFileInput');
            urlInput = document.getElementById('embedFooterIcon');
            if (urlInput) urlInput.value = '';
            break;
        case 'thumbnail':
            embedThumbnailAttachment = null;
            attachmentPreview = document.getElementById('embedThumbnailPreview');
            fileInput = document.getElementById('embedThumbnailFileInput');
            urlInput = document.getElementById('embedThumbnailUrl');
            if (urlInput) urlInput.value = '';
            break;
        case 'image':
            embedImageAttachment = null;
            attachmentPreview = document.getElementById('embedImagePreview');
            fileInput = document.getElementById('embedImageFileInput');
            urlInput = document.getElementById('embedImageUrl');
            if (urlInput) urlInput.value = '';
            break;
        default:
            return;
    }

    if (fileInput) fileInput.value = '';
    if (attachmentPreview) attachmentPreview.style.display = 'none';
    updatePreview();
}

// ... (Fonctions existantes pour Modales, Mentions, Emojis, Fields, Buttons) ...

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
    if (modalId === 'mentionModal') {
        renderMentionList('roles');
    } else if (modalId === 'emojiModal') {
        document.getElementById('standardEmojiGrid').style.display = 'grid';
        document.getElementById('customEmojiList').style.display = 'none';
        document.querySelectorAll('#emojiTabs .emoji-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelector('#emojiTabs .emoji-tab[data-type="standard"]').classList.add('active');
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function handleMentionTabClick(e) {
    if (e.target.classList.contains('mention-tab')) {
        const type = e.target.dataset.type;
        document.querySelectorAll('#mentionTabs .mention-tab').forEach(tab => tab.classList.remove('active'));
        e.target.classList.add('active');
        renderMentionList(type);
    }
}

function renderMentionList(type) {
    const container = document.getElementById('mentionList');
    container.innerHTML = '';

    let list = [];
    if (type === 'roles') {
        list.push({ id: 'everyone', name: '@everyone', type: 'role', color: '#7289da' });
        list.push({ id: 'here', name: '@here', type: 'role', color: '#7289da' });
        list = list.concat(roles);
    }

    if (list.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: #777; padding: 20px;">Chargement des rôles en cours ou aucun rôle trouvé.</p>`;
        return;
    }

    list.forEach(item => {
        const isRole = item.type === 'role' || item.id === 'everyone' || item.id === 'here';
        const roleColor = (isRole && item.color && item.color !== '#000000') ? item.color : '#dcddde';

        const html = `
            <div class="list-item" data-mention-id="${item.id}" data-mention-type="${isRole ? 'role' : 'user'}">
                <div class="list-item-content">
                    <span class="list-item-name" style="color: ${roleColor};">${item.name}</span>
                    <span class="list-item-tag">${isRole ? (item.id === 'everyone' || item.id === 'here' ? item.name : `<@&${item.id}>`) : `<@${item.id}>`}</span>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', html);
    });

    container.querySelectorAll('.list-item').forEach(item => {
        item.addEventListener('click', handleMentionSelection);
    });
}

function handleMentionSelection(e) {
    const item = e.currentTarget;
    const id = item.dataset.mentionId;
    const type = item.dataset.mentionType;
    let mentionCode = '';

    if (id === 'everyone') {
        mentionCode = '@everyone';
    } else if (id === 'here') {
        mentionCode = '@here';
    } else if (type === 'role') {
        mentionCode = `<@&${id}>`;
    } else if (type === 'user') {
        mentionCode = `<@${id}>`;
    }

    const textarea = document.getElementById('messageContent');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    textarea.value = value.substring(0, start) + mentionCode + ' ' + value.substring(end);

    textarea.selectionStart = textarea.selectionEnd = start + mentionCode.length + 1;

    textarea.dispatchEvent(new Event('input'));
    updatePreview();
    closeModal('mentionModal');
    textarea.focus();
}

function handleEmojiTabClick(e) {
    if (e.target.classList.contains('emoji-tab')) {
        document.querySelectorAll('#emojiTabs .emoji-tab').forEach(tab => tab.classList.remove('active'));
        e.target.classList.add('active');

        document.getElementById('standardEmojiGrid').style.display = 'none';
        document.getElementById('customEmojiList').style.display = 'none';

        if (e.target.dataset.type === 'standard') {
            document.getElementById('standardEmojiGrid').style.display = 'grid';
        } else if (e.target.dataset.type === 'custom') {
            document.getElementById('customEmojiList').style.display = 'block';
        }
    }
}

function renderCustomEmojis() {
    const container = document.getElementById('customEmojiList');
    container.innerHTML = '';

    if (customEmojis.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: #777; padding: 20px;">Aucun émoji custom trouvé sur ce serveur.</p>`;
        return;
    }

    customEmojis.forEach(emoji => {
         const emojiInsertionCode = emoji.animated ? `<a:${emoji.name}:${emoji.id}>` : `<:${emoji.name}:${emoji.id}>`;
         const html = `
            <div class="list-item custom-emoji-item" data-emoji-code="${emojiInsertionCode}">
                <img src="${emoji.url}" alt="${emoji.name}" loading="lazy">
                <div class="list-item-content">
                    <span class="list-item-name">${emoji.name}</span>
                    <span class="list-item-tag"><code>${emojiInsertionCode}</code></span>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', html);
    });

    container.querySelectorAll('.custom-emoji-item').forEach(item => {
        item.addEventListener('click', handleCustomEmojiClick);
    });
}

function handleStandardEmojiClick(e) {
    if (e.target.tagName === 'SPAN' && e.target.dataset.emoji) {
        const emoji = e.target.dataset.emoji;
        const textarea = document.getElementById('messageContent');

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const value = textarea.value;
        textarea.value = value.substring(0, start) + emoji + value.substring(end);

        textarea.selectionStart = textarea.selectionEnd = start + emoji.length;

        textarea.dispatchEvent(new Event('input'));
        updatePreview();
        closeModal('emojiModal');
        textarea.focus();
    }
}

function handleCustomEmojiClick(e) {
    const item = e.currentTarget.closest('.custom-emoji-item');
    if (!item) return;

    const emojiCode = item.dataset.emojiCode;

    const textarea = document.getElementById('messageContent');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    textarea.value = value.substring(0, start) + emojiCode + ' ' + value.substring(end);

    textarea.selectionStart = textarea.selectionEnd = start + emojiCode.length + 1;

    textarea.dispatchEvent(new Event('input'));
    updatePreview();
    closeModal('emojiModal');
    textarea.focus();
}

function addField() {
    const fieldId = Date.now();
    fields.push({
        id: fieldId,
        name: '',
        value: '',
        inline: false
    });

    renderFields();
}

function renderFields() {
    const container = document.getElementById('fieldsList');
    container.innerHTML = '';

    fields.forEach((field, index) => {
        const fieldDiv = document.createElement('div');
        fieldDiv.className = 'field-item';
        fieldDiv.innerHTML = `
            <button class="remove-btn" onclick="removeField(${field.id})">×</button>
            <h4>Champ ${index + 1}</h4>
            <div class="form-group">
                <label>Nom du champ</label>
                <input type="text" class="input field-name" data-id="${field.id}" value="${field.name}" placeholder="Nom">
            </div>
            <div class="form-group">
                <label>Valeur du champ</label>
                <textarea class="input textarea field-value" data-id="${field.id}" placeholder="Valeur" rows="2">${field.value}</textarea>
            </div>
            <div class="inline-checkbox">
                <label class="checkbox-label">
                    <input type="checkbox" class="field-inline" data-id="${field.id}" ${field.inline ? 'checked' : ''}>
                    <span>Afficher en ligne (inline)</span>
                </label>
            </div>
        `;
        container.appendChild(fieldDiv);
    });

    container.querySelectorAll('.field-name, .field-value, .field-inline').forEach(el => {
        el.addEventListener('input', (e) => {
            const fieldId = parseInt(e.target.dataset.id);
            const field = fields.find(f => f.id === fieldId);
            if (field) {
                if (e.target.classList.contains('field-name')) field.name = e.target.value;
                if (e.target.classList.contains('field-value')) field.value = e.target.value;
                if (e.target.classList.contains('field-inline')) field.inline = e.target.checked;
                updatePreview();
            }
        });
        el.addEventListener('change', (e) => {
            if (e.target.classList.contains('field-inline')) {
                const fieldId = parseInt(e.target.dataset.id);
                const field = fields.find(f => f.id === fieldId);
                if (field) {
                    field.inline = e.target.checked;
                    updatePreview();
                }
            }
        });
    });
}

function removeField(fieldId) {
    fields = fields.filter(f => f.id !== fieldId);
    renderFields();
    updatePreview();
}

function addButton() {
    if (buttons.length >= 5) {
        showStatus('Vous ne pouvez pas ajouter plus de 5 boutons', 'error');
        return;
    }

    const buttonId = Date.now();
    buttons.push({
        id: buttonId,
        label: '',
        style: 'link',
        url: ''
    });

    renderButtons();
}

function renderButtons() {
    const container = document.getElementById('buttonsList');
    container.innerHTML = '';

    buttons.forEach((button, index) => {
        const buttonDiv = document.createElement('div');
        buttonDiv.className = 'button-item';
        buttonDiv.innerHTML = `
            <button class="remove-btn" onclick="removeButton(${button.id})">×</button>
            <h4>Bouton ${index + 1}</h4>

            <div class="form-group">
                <label>Style du bouton</label>
                <div class="button-style-grid">
                    <div class="style-option selected" data-id="${button.id}" data-style="link">
                        🔗 Lien
                    </div>
                </div>
            </div>

            <div class="form-group">
                <label>Texte du bouton</label>
                <input type="text" class="input button-label" data-id="${button.id}" value="${button.label}" placeholder="Cliquez-moi !">
            </div>

            <div class="form-group url-group">
                <label>URL / Lien</label>
                <input type="url" class="input button-url" data-id="${button.id}" value="${button.url}" placeholder="https://example.com">
            </div>
        `;
        container.appendChild(buttonDiv);
    });

    // Événement de style: ne garde que la sélection du style link (même s'il est unique)
    container.querySelectorAll('.style-option').forEach(el => {
        el.addEventListener('click', (e) => {
            const buttonId = parseInt(e.currentTarget.dataset.id);
            const style = 'link';
            const button = buttons.find(b => b.id === buttonId);
            if (button) {
                button.style = style;
                renderButtons();
                updatePreview();
            }
        });
    });

    container.querySelectorAll('.button-label, .button-url').forEach(el => {
        el.addEventListener('input', (e) => {
            const buttonId = parseInt(e.target.dataset.id);
            const button = buttons.find(b => b.id === buttonId);
            if (button) {
                if (e.target.classList.contains('button-label')) button.label = e.target.value;
                if (e.target.classList.contains('button-url')) button.url = e.target.value;
                updatePreview();
            }
        });
    });
}

function removeButton(buttonId) {
    buttons = buttons.filter(b => b.id !== buttonId);
    renderButtons();
    updatePreview();
}

// NOUVEAU: Fonction de rendu Markdown / Discord
function formatDiscordMarkdown(text) {
    let html = escapeHtml(text);

    // 1. Mentions (@everyone, @here, @role, @user)
    html = html.replace(/(@everyone|@here|<@&(\d+)>|<@(\d+)>)/g, (match, p1, roleId, userId) => {
        let name = match;
        let roleColor = '#7289da';

        if (roleId) {
            const role = roles.find(r => r.id === roleId);
            name = role ? `@${role.name}` : '@unknown-role';
            roleColor = role && role.color && role.color !== '#000000' ? role.color : roleColor;
        } else if (userId) {
            name = '@Utilisateur';
        }

        // Utiliser une balise span avec un style pour simuler la mention
        return `<span class="discord-mention" style="background-color: ${roleColor};">${name}</span>`;
    });

    // 2. Salons (#channel)
    html = html.replace(/<#(\d+)>/g, (match, channelId) => {
        const channel = channels.find(c => c.id === channelId);
        const channelName = channel ? `#${channel.name}` : '#unknown-channel';
        return `<span class="discord-channel">${channelName}</span>`;
    });

    // 3. Emojis custom (:name:id ou a:name:id)
    html = html.replace(/<(a?):(\w+):(\d+)>/g, (match, animated, name, id) => {
        const emoji = customEmojis.find(e => e.id === id);
        if (emoji) {
            // Afficher l'image de l'emoji custom
            return `<img src="${emoji.url}" class="discord-custom-emoji" alt="${name}">`;
        }
        return match;
    });

    // 4. Styles Markdown
    // **Gras**
    html = html.replace(/\*\*(.*?)\*\*/gs, '<strong>$1</strong>');
    // *Italique*
    html = html.replace(/\*(.*?)\*/gs, '<em>$1</em>');
    // __Souligné__
    html = html.replace(/\_\_(.*?)\_\_/gs, '<u>$1</u>');
    // ~~Barré~~
    html = html.replace(/~~(.*?)~~/gs, '<s>$1</s>');
    // `Code en ligne`
    html = html.replace(/`(.*?)`/gs, '<code class="inline-code">$1</code>');
    // ```Bloc de code```
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<div class="code-block"><code>$2</code></div>');

    // Remplacer les sauts de ligne par <br>
    html = html.replace(/\n/g, '<br>');

    return html;
}

// Fonction utilitaire pour lire un fichier en DataURL
function readFileAsDataURL(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
    });
}

// Mise à jour de la prévisualisation
async function updatePreview() {
    const messageContent = document.getElementById('messageContent').value;
    const enableEmbed = document.getElementById('enableEmbed').checked;

    // Réglage du Timestamp
    const now = new Date();
    const time = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('preview-timestamp').textContent = `Aujourd'hui à ${time}`;

    // Message content avec Markdown
    const previewText = document.getElementById('previewMessageContent');
    if (messageContent) {
        previewText.innerHTML = formatDiscordMarkdown(messageContent);
        previewText.style.display = 'block';
    } else {
        previewText.style.display = 'none';
    }

    // Prévisualisation de l'attachement du message simple
    const previewAttachmentImage = document.getElementById('previewAttachmentImage');
    if (messageAttachment) {
        previewAttachmentImage.src = await readFileAsDataURL(messageAttachment);
        previewAttachmentImage.style.display = 'block';
    } else {
        previewAttachmentImage.src = '';
        previewAttachmentImage.style.display = 'none';
    }

    // Embed
    const previewEmbed = document.getElementById('previewEmbed');
    const embedContainer = document.createElement('div');
    embedContainer.className = 'embed-container';

    if (enableEmbed) {
        const color = document.getElementById('embedColor').value;
        embedContainer.style.borderLeftColor = color;

        let embedHTML = '<div class="embed-wrapper">';

        const author = document.getElementById('embedAuthor').value;
        // Gérer l'icône de l'auteur (fichier ou URL)
        let authorIcon = document.getElementById('embedAuthorIcon').value;
        if (embedAuthorIconAttachment) {
            authorIcon = await readFileAsDataURL(embedAuthorIconAttachment);
        }

        if (author) {
            embedHTML += '<div class="embed-author">';
            if (authorIcon) embedHTML += `<img src="${authorIcon}" class="embed-author-icon" onerror="this.style.display='none'">`;
            embedHTML += `<span class="embed-author-name">${escapeHtml(author)}</span>`;
            embedHTML += '</div>';
        }

        const title = document.getElementById('embedTitle').value;
        // Gérer l'URL du titre (fichier ou URL)
        let url = document.getElementById('embedUrl').value;
        if (embedUrlAttachment) {
            url = await readFileAsDataURL(embedUrlAttachment);
        }

        if (title) {
            embedHTML += '<div class="embed-title-row">';
            if (url) {
                // Si c'est un lien, afficher le lien, sinon, c'est l'image (non cliquable pour la prévisu simple)
                if (url.startsWith('http')) {
                    embedHTML += `<a href="${url}" class="embed-title-link" target="_blank">${escapeHtml(title)}</a>`;
                } else {
                    embedHTML += `<span class="embed-title">${escapeHtml(title)}</span>`;
                }
            } else {
                embedHTML += `<span class="embed-title">${escapeHtml(title)}</span>`;
            }
            embedHTML += '</div>';

             // Si l'URL est un fichier, afficher l'image sous le titre (approximation de l'aperçu)
            if (embedUrlAttachment && url) {
                embedHTML += `<img src="${url}" class="embed-url-image-preview" style="max-width: 100px; max-height: 100px; margin-top: 10px;" onerror="this.style.display='none'">`;
            }
        }

        // Gérer le Thumbnail (fichier ou URL)
        let thumbnailURL = document.getElementById('embedThumbnailUrl').value;
        if (embedThumbnailAttachment) {
            thumbnailURL = await readFileAsDataURL(embedThumbnailAttachment);
        }

        if (thumbnailURL) {
            embedHTML += `<img src="${thumbnailURL}" class="embed-thumbnail" onerror="this.style.display='none'">`;
        }

        const description = document.getElementById('embedDescription').value;
        if (description) {
            embedHTML += `<div class="embed-description">${formatDiscordMarkdown(description)}</div>`;
        }

        const activeFields = fields.filter(f => f.name || f.value);
        if (activeFields.length > 0) {
            embedHTML += '<div class="embed-fields">';
            activeFields.forEach(field => {
                embedHTML += `<div class="embed-field ${field.inline ? 'inline' : ''}">`;
                if (field.name) embedHTML += `<div class="embed-field-name">${formatDiscordMarkdown(field.name)}</div>`;
                if (field.value) embedHTML += `<div class="embed-field-value">${formatDiscordMarkdown(field.value)}</div>`;
                embedHTML += '</div>';
            });
            embedHTML += '</div>';
        }

        // Gérer l'Image principale (fichier ou URL)
        let imageURL = document.getElementById('embedImageUrl').value;
        if (embedImageAttachment) {
            imageURL = await readFileAsDataURL(embedImageAttachment);
        }

        if (imageURL) {
            embedHTML += `<img src="${imageURL}" class="embed-image" onerror="this.style.display='none'">`;
        }

        const footer = document.getElementById('embedFooter').value;
        // Gérer l'icône du footer (fichier ou URL)
        let footerIcon = document.getElementById('embedFooterIcon').value;
        if (embedFooterIconAttachment) {
            footerIcon = await readFileAsDataURL(embedFooterIconAttachment);
        }

        const timestamp = document.getElementById('embedTimestamp').checked;
        if (footer || timestamp) {
            embedHTML += '<div class="embed-footer">';
            if (footerIcon) embedHTML += `<img src="${footerIcon}" class="embed-footer-icon" onerror="this.style.display='none'">`;
            let footerText = escapeHtml(footer);
            if (timestamp) {
                const dateStr = now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                const fullTimestamp = `${dateStr} à ${timeStr}`;
                footerText += (footerText ? ' • ' : '') + fullTimestamp;
            }
            embedHTML += `<span>${footerText}</span>`;
            embedHTML += '</div>';
        }

        embedHTML += '</div>';
        embedContainer.innerHTML = embedHTML;
        previewEmbed.innerHTML = '';
        previewEmbed.appendChild(embedContainer);

    } else {
        previewEmbed.innerHTML = '';
    }

    // Buttons
    const previewButtons = document.getElementById('previewButtons');
    const activeButtons = buttons.filter(b => b.label && b.url && b.style === 'link');

    if (activeButtons.length > 0) {
        let buttonsHTML = '<div class="preview-components">';
        activeButtons.forEach(button => {
            buttonsHTML += `<button class="preview-button link">${escapeHtml(button.label)}</button>`;
        });
        buttonsHTML += '</div>';
        previewButtons.innerHTML = buttonsHTML;
    } else {
        previewButtons.innerHTML = '';
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Envoyer le message
function sendMessage() {
    const channelId = document.getElementById('channelSelect').value;

    if (!channelId) {
        showStatus('Veuillez sélectionner un salon', 'error');
        return;
    }

    const messageData = {
        channelId,
        content: document.getElementById('messageContent').value || null,
        embed: null,
        buttons: [],
        attachment: null,
        embedUrlAttachment: null, // NOUVEAU
        embedAuthorIconAttachment: null, // NOUVEAU
        embedFooterIconAttachment: null, // NOUVEAU
        embedThumbnailAttachment: null,
        embedImageAttachment: null
    };

    const attachmentPromises = [];

    // Gérer les attachements simples
    const attachments = [
        { file: messageAttachment, key: 'attachment' },
        { file: embedUrlAttachment, key: 'embedUrlAttachment' }, // NOUVEAU
        { file: embedAuthorIconAttachment, key: 'embedAuthorIconAttachment' }, // NOUVEAU
        { file: embedFooterIconAttachment, key: 'embedFooterIconAttachment' }, // NOUVEAU
        { file: embedThumbnailAttachment, key: 'embedThumbnailAttachment' },
        { file: embedImageAttachment, key: 'embedImageAttachment' }
    ];

    attachments.forEach(({ file, key }) => {
        if (file) {
            attachmentPromises.push(
                readFileAsDataURL(file).then(dataUrl => {
                    messageData[key] = {
                        data: dataUrl,
                        name: file.name
                    };
                })
            );
        }
    });


    // Attendre la lecture de tous les fichiers
    Promise.all(attachmentPromises)
        .then(() => {
            prepareAndSendMessage(messageData);
        })
        .catch((e) => {
            showStatus('❌ Erreur lors de la lecture d\'un fichier: ' + e.message, 'error');
        });
}

async function prepareAndSendMessage(messageData) {
    // Construire l'embed
    if (document.getElementById('enableEmbed').checked) {
        const embed = {
            color: parseInt(document.getElementById('embedColor').value.replace('#', ''), 16),
            title: document.getElementById('embedTitle').value || undefined,
            description: document.getElementById('embedDescription').value || undefined,
            url: undefined, // Sera défini en dessous
            author: undefined,
            thumbnail: undefined,
            image: undefined,
            footer: undefined,
            fields: []
        };

        // URL du titre
        let url = document.getElementById('embedUrl').value;
        if (messageData.embedUrlAttachment) {
            url = `attachment://${messageData.embedUrlAttachment.name}`;
        }
        if (url) {
            embed.url = url;
        }

        // Author
        const author = document.getElementById('embedAuthor').value;
        // Icône Auteur
        let authorIconUrl = document.getElementById('embedAuthorIcon').value;
        if (messageData.embedAuthorIconAttachment) {
            authorIconUrl = `attachment://${messageData.embedAuthorIconAttachment.name}`;
        }

        if (author) {
            embed.author = {
                name: author,
                icon_url: authorIconUrl || undefined
            };
        }

        // Thumbnail
        let thumbnailUrl = document.getElementById('embedThumbnailUrl').value;
        if (messageData.embedThumbnailAttachment) {
            thumbnailUrl = `attachment://${messageData.embedThumbnailAttachment.name}`;
        }
        if (thumbnailUrl) {
            embed.thumbnail = { url: thumbnailUrl };
        }

        // Image
        let imageUrl = document.getElementById('embedImageUrl').value;
        if (messageData.embedImageAttachment) {
            imageUrl = `attachment://${messageData.embedImageAttachment.name}`;
        }
        if (imageUrl) {
            embed.image = { url: imageUrl };
        }

        // Footer
        const footer = document.getElementById('embedFooter').value;
        // Icône Footer
        let footerIconUrl = document.getElementById('embedFooterIcon').value;
        if (messageData.embedFooterIconAttachment) {
            footerIconUrl = `attachment://${messageData.embedFooterIconAttachment.name}`;
        }

        if (footer) {
            embed.footer = {
                text: footer,
                icon_url: footerIconUrl || undefined
            };
        }

        // Timestamp
        if (document.getElementById('embedTimestamp').checked) {
            embed.timestamp = new Date().toISOString();
        }

        // Fields
        fields.forEach(field => {
            if (field.name || field.value) {
                embed.fields.push({
                    name: field.name || '\u200B',
                    value: field.value || '\u200B',
                    inline: field.inline
                });
            }
        });

        const hasContent = embed.title || embed.description || embed.url || embed.author || embed.thumbnail || embed.image || embed.footer || embed.fields.length > 0;
        if (hasContent) {
            messageData.embed = embed;
        }
    }

    // Construire les boutons
    buttons.forEach(button => {
        if (button.label && button.style === 'link' && button.url) {
            messageData.buttons.push({
                label: button.label,
                style: 'link',
                url: button.url
            });
        }
    });

    // Vérifier qu'il y a du contenu
    const hasContent = messageData.content || messageData.embed || messageData.buttons.length > 0 || messageData.attachment || messageData.embedUrlAttachment || messageData.embedAuthorIconAttachment || messageData.embedFooterIconAttachment || messageData.embedThumbnailAttachment || messageData.embedImageAttachment;
    if (!hasContent) {
        showStatus('Le message doit contenir au moins du texte, un embed, des boutons ou une pièce jointe', 'error');
        return;
    }

    // Envoyer au serveur
    socket.emit('sendMessage', messageData);
    showStatus('🚀 Envoi du message...', 'info');
}

// Réception de la confirmation
socket.on('messageSent', (data) => {
    if (data.success) {
        showStatus('✅ Message envoyé avec succès !', 'success');
        removeAttachment('message');
        removeAttachment('url');
        removeAttachment('authorIcon');
        removeAttachment('footerIcon');
        removeAttachment('thumbnail');
        removeAttachment('image');
    } else {
        showStatus('❌ Erreur lors de l\'envoi: ' + data.error, 'error');
    }
});

// Afficher un message de statut
function showStatus(message, type) {
    const statusEl = document.getElementById('statusMessage');
    statusEl.textContent = message;
    statusEl.className = `status-message ${type}`;
    statusEl.style.display = 'block';

    if (type === 'success' || type === 'info') {
        setTimeout(() => {
            statusEl.style.display = 'none';
        }, 5000);
    }
}

// Réinitialiser le formulaire
function resetForm() {
    if (!confirm('Êtes-vous sûr de vouloir réinitialiser le formulaire ?')) {
        return;
    }

    document.getElementById('messageContent').value = '';
    document.getElementById('enableEmbed').checked = false;
    document.getElementById('embedOptions').style.display = 'none';
    document.getElementById('embedColor').value = '#5865F2';
    document.getElementById('embedColorHex').value = '#5865F2';
    document.getElementById('embedTitle').value = '';
    document.getElementById('embedDescription').value = '';
    document.getElementById('embedUrl').value = '';
    document.getElementById('embedAuthor').value = '';
    document.getElementById('embedAuthorIcon').value = '';
    document.getElementById('embedThumbnailUrl').value = '';
    document.getElementById('embedImageUrl').value = '';
    document.getElementById('embedFooter').value = '';
    document.getElementById('embedFooterIcon').value = '';
    document.getElementById('embedTimestamp').checked = false;

    fields = [];
    buttons = [];
    renderFields();
    renderButtons();

    // Réinitialiser tous les attachements
    removeAttachment('message');
    removeAttachment('url');
    removeAttachment('authorIcon');
    removeAttachment('footerIcon');
    removeAttachment('thumbnail');
    removeAttachment('image');

    updatePreview();

    document.getElementById('statusMessage').style.display = 'none';
}