# E-Ven Bot - Message Composer

<div align="center">

📝 **Bot Discord officiel d'E-Ven Community**

Interface web pour créer et envoyer des messages Discord personnalisés avec embeds, boutons et pièces jointes.

[![Discord.js](https://img.shields.io/badge/Discord.js-v14.23.2-5865F2?style=flat-square&logo=discord&logoColor=white)](https://discord.js.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-v5.1.0-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-v4.8.1-010101?style=flat-square&logo=socket.io&logoColor=white)](https://socket.io/)

</div>

---

## ✨ Fonctionnalités

### 🤖 Bot Discord
- Système de commandes slash intégré
- Gestion des événements Discord
- Notifications de démarrage
- Architecture modulaire et extensible

### 🎨 Interface Web de Composition
- **Authentification sécurisée** via OAuth2 Discord
- **Éditeur de messages** avec prévisualisation en temps réel
- **Embeds personnalisables** :
  - Couleurs, titres, descriptions
  - Auteur avec icône
  - Miniatures (thumbnails)
  - Images principales
  - Footer avec icône et timestamp
  - Champs (fields) inline ou en pleine largeur
- **Composants interactifs** :
  - Boutons de type lien (max 5 par message)
- **Pièces jointes** :
  - Support des images par glisser-déposer
  - Attachements pour embeds (icônes, images)
- **Outils d'édition** :
  - Sélecteur de mentions (@rôles, @everyone, @here)
  - Sélecteur d'émojis (standard et custom du serveur)
  - Support Markdown Discord
- **Prévisualisation** fidèle au rendu Discord

---

## 📋 Prérequis

- **Node.js** v18 ou supérieur
- **npm** ou **yarn**
- **Bot Discord** avec :
  - Token du bot
  - Client ID et Client Secret (OAuth2)
  - Permissions administrateur sur le serveur cible

---

## 🚀 Installation

### 1. Cloner le projet

```bash
git clone <url-du-repo>
cd e-ven-bot
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configuration

Créez un fichier `.env` à la racine du projet :

```env
# Bot Discord
TOKEN=votre_token_bot_discord
GUILD_ID=id_du_serveur_discord

# OAuth2 Configuration
CLIENT_ID=votre_client_id
CLIENT_SECRET=votre_client_secret
REDIRECT_URI=http://localhost:3000/callback

# Serveur Web
PORT=3000
```

### 4. Configuration Discord Developer Portal

1. Accédez au [Discord Developer Portal](https://discord.com/developers/applications)
2. Créez une nouvelle application ou sélectionnez-en une existante
3. Dans **OAuth2** :
   - Ajoutez `http://localhost:3000/callback` dans les redirections autorisées
   - Notez le **Client ID** et **Client Secret**
4. Dans **Bot** :
   - Activez les intents nécessaires :
     - `GUILDS`
     - `GUILD_MESSAGES`
     - `MESSAGE_CONTENT`
     - `GUILD_MEMBERS`
   - Copiez le **Token**
5. Invitez le bot sur votre serveur avec les permissions administrateur

### 5. Lancer le bot

```bash
npm start
# ou
node index.js
```

---

## 📁 Structure du projet

```
e-ven-bot/
│
├── Commands/           # Commandes du bot Discord
│   └── info.js        # Commande d'information du bot
│
├── Events/            # Gestionnaires d'événements Discord
│   ├── clientReady.js       # Événement de démarrage
│   └── interactionCreate.js # Gestion des interactions
│
├── Loaders/           # Chargeurs de modules
│   ├── loadCommands.js       # Chargement des commandes
│   ├── loadEvents.js         # Chargement des événements
│   └── loadSlashCommands.js  # Enregistrement des slash commands
│
├── Web/               # Serveur web et interface
│   ├── public/
│   │   ├── index.html        # Interface composer
│   │   ├── welcome.html      # Page d'accueil
│   │   ├── script.js         # Logique client
│   │   └── styles.css        # Styles CSS
│   └── webServer.js          # Configuration serveur Express + Socket.IO
│
├── config.js          # Configuration du bot
├── index.js          # Point d'entrée
├── package.json      # Dépendances
└── .env             # Variables d'environnement (à créer)
```

---

## 🎯 Utilisation

### Accéder à l'interface web

1. Démarrez le bot : `node index.js`
2. Ouvrez votre navigateur : `http://localhost:3000`
3. Cliquez sur **"Se connecter avec Discord"**
4. Autorisez l'application (vous devez être **administrateur** du serveur)
5. Composez vos messages et envoyez-les ! 🚀

### Créer un message

1. **Sélectionnez** un salon de destination
2. **Rédigez** votre message dans l'éditeur
3. **Ajoutez** (optionnel) :
   - Un embed avec tous ses composants
   - Des boutons de type lien
   - Des pièces jointes (images)
4. **Prévisualisez** en temps réel
5. **Envoyez** ! ✅

---

## 🔐 Sécurité

- ✅ **Authentification OAuth2** Discord obligatoire
- ✅ **Vérification des permissions** administrateur
- ✅ **Sessions sécurisées** (cookies HttpOnly)
- ✅ **Expiration des sessions** après 24h
- ✅ **Protection** contre les accès non autorisés

> ⚠️ **Note** : Le système de sessions actuel utilise la mémoire. Pour un environnement de production, utilisez **Redis** ou une base de données.

---

## 🛠️ Technologies utilisées

| Technologie | Version | Usage |
|------------|---------|-------|
| **Discord.js** | v14.23.2 | API Discord |
| **Express** | v5.1.0 | Serveur web |
| **Socket.IO** | v4.8.1 | Communication temps réel |
| **Axios** | v1.13.2 | Requêtes HTTP (OAuth2) |
| **dotenv** | v17.2.3 | Variables d'environnement |

---

## 📝 Commandes du bot

### `/info`
Affiche les informations du bot (développeur, hébergeur, liens).

---

## 🤝 Contribution

Les contributions sont les bienvenues ! Pour contribuer :

1. Forkez le projet
2. Créez une branche (`git checkout -b feature/AmazingFeature`)
3. Committez vos changements (`git commit -m 'Add AmazingFeature'`)
4. Poussez sur la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

---

## 📄 Licence

Ce projet est la propriété d'**E-Ven Community** et de **Bowsy_fr**.

---

## 👨‍💻 Développeur

Développé avec ❤️ par @Bowsy_fr pour E-Ven Community.

---

## 🐛 Signaler un bug

Si vous rencontrez un problème, ouvrez une issue sur GitHub avec :
- Description détaillée du bug
- Étapes pour reproduire
- Logs d'erreur (si disponibles)

---

## 📞 Support

Pour toute question ou assistance :
- Discord : Envoyez un lessage à @Bowsy_fr
- Issues GitHub : Ouvrez une issue

---

<div align="center">

**🚀 E-Ven Bot - Bot officiel de E-Ven Community**

Hébergé sur [Oracle Cloud](https://www.oracle.com/)

</div>
