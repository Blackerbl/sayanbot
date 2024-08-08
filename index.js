require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const cron = require('node-cron');
const express = require('express');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const USER_ID = '1123893835773263934'; // Kullanıcı ID'si
const weeklyPoints = {};
const allTimePoints = {};
const serverPoints = {};
const serverChannels = {};

const app = express();
const PORT = process.env.PORT || 3000;

// Dosyalardan puanları ve kanal ayarlarını yükleme
function loadData() {
  try {
    if (fs.existsSync('weeklyPoints.json')) {
      Object.assign(weeklyPoints, JSON.parse(fs.readFileSync('weeklyPoints.json')));
    }

    if (fs.existsSync('allTimePoints.json')) {
      Object.assign(allTimePoints, JSON.parse(fs.readFileSync('allTimePoints.json')));
    }

    if (fs.existsSync('serverPoints.json')) {
      Object.assign(serverPoints, JSON.parse(fs.readFileSync('serverPoints.json')));
    }

    if (fs.existsSync('serverChannels.json')) {
      Object.assign(serverChannels, JSON.parse(fs.readFileSync('serverChannels.json')));
    }
  } catch (error) {
    console.error('Veri yüklenirken hata oluştu:', error);
  }
}

loadData();

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);

  cron.schedule('0 * * * *', async () => {
    try {
      const filesToSend = ['weeklyPoints.json', 'allTimePoints.json', 'serverChannels.json', 'serverPoints.json'];
      await sendFilesToUser(USER_ID, filesToSend);
      console.log('Yedekleme dosyaları gönderildi.');
    } catch (error) {
      console.error('Yedekleme sırasında hata oluştu:', error);
    }
  });
});

async function sendFilesToUser(userId, fileNames) {
  const user = await client.users.fetch(userId);
  const attachments = fileNames.map(fileName => ({
    attachment: `./${fileName}`,
    name: fileName
  }));

  if (attachments.length > 0) {
    await user.send({ files: attachments });
  } else {
    console.error('Gönderilecek dosya bulunamadı.');
  }
}

app.get('/', (req, res) => {
  res.send('Discord botu aktif');
});

