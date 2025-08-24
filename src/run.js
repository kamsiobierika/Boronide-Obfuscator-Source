// bot.js
require("dotenv").config();
const { Client, Intents } = require("discord.js");
const fs = require("fs");
const path = require("path");
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

const { obfuscate } = require("index.js");

// ✅ Load bot token from .env
const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error("❌ No DISCORD_TOKEN found in .env!");
  process.exit(1);
}

const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
});

client.once("ready", () => {
  console.log(`[BOT] ✅ Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // Command: .obf with file
  if (message.content.trim() === ".obf") {
    if (!message.attachments.size) {
      return message.reply("⚠️ Please attach a `.lua` file.");
    }

    const file = message.attachments.first();
    if (!file.name.endsWith(".lua")) {
      return message.reply("⚠️ Only `.lua` files are supported.");
    }

    try {
      // Ensure ./temp directory exists
      const tempDir = path.join(__dirname, "temp");
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

      // Save uploaded file as input.lua
      const inputPath = path.join(tempDir, "input.lua");
      const outputPath = path.join(tempDir, "output.lua");

      const res = await fetch(file.url);
      const buffer = await res.arrayBuffer();
      fs.writeFileSync(inputPath, Buffer.from(buffer));

      // Run obfuscator
      const [obfPath] = await obfuscate(
        fs.readFileSync(inputPath, "utf8")
      );

      // Always save result as output.lua
      fs.renameSync(obfPath, outputPath);

      // Send file as raw (like normal file upload)
      await message.reply({
        content: "✅ Here’s your obfuscated file:",
        files: [{ attachment: outputPath, name: "output.lua" }],
      });

      // Cleanup
      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);
    } catch (err) {
      console.error("[ERROR]", err);
      message.reply("❌ Something went wrong while obfuscating your file.");
    }
  }
});

// ✅ Use the token variable here
client.login(token);
