const express = require("express");
const { Client, GatewayIntentBits } = require("discord.js");

// 🐾 IMPORTA PETS
const pets = require("./pets");

const app = express();

// 🌐 PORTA (OBRIGATÓRIO NO RENDER)
const PORT = process.env.PORT || 3000;
app.get("/", (req, res) => {
  res.send("Bot online");
});
app.listen(PORT, () => {
  console.log("Servidor rodando na porta " + PORT);
});

// 🤖 BOT DISCORD
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// 🧠 pega valor do pet
function getPetValue(name) {
  return pets[name.toLowerCase().trim()] || -1;
}

// 📊 COMANDO /avaliar
client.on("messageCreate", (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith("/avaliar")) return;

  const parts = message.content
    .replace("/avaliar", "")
    .trim()
    .split(" vs ");

  if (parts.length !== 2) {
    return message.reply("Use: /avaliar pet + pet vs pet + pet");
  }

  const lado1 = parts[0].split("+").map(p => p.trim());
  const lado2 = parts[1].split("+").map(p => p.trim());

  let total1 = 0;
  let total2 = 0;

  for (let p of lado1) {
    let v = getPetValue(p);
    if (v === -1) return message.reply(`❌ Pet não encontrado: ${p}`);
    total1 += v;
  }

  for (let p of lado2) {
    let v = getPetValue(p);
    if (v === -1) return message.reply(`❌ Pet não encontrado: ${p}`);
    total2 += v;
  }

  let result =
    total2 > total1 ? "WIN 🟢" :
    total2 < total1 ? "LOSE 🔴" :
    "FAIR ⚖️";

  message.reply(
    `📊 TRADE RESULTADO\n\n` +
    `Seu lado: ${parts[0]} = ${total1}\n` +
    `Outro lado: ${parts[1]} = ${total2}\n\n` +
    `${result}`
  );
});

// 🤖 ONLINE
client.once("ready", () => {
  console.log(`Bot online como ${client.user.tag}`);
});

// 🔑 TOKEN (RENDER)
client.login(process.env.DISCORD_TOKEN);