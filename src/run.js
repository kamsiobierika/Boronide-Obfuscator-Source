require("dotenv").config()
const {
  Client,
  Intents,
  MessageEmbed,
  MessageAttachment,
} = require("discord.js");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const tmp = require("tmp");
const { promisify } = require("util");

const log = (...e) => console.log("[BORONIDE]", ...e);
const error = (...e) => console.error("[BORONIDE]", ...e);

const tempDir = path.join(__dirname, "Temp_files");
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

// ================== TEMP FILE SYSTEM ================== //
const MAX_TEMP_FILE_AGE = 3600000; // 1 hour
const trackedFiles = new Set();

// Create tracked temp file
function createTempFile(extension = ".lua") {
  return new Promise((resolve, reject) => {
    tmp.file({ postfix: extension, discardDescriptor: true }, (err, path) => {
      if (err) return reject(err);
      trackedFiles.add(path);
      resolve(path);
    });
  });
}

// Cleanup temp files
async function cleanupTempFiles(files = []) {
  const filesToClean = files.length > 0 ? files : Array.from(trackedFiles);

  for (const file of filesToClean) {
    if (file && fs.existsSync(file)) {
      try {
        fs.unlinkSync(file);
        trackedFiles.delete(file);
      } catch (err) {
        error(`Failed to delete ${file}:`, err);
      }
    }
  }
}

// Periodic cleanup of old files
function startScheduledCleanup() {
  setInterval(() => {
    try {
      const files = fs.readdirSync(tempDir);
      const now = Date.now();

      files.forEach((file) => {
        const filePath = path.join(tempDir, file);
        try {
          const stat = fs.statSync(filePath);
          if (now - stat.mtimeMs > MAX_TEMP_FILE_AGE) {
            fs.unlinkSync(filePath);
            trackedFiles.delete(filePath);
          }
        } catch (err) {
          error(`Failed to clean up ${filePath}:`, err);
        }
      });
    } catch (err) {
      error("Scheduled cleanup failed:", err);
    }
  }, 1800000); // every 30 mins
}

// Exit handlers
function setupProcessHandlers() {
  process.on("exit", () => cleanupTempFiles().catch(() => {}));
  process.on("SIGINT", () => {
    cleanupTempFiles().catch(() => {});
    process.exit(0);
  });
  process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
    cleanupTempFiles().catch(() => {});
    process.exit(1);
  });
  process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
    cleanupTempFiles().catch(() => {});
    process.exit(1);
  });
}

function initCleanupSystem() {
  setupProcessHandlers();
  startScheduledCleanup();
  setTimeout(() => {
    cleanupTempFiles().catch(() => {});
  }, 5000);
}
initCleanupSystem();
// ====================================================== //

// Boronide obfuscator
async function obfuscateWithBoronide(inputFile) {
  const boronide = require("./src/index.js");
  const inputCode = fs.readFileSync(inputFile, "utf-8");
  const [outputPath] = await boronide.obfuscate(inputCode);
  trackedFiles.add(outputPath);
  return outputPath;
}

// Timestamp helper
function formatFooterTimestamp() {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `Today at ${hour12}:${minutes} ${ampm}`;
}

const token = process.env.DISCORD_TOKEN;
if (!token) {
  error("❌ No DISCORD_TOKEN found in .env!");
  process.exit(1);
}

const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.DIRECT_MESSAGES,
  ],
  partials: ["CHANNEL"],
});

client.once("ready", () => {
  log(`✅ Logged in as ${client.user?.tag || "Unknown"}`);
  client.user.setPresence({
    status: "dnd",
    activities: [{ name: "Obfuscating Lua with Boronide", type: "PLAYING" }],
  });
});

