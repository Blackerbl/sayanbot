require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder } = require('discord.js');
const fs = require('fs');
const cron = require('node-cron');
const express = require('express'); // Express'i içe aktar

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

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
});

// Haftalık puanları her Pazar gece yarısı sıfırlamak için cron job
cron.schedule('0 0 * * 0', () => {
  for (const guildId in serverPoints) {
    for (const userId in serverPoints[guildId].weekly) {
      serverPoints[guildId].weekly[userId] = 0;
    }
  }
  fs.writeFileSync('serverPoints.json', JSON.stringify(serverPoints, null, 2));
  console.log('Haftalık puanlar sıfırlandı.');
});

function getRandomColor() {
  return `#${Math.floor(Math.random() * 16777215).toString(16)}`;
}

// Express endpoint'i tanımlama
app.get('/', (req, res) => {
  res.send('Discord botu çalışıyor!');
});

// Express sunucusunu başlat
app.listen(PORT, () => {
  console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor.`);
});

client.on('messageCreate', async message => {
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

  // r!puan komutunu işleme
  if (message.content.startsWith('r!puan')) {
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

  // r!partnerkanalayarla komutunu işleme
  if (message.content.startsWith('r!partnerkanalayarla')) {
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

  // r!topserver komutunu işleme
  if (message.content === 'r!topserver') {
    const guildPoints = Object.entries(serverPoints).map(([guildId, points]) => ({
      name: client.guilds.cache.get(guildId)?.name || 'Bilinmeyen Sunucu',
      points: Object.values(points.total).reduce((total, points) => total + points, 0)
    }));
    const sortedGuilds = guildPoints.sort((a, b) => b.points - a.points);

    paginate(sortedGuilds, message, 'En Çok Partner Yapan Sunucular', guild => `${guild.name} - ${guild.points} puan`);
  }

  // r!top komutunu işleme
  if (message.content === 'r!top') {
    const guildId = message.guild.id;
    const guildMembers = message.guild.members.cache;
    const guildAllTimePoints = Object.entries(serverPoints[guildId]?.total || {})
      .sort(([, a], [, b]) => b - a);

    paginate(guildAllTimePoints, message, 'Bu Sunucuda En Çok Partner Yapanlar <:Soiyll_Butterfly:1230240871585415339>', ([userId, points]) => {
      const user = guildMembers.get(userId)?.user;
      return `${user ? user.tag : 'Bilinmeyen Kullanıcı'} - ${points} **Partner** <:Soiyll_Butterfly:1230240871585415339>`;
    });
  }

  // r!topall komutunu işleme
  if (message.content === 'r!topall') {
    const sortedAllTimePoints = Object.entries(allTimePoints).sort(([, a], [, b]) => b - a);

    paginate(sortedAllTimePoints, message, '<:Soiyll_Butterfly:1230240871585415339> Tüm Zamanların En İyileri <:Soiyll_Butterfly:1230240871585415339>', ([userId, points]) => {
      const user = client.users.cache.get(userId);
      return `${user ? user.tag : 'Bilinmeyen Kullanıcı'} - ${points} **Partner** <:Soiyll_Butterfly:1230240871585415339>`;
    });
  }
});

// Sayfalama fonksiyonu
function paginate(data, message, title, format) {
  const itemsPerPage = 10; // Sayfa başına gösterilecek öğe sayısı
  const totalPages = Math.ceil(data.length / itemsPerPage);
  
  let currentPage = 0;

  const updateEmbed = () => {
    const start = currentPage * itemsPerPage;
    const end = start + itemsPerPage;
    const currentItems = data.slice(start, end).map(format).join('\n') || 'Hiçbir veri yok.';

    const embed = new EmbedBuilder()
      .setColor(getRandomColor())
      .setTitle(title)
      .setDescription(currentItems)
      .setFooter({ text: `Sayfa ${currentPage + 1} / ${totalPages}` });

    message.channel.send({ embeds: [embed] }).then(sentMessage => {
      // Sayfalar arasında geçiş yapmak için butonlar ekleyelim
      if (totalPages > 1) {
        const row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('prev')
              .setLabel('Önceki')
              .setDisabled(currentPage === 0)
              .setStyle('PRIMARY'),
            new ButtonBuilder()
              .setCustomId('next')
              .setLabel('Sonraki')
              .setDisabled(currentPage === totalPages - 1)
              .setStyle('PRIMARY')
          );

        sentMessage.edit({ components: [row] });

        const filter = interaction => interaction.user.id === message.author.id;

        const collector = sentMessage.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', interaction => {
          if (interaction.customId === 'next') {
            currentPage++;
          } else if (interaction.customId === 'prev') {
            currentPage--;
          }
          updateEmbed();
          interaction.deferUpdate();
        });

        collector.on('end', () => {
          sentMessage.edit({ components: [] }); // Butonları kaldır
        });
      }
    });
  };

  updateEmbed();
}

client.login(process.env.BOT_TOKEN);
