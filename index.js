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
// VALOR DO PET
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

  // =========================
  // ADD PET
  // =========================
  if (message.content.startsWith("/addpet")) {
    const args = message.content.split(" ").slice(1);
    const pet = args[0]?.toLowerCase().trim();
    const qtd = parseInt(args[1] || "1");

    if (!pet) return message.reply("Use: /addpet nome quantidade");

    if (!db[message.author.id]) db[message.author.id] = {};
    if (!db[message.author.id][pet]) db[message.author.id][pet] = 0;

    db[message.author.id][pet] += qtd;
    saveDB(db);

    return message.reply(`✅ Adicionado ${qtd}x ${pet}`);
  }

  // =========================
  // REMOVE PET
  // =========================
  if (message.content.startsWith("/removepet")) {
    const args = message.content.split(" ").slice(1);
    const pet = args[0]?.toLowerCase().trim();
    const qtd = parseInt(args[1] || "1");

    if (!pet) return message.reply("Use: /removepet nome quantidade");

    if (!db[message.author.id] || !db[message.author.id][pet]) {
      return message.reply("❌ Você não tem esse pet.");
    }

    db[message.author.id][pet] -= qtd;

    if (db[message.author.id][pet] <= 0) {
      delete db[message.author.id][pet];
    }

    saveDB(db);

    return message.reply(`🗑️ Removido ${qtd}x ${pet}`);
  }

  // =========================
  // MEUS PETS
  // =========================
  if (message.content === "/meuspets") {
    const user = db[message.author.id];

    if (!user) return message.reply("Você não tem pets.");

    let text = "📦 SEUS PETS:\n\n";

    for (let p in user) {
      text += `• ${p}: ${user[p]}x\n`;
    }

    return message.reply(text);
  }

  // =========================
  // AVALIAR (W OR L)
  // =========================
  if (message.content.startsWith("/avaliar")) {
    const parts = message.content.replace("/avaliar", "").trim().split(" vs ");

    if (parts.length !== 2) {
      return message.reply("Use: /avaliar pet + pet vs pet + pet");
    }

    const lado1 = parts[0].split("+").map(p => p.trim().toLowerCase()).filter(Boolean);
    const lado2 = parts[1].split("+").map(p => p.trim().toLowerCase()).filter(Boolean);

    let t1 = 0;
    let t2 = 0;

    for (let p of lado1) {
      const v = getPetValue(p);
      if (v === -1) return message.reply(`❌ Pet inválido: ${p}`);
      t1 += v;
    }

    for (let p of lado2) {
      const v = getPetValue(p);
      if (v === -1) return message.reply(`❌ Pet inválido: ${p}`);
      t2 += v;
    }

    // barra simples
    const size = 10;
    const total = t1 + t2;
    const p1 = total === 0 ? 0 : t1 / total;

    const green = Math.round(p1 * size);
    const red = size - green;

    const barra = "🟩".repeat(green) + "🟥".repeat(red);

    // resultado
    const diff = Math.abs(t1 - t2);
    const media = (t1 + t2) / 2;
    const percent = media === 0 ? 0 : diff / media;

    let resultado;

    if (percent <= 0.05) {
      resultado = "⚖️ FAIR TRADE";
    } else if (percent <= 0.15) {
      resultado = t2 > t1 ? "🟡 LEVE GANHO" : "🟠 LEVE PERDA";
    } else {
      resultado = t2 > t1 ? "🟢 WIN TRADE" : "🔴 LOSE TRADE";
    }

    return message.reply(
`📊 W OR L

📦 SUA OFERTA:
${lado1.join(" + ")}

📦 OFERTA DELE:
${lado2.join(" + ")}

${barra}

⚖️ **${resultado}**`
    );
  }
});

// =========================
// LOGIN
// =========================

client.login(process.env.DISCORD_TOKEN);