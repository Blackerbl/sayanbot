require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, MessageActionRow, ButtonBuilder } = require('discord.js');
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

// Durum güncellemeleri için bir dizi oluştur
const statuses = [
  'Sayıyoruz La',
  'Kekenin Selamı Var!',
  'Sorun Varsa Keke_km yaz',
  'Sunucularınızı yönetiyorum!',
  'Hiçbirşey Aynı Değil !',
  '${guildCount} Sunucudayız Keke ',
  'A!yardım Yazarak Komutlarımı Görebilirsin :} ',
];

// Her 10 saniyede bir durumu değiştir
setInterval(() => {
  const status = statuses[Math.floor(Math.random() * statuses.length)];
  client.user.setActivity(status, { type: 'WATCHING' });
}, 10000); // 10000 milisaniye = 10 saniye

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
      .setTitle('<a:kelebek:1271049122090192958> Yeni Partner <a:kelebek:1271049122090192958>')
      .setDescription(`<a:kelebek:1271049122090192958> ︰Yeni partner için teşekkürler <@${userId}>!`)
      .addFields(
        { name: '<a:kelebek:1271049122090192958> Haftalık Puan', value: `${userWeeklyPoints} 🏆` },
        { name: '<a:kelebek:1271049122090192958> Toplam Puan', value: `${userAllTimePoints} 🏆` },
        { name: '<a:kelebek:1271049122090192958> Haftalık Sıralama', value: `${userWeeklyRank}` },
        { name: '<a:kelebek:1271049122090192958> Toplam Sıralama', value: `${userAllTimeRank}` },
      );

    message.channel.send({ embeds: [embed] });
    fs.writeFileSync('serverPoints.json', JSON.stringify(serverPoints, null, 2));
  }

if (message.content === 'A!bilgi') {
  const botInfoEmbed = new EmbedBuilder()
    .setColor(getRandomColor())
    .setTitle('Bot Bilgisi')
    .setDescription('Aşağıda bot hakkında bazı bilgiler bulunmaktadır:')
    .addFields(
      { name: 'Bot Adı', value: `${client.user.username}`, inline: true },
      { name: 'Destek Sunucusu ', value: `https://discord.gg/FUTaWCytme`, inline: true },
      { name: 'Toplam Sunucu Sayısı', value: `${client.guilds.cache.size}`, inline: true },
      { name: 'Yapımcı', value: 'Keke_km', inline: true },
      { name: 'Versiyon', value: '0.0.0', inline: true }
    )
    

  // Embed'i gönder
  message.channel.send({ embeds: [botInfoEmbed] });
}

