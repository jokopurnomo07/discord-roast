require("dotenv").config();
import("node-fetch").then(({ default: fetch }) => (global.fetch = fetch));
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
});

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// ✅ Precompile Regex for Faster Matching
const badWords = [
    "anjing", "bangsat", "bajingan", "kontol", "memek", "pepek", "ngentot", 
    "goblok", "tolol", "kampret", "keparat", "bego", "sinting", "brengsek", 
    "jancok", "pantek", "asu", "bencong", "lonte", "sundala", "kimak", "setan", "iblis"
];
const badWordRegex = new RegExp(`\\b(${badWords.join("|")})\\b`, "i"); // Case-insensitive

// ❗ Store User Warnings (for tracking)
const userWarnings = new Map();

client.once("ready", () => {
    console.log(`🔥 ${client.user.tag} is online!`);
});

// ✅ Prevent Duplicate Processing by Tracking Message IDs
const processedMessages = new Set();

// ✅ Function: Warn, Timeout, or Ban User
async function handleBadWord(message) {
    if (!badWordRegex.test(message.content)) return;
    if (processedMessages.has(message.id)) return; // Ignore if already processed
    processedMessages.add(message.id);

    const user = message.author;
    let member = message.guild.members.cache.get(user.id);

    console.log(`🚨 Bad word detected from ${user.tag}: "${message.content}"`);

    await message.delete().catch(() => {}); // Silent catch if already deleted
    await message.channel.send(`${user}, jangan berkata kasar! 🚫`);

    // Track warnings
    const warnings = (userWarnings.get(user.id) || 0) + 1;
    userWarnings.set(user.id, warnings);

    try {
        if (!member) member = await message.guild.members.fetch(user.id); // Fetch only if not cached

        if (warnings === 1) {
            await member.timeout(3 * 60 * 1000, "Menggunakan kata kasar");
            console.log(`⏳ ${user.tag} diberi timeout 3 menit.`);
        } else if (warnings >= 5) {
            await member.ban({ reason: "Menggunakan kata kasar berulang kali" });
            console.log(`🚨 ${user.tag} telah di-banned.`);
            userWarnings.delete(user.id); // Reset warning count
        }
    } catch (err) {
        console.log(`❌ Gagal memberikan hukuman kepada ${user.tag}:`, err);
    }

    setTimeout(() => processedMessages.delete(message.id), 5000); // Remove from processed set after 5s
}

// 🔥 Function: Roast User
async function roastUser(message) {
    if (processedMessages.has(message.id)) return;
    processedMessages.add(message.id);

    const mentionedUser = message.mentions.users.first() || message.author;
    const datas = {
        avatar: mentionedUser.avatar,
        globalName: mentionedUser.globalName,
        discriminator: mentionedUser.discriminator,
        username: mentionedUser.username
    };

    const prompt = `Gunakan bahasa Indonesia yang santai. Berikan roasting kejam dan menyindir dalam bahasa gaul untuk profile Discord berikut: ${mentionedUser.username}. Detail: "${JSON.stringify(datas)}"`;

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const response = await model.generateContent(prompt);
        const roast = response.response.text();

        message.reply(`🔥 **Gua roasting lu bro ${mentionedUser.username}:** ${roast}`);
    } catch (error) {
        console.error(error);
        message.reply("❌ Gagal nge-roast! Coba lagi nanti.");
    }

    setTimeout(() => processedMessages.delete(message.id), 5000);
}

// 🧠 Function: Ask AI (Tanya AI)
async function tanyaAI(message, question) {
    if (processedMessages.has(message.id)) return;
    processedMessages.add(message.id);

    const mentionedUser = message.mentions.users.first();
    const datas = mentionedUser
        ? { avatar: mentionedUser.avatar, username: mentionedUser.username }
        : {};

    const prompt = `Jawab pertanyaan ini dalam bahasa Indonesia yang santai: "${question}" ${
        mentionedUser ? `Berikan jawaban dengan konteks user ini: ${JSON.stringify(datas)}` : ""
    }`;

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const response = await model.generateContent(prompt);
        const answer = response.response.text();

        message.reply(`💬 **Jawaban AI:** ${answer}`);
    } catch (error) {
        console.error("❌ Error AI:", error);
        message.reply("❌ Gagal menjawab pertanyaan! Coba lagi nanti.");
    }

    setTimeout(() => processedMessages.delete(message.id), 5000);
}

// ✅ Optimized Message Handler (Prevents Duplicate Messages)
client.on("messageCreate", async (message) => {
    if (message.author.bot) return; // Ignore bot messages

    // 🛠 Prevent multiple responses by checking if already processed
    if (message.partial) await message.fetch();

    // 🔥 Filter Bad Words
    await handleBadWord(message);

    // Command: !roast
    if (message.content.startsWith("!roast")) {
        await roastUser(message);
        return;
    }

    // Command: !tanya <question>
    if (message.content.startsWith("!tanya")) {
        const question = message.content.slice(7).trim();
        if (!question) {
            message.reply("❗ Tulis pertanyaan setelah perintah `!tanya`.");
            return;
        }
        await tanyaAI(message, question);
    }
});

// ✅ Ensure client.login() is called only once
client.login(process.env.DISCORD_TOKEN);
