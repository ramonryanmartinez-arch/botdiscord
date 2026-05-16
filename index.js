// 🔒 Anti-bot duplicado
if (global.botRunning) {
  console.log("Bot já está rodando, encerrando duplicado...");
  process.exit(0);
}
global.botRunning = true;

const express = require("express");
const fs = require("fs");
const { Client, GatewayIntentBits } = require("discord.js");

const pets = require("./pets");
const mutacoesCorpo = require("./data/mutacoesCorpo");

// =========================
// DATABASE
// =========================

const DB_FILE = "./db.json";

function loadDB() {
  if (!fs.existsSync(DB_FILE)) return {};
  return JSON.parse(fs.readFileSync(DB_FILE));
}

function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// =========================
// EXPRESS
// =========================

const app = express();
app.get("/", (req, res) => res.send("Bot online"));
app.listen(process.env.PORT || 3000);

// =========================
// VALOR PET
// =========================

function getPetValue(nomeCompleto) {
  if (!nomeCompleto) return -1;

  let nome = nomeCompleto.toLowerCase().trim();
  let mult = 1;

  for (let m in mutacoesCorpo) {
    if (nome.includes(m)) {
      mult *= mutacoesCorpo[m];
      nome = nome.replace(m, "").trim();
    }
  }

  const base = pets[nome];
  if (!base) return -1;

  return Math.floor(base * mult);
}

// =========================
// BARRA ANIMADA
// =========================

function criarFramesBarra(v1, v2) {
  const total = v1 + v2;
  const size = 10;

  const p1 = total === 0 ? 0 : v1 / total;
  const verdesFinais = Math.round(p1 * size);

  let frames = [];

  for (let i = 0; i <= size; i++) {
    let barra = "";

    for (let j = 0; j < size; j++) {
      if (j < i) {
        barra += j < verdesFinais ? "🟩" : "🟥";
      } else {
        barra += "⬛";
      }
    }

    frames.push(barra);
  }

  return frames;
}

// =========================
// DISCORD
// =========================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once("ready", () => {
  console.log(`Bot online como ${client.user.tag}`);
});

// =========================
// COMANDOS
// =========================

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const db = loadDB();

  // 📊 AVALIAR (W OR L ANIMADO)
  if (message.content.startsWith("/avaliar")) {
    const parts = message.content.replace("/avaliar", "").trim().split(" vs ");

    if (parts.length !== 2) {
      return message.reply("Use: /avaliar pet + pet vs pet + pet");
    }

    const lado1 = parts[0].split("+").map(p => p.trim().toLowerCase());
    const lado2 = parts[1].split("+").map(p => p.trim().toLowerCase());

    let t1 = 0;
    let t2 = 0;

    for (let p of lado1) {
      if (!p) continue;
      const v = getPetValue(p);
      if (v === -1) return message.reply(`❌ ${p} não existe`);
      t1 += v;
    }

    for (let p of lado2) {
      if (!p) continue;
      const v = getPetValue(p);
      if (v === -1) return message.reply(`❌ ${p} não existe`);
      t2 += v;
    }

    const frames = criarFramesBarra(t1, t2);

    const diff = Math.abs(t1 - t2);
    const media = (t1 + t2) / 2;
    const percent = diff / media;

    let resultado = "";

    if (percent <= 0.05) {
      resultado = "⚖️ FAIR TRADE";
    } else if (percent <= 0.15) {
      resultado = t2 > t1 ? "🟡 LEVE GANHO" : "🟠 LEVE PERDA";
    } else {
      resultado = t2 > t1 ? "🟢 WIN TRADE" : "🔴 LOSE TRADE";
    }

    const msg = await message.reply("⏳ analisando trade...");

    for (let i = 0; i < frames.length; i++) {
      await new Promise(r => setTimeout(r, 120));

      await msg.edit({
        content: `📊 W OR L\n\n${frames[i]}\n\n⏳ calculando...`
      });
    }

    await msg.edit({
      content: `📊 W OR L\n\n${frames[frames.length - 1]}\n\n⚖️ **${resultado}**`
    });
  }
});

// =========================
// LOGIN
// =========================

client.login(process.env.DISCORD_TOKEN);