client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  if (msg.content.toLowerCase() === ".help") {
    const helpEmbed = new MessageEmbed()
      .setColor("PURPLE")
      .setTitle("📖 Boronide Obfuscator Help")
      .setDescription(
        `Usage:\n.obf [attach your .lua/.txt file or paste inside a codeblock]\n\n⚡ No presets needed — Boronide automatically obfuscates the code.`
      )
      .setFooter({ text: `Powered by Boronide • ${formatFooterTimestamp()}` });
    return msg.reply({ embeds: [helpEmbed] });
  }

  if (msg.content.toLowerCase().startsWith(".obf")) {
    let inputFile;
    let originalFileName;

    try {
      // Handle file attachments
      const attachment = msg.attachments.first();
      if (attachment) {
        const ext = path.extname(attachment.name).toLowerCase();
        if (ext !== ".lua" && ext !== ".txt") {
          return msg.reply({
            embeds: [
              new MessageEmbed()
                .setColor("PURPLE")
                .setTitle("❌ Obfuscation Failed")
                .setDescription("Only `.lua` and `.txt` files are supported!"),
            ],
          });
        }
        inputFile = await createTempFile(ext);
        const response = await axios({ method: "GET", url: attachment.url, responseType: "stream" });
        response.data.pipe(fs.createWriteStream(inputFile));
        await new Promise((resolve, reject) => {
          response.data.on("end", resolve);
          response.data.on("error", reject);
        });
        originalFileName = attachment.name;
      } else {
        // Handle codeblocks
        const codeBlockMatch = msg.content.match(/```(?:lua)?\n([\s\S]*?)```/i);
        if (!codeBlockMatch) {
          return msg.reply({
            embeds: [
              new MessageEmbed()
                .setColor("PURPLE")
                .setTitle("❌ Obfuscation Failed")
                .setDescription("Attach a `.lua`/`.txt` file or paste inside a codeblock!"),
            ],
          });
        }
        const code = codeBlockMatch[1];
        inputFile = await createTempFile(".lua");
        fs.writeFileSync(inputFile, code, "utf-8");
        originalFileName = `codeblock_${Date.now()}.lua`;
      }

      const workingMsg = await msg.reply({
        embeds: [
          new MessageEmbed()
            .setColor("PURPLE")
            .setTitle("⚙️ Processing File")
            .setDescription("Obfuscating 1 file with Boronide..."),
        ],
      });

      let outputFile;
      try {
        outputFile = await obfuscateWithBoronide(inputFile);
      } catch (err) {
        error(err);
        return workingMsg.edit({
          embeds: [
            new MessageEmbed()
              .setColor("PURPLE")
              .setTitle("❌ Failed")
              .setDescription("Something went wrong. Please try again."),
          ],
        });
      }

      const finalFile = await createTempFile(".lua");
      fs.copyFileSync(outputFile, finalFile);

      let obfuscatedCode = fs.readFileSync(finalFile, "utf-8");
      const watermark = "--[[\nObfuscated by Boronide Obfuscator\n]]\n\n";
      if (!obfuscatedCode.startsWith(watermark)) {
        obfuscatedCode = watermark + obfuscatedCode.trimStart();
        fs.writeFileSync(finalFile, obfuscatedCode, "utf-8");
      }

      const preview =
        obfuscatedCode.length > 500 ? obfuscatedCode.slice(0, 500) + "..." : obfuscatedCode;

      const successEmbed = new MessageEmbed()
        .setColor("PURPLE")
        .setTitle("✅ Obfuscation Results")
        .setDescription(`${originalFileName}\n\n\`\`\`lua\n${preview}\n\`\`\`\nFile is attached below.`)
        .setFooter({ text: `Powered by Boronide • ${formatFooterTimestamp()}` });

      await workingMsg.edit({
        embeds: [successEmbed],
        files: [new MessageAttachment(finalFile, originalFileName)],
      });

      // Cleanup
      await cleanupTempFiles([inputFile, outputFile, finalFile]);
    } catch (err) {
      error("Obfuscation error:", err);
    }
  }
});

client.login(token);
