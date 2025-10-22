const fs = require("fs")

module.exports = async client => {

    fs.readdirSync("./Commands").filter(f => f.endsWith(".js")).forEach(async file => {

        let command = require(`../Commands/${file}`)
        if (!command.name || typeof command.name !== "string") throw new TypeError(`Le nom de la commande ${file.slice(0, file.length - 3)} à un problème.`)
        client.commands.set(command.name, command)
        console.log(`Commande ${file} initialisé.`)
    })
}