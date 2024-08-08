require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const cron = require('node-cron');
const express = require('express'); // Express'i içe aktar

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const USER_ID = '1123893835773263934'; // Kullanıcı ID'si
const weeklyPoints = {};
const allTimePoints = {};
const serverPoints = {};
const serverChannels = {};

// Express uygulaması oluştur
const app = express();
const PORT = process.env.PORT || 3000; // Portu belirtin veya ortam değişkenini kullanın


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

    // Yedeklemeyi her saat başı yapacak cron job
  cron.schedule('0 * * * *', async () => {
    try {
      const userId = '1123893835773263934'; // Yedekleme gönderilecek kullanıcı ID'si
      const filesToSend = ['weeklyPoints.json', 'allTimePoints.json', 'serverChannels.json', 'serverPoints.json'];
      
      // Kullanıcıya dosyaları gönder
      await sendFilesToUser(userId, filesToSend);
      console.log('Yedekleme dosyaları gönderildi.');
    } catch (error) {
      console.error('Yedekleme sırasında hata oluştu:', error);
    }
  });
});

// Kullanıcıya dosyaları gönderen fonksiyon
async function sendFilesToUser(userId, fileNames) {
  const user = await client.users.fetch(userId);
  const attachments = fileNames.map(fileName => ({
    attachment: `./${fileName}`,
    name: fileName
  }));

  // Dosya isimleri geçerli bir dizi olmalı

if (Array.isArray(attachments) && attachments.length > 0) {
    await user.send({ files: attachments });
} else {
    throw new Error('Dosya isimleri geçerli bir dizi olmalıdır.');
}

  // Dosyaların başarıyla gönderilip gönderilemeyeceğini kontrol et
  if (attachments.length > 0) {
    await user.send({ files: attachments });
  } else {
    console.error('Gönderilecek dosya bulunamadı.');
  }
}

// Express endpoint'i tanımlama
app.get('/', (req, res) => {
  res.send('Discord botu aktif');
});

// Express sunucusunu başlat
app.listen(PORT, () => {
  console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor.`);
});

// A!yedekle komutunu işleme
if (message.content.startsWith('A!yedekle')) {
    const filesToSend = ['weeklyPoints.json', 'allTimePoints.json', 'serverChannels.json', 'serverPoints.json'];
    await sendFilesToUser(message.author.id, filesToSend);
}

try {
    const user = await client.users.fetch(userId);
    // Dosya gönderme işlemleri
} catch (error) {
    console.error(`Hata: ${error.message}`);
}

  const inviteLinkRegex = /discord(?:\.com|app\.com|\.gg)\/(?:invite\/)?[a-zA-Z0-9-]{2,32}/;

  // Partner mesajlarını kontrol etme
  if (serverChannels[message.guild.id] === message.channel.id && inviteLinkRegex.test(message.content)) {
    const userId = message.author.id;
    const guildId = message.guild.id;

    if (!serverPoints[guildId]) {
      serverPoints[guildId] = { weekly: {}, total: {} };
    }

    // Puanları güncelle
    serverPoints[guildId].weekly[userId] = (serverPoints[guildId].weekly[userId] || 0) + 1;
    serverPoints[guildId].total[userId] = (serverPoints[guildId].total[userId] || 0) + 1;

    // Kullanıcı puan ve sıralama bilgilerini elde etme
    const userWeeklyPoints = serverPoints[guildId].weekly[userId];
    const userAllTimePoints = serverPoints[guildId].total[userId];
    const userWeeklyRank = Object.values(serverPoints[guildId].weekly).filter(p => p > userWeeklyPoints).length + 1;
    const userAllTimeRank = Object.values(serverPoints[guildId].total).filter(p => p > userAllTimePoints).length + 1;

    // Mesaj gönderme
    const embed = new EmbedBuilder()
      .setColor(getRandomColor())
      .setTitle('<:Soiyll_Butterfly:1230240871585415339> Yeni Partner < :Soiyll_Butterfly:1230240871585415339>')
      .setDescription(`<:Soiyll_Butterfly:1230240871585415339> ︰Yeni partner için teşekkürler <@${userId}>!`)
      .addFields(
        { name: '<:Soiyll_Butterfly:1230240871585415339> Haftalık Puan', value: `${userWeeklyPoints} 🏆` },
        { name: '<:Soiyll_Butterfly:1230240871585415339> Toplam Puan', value: `${userAllTimePoints} 🏆` },
        { name: '<:Soiyll_Butterfly:1230240871585415339> Haftalık Sıralama', value: `${userWeeklyRank}` },
        { name: '<:Soiyll_Butterfly:1230240871585415339> Toplam Sıralama', value: `${userAllTimeRank}` },
      );

    message.channel.send({ embeds: [embed] });

    // Puanları dosyalara kaydet
    fs.writeFileSync('serverPoints.json', JSON.stringify(serverPoints, null, 2));
  }

  // A!puan komutunu işleme
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

  // A!partnerkanalayarla komutunu işleme
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

    // Sayfalandırma
    paginate(sortedWeeklyPoints, message, 'Bu Sunucuda En Çok Partner Yapanlar <:Soiyll_Butterfly:1230240871585415339>', user => `<@${user[0]}> - ${user[1]} puan`);
  }

  // A!topall komutunu işleme
  if (message.content === 'A!topall') {
    const allPoints = {};

    // Tüm sunuculardaki puanları toplama
    Object.entries(serverPoints).forEach(([guildId, points]) => {
      Object.entries(points.total).forEach(([userId, userPoints]) => {
        if (!allPoints[userId]) {
          allPoints[userId] = 0;
        }
        allPoints[userId] += userPoints;
      });
    });

    // Kullanıcı puanlarını sıralama
    const sortedAllTimePoints = Object.entries(allPoints).sort(([, a], [, b]) => b - a);

    // Sayfalandırma
    paginate(sortedAllTimePoints, message, 'Tüm Sunucularda En Çok Partner Yapanlar <:Soiyll_Butterfly:1230240871585415339>', user => `<@${user[0]}> - ${user[1]} puan`);
  }
});

// Sayfalandırma fonksiyonu
async function paginate(array, message, title, formatFunction) {
  const pageSize = 10;
  const pages = Math.ceil(array.length / pageSize);
  let page = 0;

  const embed = new EmbedBuilder()
    .setColor(getRandomColor())
    .setTitle(title)
    .setDescription(array.slice(page * pageSize, (page + 1) * pageSize).map(formatFunction).join('\n'));

  const reply = await message.reply({ embeds: [embed] });

  if (pages > 1) {
    await reply.react('⬅️');
    await reply.react('➡️');

    const filter = (reaction, user) => {
      return ['⬅️', '➡️'].includes(reaction.emoji.name) && !user.bot;
    };

    const collector = reply.createReactionCollector({ filter, time: 60000 });

    collector.on('collect', (reaction) => {
      if (reaction.emoji.name === '➡️') {
        if (page < pages - 1) {
          page++;
        }
      } else if (reaction.emoji.name === '⬅️') {
        if (page > 0) {
          page--;
        }
      }
      embed.setDescription(array.slice(page * pageSize, (page + 1) * pageSize).map(formatFunction).join('\n'));
      reply.edit({ embeds: [embed] });
      reaction.users.remove(reaction.users.cache.find(user => !user.bot));
    });
  }
}

// Rastgele renk üretme fonksiyonu
function getRandomColor() {
  return `#${Math.floor(Math.random() * 16777215).toString(16)}`;
}

// Botu başlatma
client.login(process.env.BOT_TOKEN);
