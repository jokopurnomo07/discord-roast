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
        const avatar = message.mentions.users.first()?.avatar || message.author.avatar
        const globalName = message.mentions.users.first()?.globalName || message.author.globalName  
        const discriminator = message.mentions.users.first()?.discriminator || message.author.discriminator  
        const username = message.mentions.users.first()?.username || message.author.username;

        const datas = {
            avatar: avatar,
            globalName: globalName,
            discriminator: discriminator,
            username: username
        };
        
        // Creating the prompt
        const prompt = `gunakan bahasa indonesia yang normal seperti manusia gaul, berikan roasting singkat dengan kejam dan menyindir dalam bahasa gaul untuk profile discord berikut : ${username}. Berikut detailnya: "${JSON.stringify(datas)}"`;        

        try {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const response = await model.generateContent(prompt);
            const roast = response.response.text();

            message.reply(`🔥 **gua roasting lu bro ${username} :** ${roast}`);
        } catch (error) {
            console.error(error);
            message.reply("❌ Gagal nge-roast! Coba lagi nanti.");
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
