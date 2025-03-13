require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const mongoose = require("mongoose");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// ✅ Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("✅ MongoDB connected")).catch(err => console.log("❌ MongoDB error:", err));

// ✅ Define User Warning Schema
const warningSchema = new mongoose.Schema({
    userId: String,
    warnings: Number
});
const Warning = mongoose.model("Warning", warningSchema);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
});

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;

// ✅ Bad Word Filter
const badWords = [
    "anjing", "bangsat", "bajingan", "kontol", "memek", "pepek", "ngentot", 
    "goblok", "tolol", "kampret", "keparat", "bego", "sinting", "brengsek", 
    "jancok", "pantek", "asu", "bencong", "lonte", "sundala", "kimak", "setan", "iblis"
];
const badWordRegex = new RegExp(`\\b(${badWords.join("|")})\\b`, "i");

// ✅ Store Processed Messages
const processedMessages = new Set();

client.once("ready", () => {
    console.log(`🔥 ${client.user.tag} is online!`);
});

// ✅ Function: Handle Bad Words
async function handleBadWord(message) {
    if (!badWordRegex.test(message.content) || processedMessages.has(message.id)) return;
    processedMessages.add(message.id);

    const user = message.author;
    let member = await message.guild.members.fetch(user.id);
    
    console.log(`🚨 Detected bad word from ${user.tag}: "${message.content}"`);
    await message.delete().catch(() => {});

    const logChannel = await message.guild.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
    await message.channel.send(`${user}, jangan berkata kasar! 🚫`);
    
    // Get user warnings from DB
    let userData = await Warning.findOne({ userId: user.id });
    if (!userData) userData = new Warning({ userId: user.id, warnings: 0 });

    userData.warnings += 1;
    await userData.save();

    // Apply timeout based on warning count
    const timeoutDurations = [5, 10, 15, 30]; // in minutes
    const timeoutDuration = timeoutDurations[Math.min(userData.warnings - 1, timeoutDurations.length - 1)] * 60 * 1000;

    try {
        await member.timeout(timeoutDuration, "Menggunakan kata kasar");
        console.log(`⏳ ${user.tag} timeout ${timeoutDuration / 60000} menit.`);
        
        if (logChannel) {
            logChannel.send(`🚨 **Moderasi:** ${user} mendapatkan timeout ${timeoutDuration / 60000} menit karena berkata kasar. \n ini kalimatnya : "${message.content}"`);
        } else {
            console.log("❌ Log channel tidak ditemukan!");
        }
        
    } catch (err) {
        console.log(`❌ Gagal memberikan hukuman:`, err);
    }

    setTimeout(() => processedMessages.delete(message.id), 5000);
}

// ✅ Function: Roast User
async function roastUser(message) {
    if (processedMessages.has(message.id)) return;
    processedMessages.add(message.id);

    const mentionedUser = message.mentions.users.first() || message.author;
    const prompt = `Gunakan bahasa Indonesia yang santai. Berikan roasting kejam dalam bahasa gaul untuk ${mentionedUser.username}.`;

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const response = await model.generateContent(prompt);
        const roast = response.response.text();

        message.reply(`🔥 ${roast}`);
    } catch (error) {
        console.error(error);
        message.reply("❌ Gagal nge-roast! Coba lagi nanti.");
    }

    setTimeout(() => processedMessages.delete(message.id), 5000);
}

// ✅ Function: Ask AI (Tanya AI)
async function tanyaAI(message, question) {
    if (processedMessages.has(message.id)) return;
    processedMessages.add(message.id);

    const prompt = `Jawab pertanyaan ini dalam bahasa Indonesia yang santai: "${question}"`;

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const response = await model.generateContent(prompt);
        const answer = response.response.text();

        message.reply(`💬 **Jawaban AI:** ${answer}`);
    } catch (error) {
        console.error(error);
        message.reply("❌ Gagal menjawab pertanyaan! Coba lagi nanti.");
    }

    setTimeout(() => processedMessages.delete(message.id), 5000);
}

// ✅ Command Handler
client.on("messageCreate", async (message) => {
    if (message.author.bot || message.partial) return;

    await handleBadWord(message);

    if (message.content.startsWith("!roast")) {
        await roastUser(message);
        return;
    }

    if (message.content.startsWith("!tanya")) {
        const question = message.content.slice(7).trim();
        if (!question) {
            message.reply("❗ Tulis pertanyaan setelah perintah `!tanya`.");
            return;
        }
        await tanyaAI(message, question);
    }
});

// ✅ Start Bot
client.login(process.env.DISCORD_TOKEN);
