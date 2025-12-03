import express from "express";
import axios from "axios";
import qs from "qs";

const app = express();

const CLIENT_ID = "1430581751570239560";
const CLIENT_SECRET = "2By802Zrj12UAXbjeuNLNK1JMUESY6cf";
const REDIRECT_URI = "http://localhost:3000/callback";
const GUILD_ID = "1430581638072500307";


app.get("/", (req, res) => {
    res.send(`<a href="/login">Se connecter avec Discord</a>`);
});

app.get("/login", (req, res) => {
    const url = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify guilds guilds.members.read`;
    res.redirect(url);
});

app.get("/callback", async (req, res) => {
    const { code } = req.query;

    const tokenResponse = await axios.post(
        "https://discord.com/api/oauth2/token",
        qs.stringify({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            grant_type: "authorization_code",
            redirect_uri: REDIRECT_URI,
            code
        }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const access_token = tokenResponse.data.access_token;

    const member = await axios.get(
        `https://discord.com/api/users/@me/guilds/${GUILD_ID}/member`,
        { headers: { Authorization: `Bearer ${access_token}` } }
    );

    const perms = BigInt(member.data.permissions);
    const isAdmin = (perms & 0x8n) === 0x8n;

    if (!isAdmin) {
        return res.send("Accès refusé, pas admin !");
    }

    res.send("Accès autorisé !");
});

app.listen(3000, () => console.log("OK sur http://localhost:3000"));
