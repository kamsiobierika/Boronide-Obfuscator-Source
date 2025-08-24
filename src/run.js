// bot.js
require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const fs = require("fs");
const path = require("path");
const express = require("express");

const { obfuscate } = require("./index.js"); // uses your real obfuscator

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error("❌ No DISCORD_TOKEN found in .env!");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const log = (...msg) => console.log("[NYX]", ...msg);

// Command handler
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content.startsWith(".obf")) {
    if (message.attachments.size === 0) {
      return message.reply("❌ Please attach a Lua file to obfuscate.");
    }

    const file = message.attachments.first();
    log(`Received file: ${file.name} from ${message.author.tag}`);

    try {
      // download the attachment
      const res = await fetch(file.url);
      const code = await res.text();

      // run your real obfuscator
      const [outputPath] = await obfuscate(code);

      // send back as output.lua
      const outputFinal = path.join(__dirname, "output.lua");
      fs.copyFileSync(outputPath, outputFinal);

      await message.reply({
        content: "✅ Obfuscation complete!",
        files: [{ attachment: outputFinal, name: "output.lua" }],
      });

      log(`Sent obfuscated file to ${message.author.tag}`);
    } catch (err) {
      console.error("❌ Obfuscation failed:", err);
      message.reply("❌ Failed to obfuscate.");
    }
  }
});

// Bot ready log
client.once("ready", () => {
  log(`✅ Logged in as ${client.user.tag}`);
});

// Keep-alive server (optional for Render/Heroku)
const app = express();
app.get("/", (req, res) => res.send("Bot is running ON SLAYERSONS DICK!."));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => log(`🌐 Web server running on MY BIG FAT port DICK ${PORT}`));

// Login
client.login(token);
