// 🔒 Anti-bot duplicado
if (global.botRunning) {
  console.log("Bot já está rodando, encerrando duplicado...");
  process.exit(0);
}
global.botRunning = true;

const express = require("express");
const fs = require("fs");
const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");

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
// BARRA DE TRADE
// =========================

function criarBarra(v1, v2) {
  const total = v1 + v2;

  if (total === 0) return "⚪⚪⚪⚪⚪⚪⚪⚪⚪⚪";

  const size = 10;
  const p1 = v1 / total;

  const verdes = Math.round(p1 * size);
  const vermelhos = size - verdes;

  return "🟩".repeat(verdes) + "🟥".repeat(vermelhos);
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

  // 📦 ADD PET
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

  // 🗑️ REMOVE PET
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

  // 🔎 PROCURAR
  if (message.content.startsWith("/procurar")) {
    const pet = message.content.split(" ").slice(1).join(" ").toLowerCase().trim();

    let result = [];

    for (let user in db) {
      if (db[user][pet]) {
        result.push(`👤 <@${user}> → ${db[user][pet]}x`);
      }
    }

    if (result.length === 0) {
      return message.reply("❌ Ninguém possui esse pet.");
    }

    return message.reply(`🔎 ${pet}\n\n${result.join("\n")}`);
  }

  // 📦 MEUS PETS
  if (message.content === "/meuspets") {
    const user = db[message.author.id];

    if (!user) return message.reply("Você não tem pets.");

    let text = "📦 SEUS PETS:\n\n";

    for (let p in user) {
      text += `• ${p}: ${user[p]}x\n`;
    }

    return message.reply(text);
  }

  // ⚖️ TRADE / AVALIAR
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

    const barra = criarBarra(t1, t2);

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

    const embed = new EmbedBuilder()
      .setTitle("⚖️ TRADE CHECKER")
      .setColor(0x2b2d31)
      .addFields(
        {
          name: "📊 BALANÇO",
          value: barra,
          inline: false
        },
        {
          name: "📌 RESULTADO",
          value: `**${resultado}**`,
          inline: false
        }
      );

    return message.reply({ embeds: [embed] });
  }
});

// =========================
// LOGIN
// =========================

client.login(process.env.DISCORD_TOKEN);