// A!partnerkanalayarla komutunu işleme
if (message.content.startsWith('A!partnerkanalayarla')) {
  // Kullanıcının yönetici yetkisi olup olmadığını kontrol et
  if (!message.member.permissions.has('ADMINISTRATOR')) {
    return message.channel.send('Bu komutu kullanmak için yönetici iznine sahip olmalısınız.');
  }

  const args = message.content.split(' ').slice(1); // Komuttan sonraki kısmı al
  const channelMention = args[0]; // Ayarlanacak kanalın etiketini al
  
  if (!channelMention) {
    return message.channel.send('Lütfen bir kanal belirtin.');
  }
  
  const channelId = channelMention.replace(/[<#>]/g, ''); // Kanal ID'sini çıkar
  const channel = client.channels.cache.get(channelId);
  
  if (!channel || channel.guild.id !== message.guild.id) {
    return message.channel.send('Geçersiz kanal. Lütfen bu sunucuda bulunan bir kanal belirtin.');
  }

  // Sunucunun partner kanalı olarak ayarlayın
  if (!serverChannels[message.guild.id]) {
    serverChannels[message.guild.id] = {};
  }

  serverChannels[message.guild.id].partnerChannel = channelId;

  message.channel.send(`Partner kanalı başarıyla ayarlandı: <#${channelId}>`);


  if (message.content === 'A!yardım') {
    const helpEmbed = new EmbedBuilder()
      .setColor(getRandomColor())
      .setTitle('Bot Komutları')
      .setDescription('Aşağıda botun tüm komutları ve açıklamaları bulunmaktadır:')
      .addFields(
        { name: 'A!puan [@kullanıcı]', value: 'Belirtilen kullanıcının puan durumunu gösterir.', inline: true },
        { name: 'A!partnerkanalayarla [kanal ID]', value: 'Partner mesajlarının gönderileceği kanalı ayarlar.', inline: true },
        { name: 'A!top', value: 'Bu sunucuda en çok partner yapan kullanıcıları listeler.', inline: true },
        { name: 'A!topall', value: 'Tüm sunucularda en çok partner yapan kullanıcıları listeler.', inline: true },
        { name: 'A!topserver', value: 'En çok partner yapan sunucuları sıralar.', inline: true },
        { name: 'A!bilgi', value: 'Bot hakkında bilgi verir.', inline: false }
      ){ name: 'A!partnerkanalayarla value: 'Sunucunun Partner kanalını ayarlar', inline: true },
    message.channel.send({ embeds: [helpEmbed] });
  }

  if (message.content.startsWith('A!puan')) {
    const args = message.content.split(' ');
    const userId = args[1] ? args[1].replace(/[<@!>]/g, '') : message.author.id;
    const guildId = message.guild.id;

    const userWeeklyPoints = serverPoints[guildId]?.weekly[userId] || 0;
    const userAllTimePoints = serverPoints[guildId]?.total[userId] || 0;
    const userWeeklyRank = Object.values(serverPoints[guildId]?.weekly || {}).filter(p => p > userWeeklyPoints).length + 1;
    const userAllTimeRank = Object.values(serverPoints[guildId]?.total || {}).filter(p => p > userAllTimePoints).length + 1;

    const pointsEmbed = new EmbedBuilder()
      .setColor(getRandomColor())
      .setTitle(`<@${userId}> için puan durumu`)
      .addFields(
        { name: 'Haftalık Puan', value: `${userWeeklyPoints}`, inline: true },
        { name: 'Toplam Puan', value: `${userAllTimePoints}`, inline: true },
        { name: 'Haftalık Sıralama', value: `${userWeeklyRank}`, inline: true },
        { name: 'Toplam Sıralama', value: `${userAllTimeRank}`, inline: true },
      );

    message.channel.send({ embeds: [pointsEmbed] });
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
  await paginate(sortedAllTimePoints, message, 'Tüm Sunucularda En Çok Partner Yapanlar <a:kelebek:1271049122090192958>', user => `<@${user[0]}> - ${user[1]} puan`);
}

// A!topserver komutunu işleme
if (message.content === 'A!topserver') {
  const sortedServerPoints = Object.entries(serverPoints)
    .map(([guildId, points]) => {
      const totalPoints = Object.values(points.total).reduce((acc, cur) => acc + cur, 0);
      return { guildId, totalPoints };
    })
    .sort((a, b) => b.totalPoints - a.totalPoints); // En çok puan alana göre sıralama

  const embed = new EmbedBuilder()
    .setColor(getRandomColor())
    .setTitle('En Çok Partner Yapan Sunucular')
    .setDescription(
      sortedServerPoints.length > 0
        ? sortedServerPoints.map((server, index) => 
            `**${index + 1}.** <${server.guildId}> - ${server.totalPoints} puan`
          ).join('\n')
        : 'Henüz hiç partner yapılmadı.'
    );

  message.channel.send({ embeds: [embed] });
}

  if (message.content.startsWith('A!top')) {
    const sortedPoints = Object.entries(serverPoints[message.guild.id]?.total || {})
      .sort(([, a], [, b]) => b - a)
      .map(([userId, points]) => ({ userId, points }));

    const title = 'En Çok Partner Yapan Kullanıcılar';
    await paginate(sortedPoints, message, title, user => `<@${user.userId}> - ${user.points} puan`);
  }

  if (message.content.startsWith('A!topall')) {
    const allUsersPoints = {};
    for (const guildId in serverPoints) {
      for (const userId in serverPoints[guildId].total) {
        allUsersPoints[userId] = (allUsersPoints[userId] || 0) + serverPoints[guildId].total[userId];
      }
    }

    const sortedPoints = Object.entries(allUsersPoints)
      .sort(([, a], [, b]) => b - a)
      .map(([userId, points]) => ({ userId, points }));

    const title = 'Tüm Sunucularda En Çok Partner Yapan Kullanıcılar';
    await paginate(sortedPoints, message, title, user => `<@${user.userId}> - ${user.points} puan`);
  }

  if (message.content.startsWith('A!topserver')) {
    const sortedServers = Object.entries(serverPoints)
      .map(([guildId, points]) => ({
        guildId,
        totalPartners: Object.values(points.total).reduce((sum, p) => sum + p, 0)
      }))
      .sort((a, b) => b.totalPartners - a.totalPartners);

    const title = 'En Çok Partner Yapan Sunucular';
    await paginate(sortedServers, message, title, server => `<a:kelime:1271049122090192958> ${server.guildId} - ${server.totalPartners} partner`);
  }
});

// Renk oluşturma fonksiyonu
function getRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

client.login(process.env.DISCORD_TOKEN);
