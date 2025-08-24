// run.js

require("dotenv").config();
const { Client, GatewayIntentBits, AttachmentBuilder } = require("discord.js");
const express = require("express");
const fs = require("fs");
const path = require("path");

// Import your obfuscator (index.js must export obfuscate)
const { obfuscate } = require("./index.js");

// --- Express keep-alive server ---
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("✅ Bot is running!, But my Big fat dick wanna get sucked");
});

app.listen(PORT, () => {
  console.log(`🌐 Server running on port ${PORT}`);
});

// --- Discord Bot Setup ---
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

client.once("ready", () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

// --- Obfuscator Command (.obf) ---
client.on("messageCreate", async (message) => {
  if (!message.content.startsWith(".obf")) return;
  if (message.author.bot) return;

  const attachment = message.attachments.first();
  if (!attachment) {
    return message.reply("❌ Please attach a Lua file to obfuscate!");
  }

  if (!attachment.name.endsWith(".lua")) {
    return message.reply("⚠️ Only `.lua` files are supported!");
  }

  try {
    // Download file
    const response = await fetch(attachment.url);
    const luaCode = await response.text();

    // Run obfuscator
    const [outputPath] = await obfuscate(luaCode);

    // Ensure the file is saved as output.lua
    const finalPath = path.join(__dirname, "output.lua");
    fs.renameSync(outputPath, finalPath);

    // Send back as raw file
    const file = new AttachmentBuilder(finalPath, { name: "output.lua" });
    await message.reply({ content: "✅ Obfuscation complete!", files: [file] });

    // Cleanup
    fs.unlinkSync(finalPath);
  } catch (err) {
    console.error("❌ Obfuscation failed:", err);
    message.reply("⚠️ Something went wrong while obfuscating your file.");
  }
});

client.login(token);
