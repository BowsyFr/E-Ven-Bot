require('dotenv').config();
const Discord = require("discord.js");
const { Client, GatewayIntentBits, Collection, Partials } = require("discord.js");
const loadCommands = require("./Loaders/loadCommands");
const loadEvents = require("./Loaders/loadEvents");
const config = require("./config");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildMessageTyping
    ],
    partials: [
        Partials.Channel // Pour les canaux privés (anciennement "CHANNEL")
    ]
});

client.commands = new Collection();

client.login(config.token);

loadEvents(client);
loadCommands(client);