app.listen(PORT, () => {
  console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor.`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content.startsWith('A!yedekle')) {
    const filesToSend = ['weeklyPoints.json', 'allTimePoints.json', 'serverChannels.json', 'serverPoints.json'];
    await sendFilesToUser(message.author.id, filesToSend);
  }

  const inviteLinkRegex = /discord(?:\.com|app\.com|\.gg)\/(?:invite\/)?[a-zA-Z0-9-]{2,32}/;

  if (serverChannels[message.guild.id] === message.channel.id && inviteLinkRegex.test(message.content)) {
    const userId = message.author.id;
    const guildId = message.guild.id;

    if (!serverPoints[guildId]) {
      serverPoints[guildId] = { weekly: {}, total: {} };
    }

    serverPoints[guildId].weekly[userId] = (serverPoints[guildId].weekly[userId] || 0) + 1;
    serverPoints[guildId].total[userId] = (serverPoints[guildId].total[userId] || 0) + 1;

    const userWeeklyPoints = serverPoints[guildId].weekly[userId];
    const userAllTimePoints = serverPoints[guildId].total[userId];
    const userWeeklyRank = Object.values(serverPoints[guildId].weekly).filter(p => p > userWeeklyPoints).length + 1;
    const userAllTimeRank = Object.values(serverPoints[guildId].total).filter(p => p > userAllTimePoints).length + 1;

    const embed = new EmbedBuilder()
      .setColor(getRandomColor())
      .setTitle('<:Soiyll_Butterfly:1230240871585415339> Yeni Partner <:Soiyll_Butterfly:1230240871585415339>')
      .setDescription(`<:Soiyll_Butterfly:1230240871585415339> ︰Yeni partner için teşekkürler <@${userId}>!`)
      .addFields(
        { name: '<:Soiyll_Butterfly:1230240871585415339> Haftalık Puan', value: `${userWeeklyPoints} 🏆` },
        { name: '<:Soiyll_Butterfly:1230240871585415339> Toplam Puan', value: `${userAllTimePoints} 🏆` },
        { name: '<:Soiyll_Butterfly:1230240871585415339> Haftalık Sıralama', value: `${userWeeklyRank}` },
        { name: '<:Soiyll_Butterfly:1230240871585415339> Toplam Sıralama', value: `${userAllTimeRank}` },
      );

    message.channel.send({ embeds: [embed] });
    fs.writeFileSync('serverPoints.json', JSON.stringify(serverPoints, null, 2));
  }

  if (message.content.startsWith('A!puan')) {
    const args = message.content.split(' ');
    const userId = args[1] ? args[1].replace(/[<@!>]/g, '') : message.author.id;
    const guildId = message.guild.id;

    const userWeeklyPoints = serverPoints[guildId]?.weekly[userId] || 0;
    const userAllTimePoints = serverPoints[guildId]?.total[userId] || 0;
    const userWeeklyRank = Object.values(serverPoints[guildId]?.weekly || {}).filter(p => p > userWeeklyPoints).length + 1;
    const userAllTimeRank = Object.values(serverPoints[guildId]?.total || {}).filter(p => p > userAllTimePoints).length + 1;

    const embed = new EmbedBuilder()
      .setColor(getRandomColor())
      .setTitle('<:Soiyll_Butterfly:1230240871585415339> Partner Puanları')
      .setDescription(
        `ㅤㅤ ㅤ‿︵˓ ʚ🪷ɞ ˓ ︵ ͜
        🪽︰<@${userId}> için puan durumu;
        🕯️︰
        **Haftalık Puan:** ${userWeeklyPoints}
        ☁️︰
        **Haftalık Sıralama:** ${userWeeklyRank}
        🐚︰
        **Toplam Puan:** ${userAllTimePoints}
        🦢︰
        **Toplam Sıralama:** ${userAllTimeRank}   ㅤ   💌
        ㅤㅤㅤㅤ  ㅤ 
        ㅤㅤㅤ︶ ͡ ۫ ˓ ʚ🪷ɞ ˒ ۫ ͡ ︶`
      );

    message.channel.send({ embeds: [embed] });
  }

  if (message.content.startsWith('A!partnerkanalayarla')) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return message.reply('Bu komutu kullanmak için Sunucu Yönetme yetkisine sahip olmalısınız.');
    }

    const args = message.content.split(' ');
    const channelId = args[1]?.replace(/[<#>]/g, '');

    if (!channelId) {
      return message.reply('Lütfen geçerli bir kanal ID belirtin.');
    }

    serverChannels[message.guild.id] = channelId;
    fs.writeFileSync('serverChannels.json', JSON.stringify(serverChannels, null, 2));
    message.reply(`Partner kanalı başarıyla ayarlandı: <#${channelId}>`);
  }

  // A!top komutunu işleme
  if (message.content === 'A!top') {
    const guildId = message.guild.id;
    const sortedWeeklyPoints = Object.entries(serverPoints[guildId]?.weekly || {}).sort(([, a], [, b]) => b - a);
    paginate(sortedWeeklyPoints, message, 'Bu Sunucuda En Çok Partner Yapanlar <:Soiyll_Butterfly:1230240871585415339>', user => `<@${user[0]}> - ${user[1]} puan`);
  }

  // A!topall komutunu işleme
  if (message.content === 'A!topall') {
    const allPoints = {};

    Object.entries(serverPoints).forEach(([guildId, points]) => {
      Object.entries(points.total).forEach(([userId, userPoints]) => {
        if (!allPoints[userId]) {
          allPoints[userId] = 0;
        }
        allPoints[userId] += userPoints;
      });
    });

    const sortedAllTimePoints = Object.entries(allPoints).sort(([, a], [, b]) => b - a);
    paginate(sortedAllTimePoints, message, 'Tüm Sunucularda En Çok Partner Yapanlar <:Soiyll_Butterfly:1230240871585415339>', user => `<@${user[0]}> - ${user[1]} puan`);
  }

  // A!topserver komutunu işleme
  if (message.content === 'A!topserver') {
    const guildId = message.guild.id;
    const sortedServerPoints = Object.entries(serverPoints[guildId]?.total || {}).sort(([, a], [, b]) => b - a);
    paginate(sortedServerPoints, message, 'Bu Sunucuda En Çok Partner Yapanlar <:Soiyll_Butterfly:1230240871585415339>', user => `<@${user[0]}> - ${user[1]} puan`);
  }
});

// Sayfa başına gönderilen sonuçları işleyen fonksiyon
function paginate(sortedPoints, message, title, formatUser) {
  const pageSize = 10;
  const totalPages = Math.ceil(sortedPoints.length / pageSize);
  let currentPage = 0;

  const sendPage = (page) => {
    const start = page * pageSize;
    const end = start + pageSize;
    const embed = new EmbedBuilder()
      .setColor(getRandomColor())
      .setTitle(title)
      .setDescription(sortedPoints.slice(start, end).map(formatUser).join('\n') || 'Hiçbir sonuç bulunamadı.');

    message.channel.send({ embeds: [embed] });
  };

  const collector = message.channel.createMessageCollector({ time: 60000 });

  collector.on('collect', (reaction) => {
    if (reaction.content === '◀️' && currentPage > 0) {
      currentPage--;
      sendPage(currentPage);
    } else if (reaction.content === '▶️' && currentPage < totalPages - 1) {
      currentPage++;
      sendPage(currentPage);
    }
  });

  sendPage(currentPage);
}

// Rastgele renk üretme fonksiyonu
function getRandomColor() {
  const color = `#${Math.floor(Math.random() * 16777215).toString(16)}`;
  console.log(`Generated color: ${color}`); // Renk kodunu konsola yazdır
  return color;
}

client.login(process.env.DISCORD_TOKEN);
