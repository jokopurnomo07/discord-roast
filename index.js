require('dotenv').config();
import('node-fetch').then(({ default: fetch }) => global.fetch = fetch);
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

client.once("ready", () => {
    console.log(`🔥 ${client.user.tag} is online!`);
});

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    if (message.content.startsWith("!roast")) {
        const username = message.mentions.users.first()?.username || message.author.username;
        const prompt = `gunakan bahasa indonesia yang normal seperti manusia gaul, berikan roasting singkat dengan kejam dan menyindir dalam bahasa gaul untuk profile discord berikut : ${username}.`;

        try {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const response = await model.generateContent(prompt);
            const roast = response.response.text();

            message.reply(`🔥 **${username},:** ${roast}`);
        } catch (error) {
            console.error(error);
            message.reply("❌ Gagal nge-roast! Coba lagi nanti.");
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
