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

// 🔥 Function: Roast User
async function roastUser(message) {
    const avatar = message.mentions.users.first()?.avatar || message.author.avatar;
    const globalName = message.mentions.users.first()?.globalName || message.author.globalName;
    const discriminator = message.mentions.users.first()?.discriminator || message.author.discriminator;
    const username = message.mentions.users.first()?.username || message.author.username;

    const datas = {
        avatar: avatar,
        globalName: globalName,
        discriminator: discriminator,
        username: username
    };

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

// 🧠 Function: Ask AI (tanyaAI)
async function tanyaAI(message, question) {
    const mentionedUser = message.mentions.users.first();
    
    // Extract user data if mentioned, otherwise use empty strings
    const datas = {
        avatar: mentionedUser?.avatar ?? "",
        globalName: mentionedUser?.globalName ?? "",
        discriminator: mentionedUser?.discriminator ?? "",
        username: mentionedUser?.username ?? ""
    };

    // Build the prompt based on whether a user is mentioned
    const prompt = message.mentions.users.size === 0
        ? `Jawab pertanyaan berikut dengan bahasa Indonesia yang santai dan mudah dimengerti: "${question}"`
        : `Jawab pertanyaan berikut dengan bahasa Indonesia yang santai dan mudah dimengerti: "${question}" dengan data user seperti ini: ${JSON.stringify(datas)}`;

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const response = await model.generateContent(prompt);
        const answer = response.response.text();

        message.reply(`💬 **Jawaban AI:** ${answer}`);
    } catch (error) {
        console.error("❌ Error generating AI response:", error);
        message.reply("❌ Gagal menjawab pertanyaan! Coba lagi nanti.");
    }
}

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    // Command: !roast
    if (message.content.startsWith("!roast")) {
        await roastUser(message);
    }

    // Command: !tanya <question>
    if (message.content.startsWith("!tanya")) {
        const question = message.content.slice(7).trim(); // Extract question after !tanya
        if (!question) {
            return message.reply("❗ Tulis pertanyaan setelah perintah `!tanya`.");
        }
        await tanyaAI(message, question);
    }
});

client.login(process.env.DISCORD_TOKEN);
