require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const cron = require('node-cron');
const express = require('express');

const app = express();
const port = process.env.PORT || 3000; // Varsayılan port 3000

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const afkFilePath = './afkUsers.json';
const weeklyPoints = {};
const allTimePoints = {};
const serverPoints = {};
const serverChannels = {};
const userId = '1123893835773263934';
const files = [
    './weeklyPoints.json',
    './allTimePoints.json',
    './serverChannels.json',
    './serverPoints.json'
];



// AFK kullanıcılarını dosyadan yükle
let afkUsers = new Map();
if (fs.existsSync(afkFilePath)) {
    const data = fs.readFileSync(afkFilePath);
    const json = JSON.parse(data);
    for (const [userId, userData] of Object.entries(json)) {
        afkUsers.set(userId, userData);
    }
}

// AFK kullanıcılarını dosyaya kaydet
function saveAfkUsers() {
    const json = {};
    for (const [userId, userData] of afkUsers) {
        json[userId] = userData;
    }
    fs.writeFileSync(afkFilePath, JSON.stringify(json, null, 2));
}

// Dosyalardan puanları ve kanal ayarlarını yükleme
if (fs.existsSync('weeklyPoints.json')) {
  const rawData = fs.readFileSync('weeklyPoints.json');
  Object.assign(weeklyPoints, JSON.parse(rawData));
}

if (fs.existsSync('allTimePoints.json')) {
  const rawData = fs.readFileSync('allTimePoints.json');
  Object.assign(allTimePoints, JSON.parse(rawData));
}

if (fs.existsSync('serverChannels.json')) {
  const rawData = fs.readFileSync('serverChannels.json');
  Object.assign(serverChannels, JSON.parse(rawData));
}

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
  fs.writeFileSync('weeklyPoints.json', JSON.stringify(serverPoints, null, 2));
  console.log('Haftalık puanlar sıfırlandı.');
});

// Express sunucusunu başlat
app.get('/', (req, res) => {
  res.send('Bot çalışıyor!');
});

app.listen(port, () => {
  console.log(`Sunucu http://localhost:${port} adresinde çalışıyor.`);
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  const inviteLinkRegex = /discord(?:\.com|app\.com|\.gg)\/(?:invite\/)?[a-zA-Z0-9-]{2,32}/;

  // Partner mesajı alındığında puanları güncelleme
  if (serverChannels[message.guild.id] === message.channel.id && inviteLinkRegex.test(message.content)) {
    const userId = message.author.id;

    if (!serverPoints[message.guild.id]) {
      serverPoints[message.guild.id] = { weekly: {}, total: {} };
    }

    if (!serverPoints[message.guild.id].weekly[userId]) {
      serverPoints[message.guild.id].weekly[userId] = 0;
    }

    if (!serverPoints[message.guild.id].total[userId]) {
      serverPoints[message.guild.id].total[userId] = 0;
    }

    serverPoints[message.guild.id].weekly[userId] += 1;
    serverPoints[message.guild.id].total[userId] += 1;

    const userWeeklyPoints = serverPoints[message.guild.id].weekly[userId];
    const userAllTimePoints = serverPoints[message.guild.id].total[userId];
    const userWeeklyRank = Object.values(serverPoints[message.guild.id].weekly).filter(p => p > userWeeklyPoints).length + 1;
    const userAllTimeRank = Object.values(serverPoints[message.guild.id].total).filter(p => p > userAllTimePoints).length + 1;

    const replyEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('<a:kelebek:1271049122090192958> Yeni Partner <a:kelebek:1271049122090192958>')
      .setDescription(`<a:kelebek:1271049122090192958> ︰Yeni partner için teşekkürler <@${userId}>!`)
      .addFields(
        { name: '<a:kelebek:1271049122090192958> Haftalık Puan', value: `${userWeeklyPoints} <:ohacus:1252301623192060025>` },
        { name: '<a:kelebek:1271049122090192958> Toplam Puan', value: `${userAllTimePoints} <:ohacus:1252301623192060025>` },
        { name: '<a:kelebek:1271049122090192958> Haftalık Sıralama', value: `${userWeeklyRank}<:ohacus:1252301623192060025>` },
        { name: '<a:kelebek:1271049122090192958> Toplam Sıralama', value: `${userAllTimeRank}<:ohacus:1252301623192060025>` },
      );

    message.channel.send({ embeds: [replyEmbed] });

    // Puanları dosyalara kaydet
    fs.writeFileSync('serverPoints.json', JSON.stringify(serverPoints, null, 2));
  }

if (message.content === 'A!bilgi') {
  const totalUsers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
  const uptimeInSeconds = Math.floor(client.uptime / 1000);
  const currentTimeInSeconds = Math.floor(Date.now() / 1000);
  const uptimeUnixTimestamp = currentTimeInSeconds + uptimeInSeconds;

const botInfoEmbed = new EmbedBuilder()
    .setColor(getRandomColor())
    .setTitle('Bot Bilgisi')
    .setDescription('Aşağıda bot hakkında bazı bilgiler bulunmaktadır:')
    .addFields(
      { name: 'Bot Adı <:5209chibipaimonthink:1195643511433859072> ', value: `${client.user.username}`, inline: true },
      { name: 'Bot ID <:5209chibipaimonthink:1195643511433859072> ', value: `${client.user.id}`, inline: true },
      { name: 'Destek Sunucusu <:Cenzuoyeah:1207061939990175824> ', value: `[Buraya tıklayın](https://discord.gg/FUTaWCytme)`, inline: true },
      { name: 'Toplam Sunucu Sayısı <:Cenzuoyeah:1207061939990175824> ', value: `${client.guilds.cache.size}`, inline: true },
      { name: 'Toplam Kullanıcı Sayısı <:Cenzuoyeah:1207061939990175824> ', value: `${totalUsers}`, inline: true },
      { name: 'Yapımcı <:silahlkedyremovebgpreview:1244232770939654184>', value: 'Keke_km', inline: true },
      { name: 'Versiyon <:silahlkedyremovebgpreview:1244232770939654184> ', value: '0.0.0', inline: true },
      { name: 'Uptime <:9878jettsleepy:1207080216279781446>', value: `<t:${uptimeUnixTimestamp}:R>`, inline: true },
      { name: 'Ping <:kedigojo:1253800303719878668> ', value: `${client.ws.ping}ms`, inline: true },
      { name: 'Prefix <:kedigojo:1253800303719878668> ', value: `A!`, inline: true }
    ) // Noktalı virgül kaldırıldı
    .setFooter({ text: 'Bilgiler güncellenebilir.', iconURL: client.user.displayAvatarURL() })
    .setTimestamp();


  message.channel.send({ embeds: [botInfoEmbed] });
}

if (message.content.startsWith('A!afk')) {
    const reason = message.content.split(' ').slice(1).join(' ') || 'Sebep belirtilmedi.';
    afkUsers.set(message.author.id, { reason, timestamp: Date.now() });
    saveAfkUsers(); // Kullanıcıyı kaydet
    message.reply(`AFK duruma alındınız. Sebep: ${reason}`);
} else {
    // AFK olan kullanıcıları etiketleyenler
    const afkData = afkUsers.get(message.author.id);
    if (afkData) {
        // Kullanıcı AFK ise, durumu kaldır
        afkUsers.delete(message.author.id);
        saveAfkUsers(); // Güncellemeleri kaydet
        message.reply(`AFK durumunuz kaldırıldı. Geçen süre: ${Math.floor((Date.now() - afkData.timestamp) / 1000)} saniye.`);
    } else {
        // AFK olan kullanıcıyı kontrol et
        const mentionedUser = message.mentions.users.first();
        if (mentionedUser && afkUsers.has(mentionedUser.id)) {
            const mentionedAfkData = afkUsers.get(mentionedUser.id);
            const afkDuration = Math.floor((Date.now() - mentionedAfkData.timestamp) / 1000);
            const afkUnixTimestamp = Math.floor(mentionedAfkData.timestamp / 1000); // AFK zaman damgası Unix olarak

            message.reply(`Üzgünüm, ${mentionedUser.username} AFK. Sebep: ${mentionedAfkData.reason}, AFK kalma süresi: <t:${afkUnixTimestamp}:R>`);
        }
    }
}

//A!durum komudu
  if (message.content.startsWith('A!durum')) {
  const args = message.content.split(' ');
  const userId = args[1] ? args[1].replace(/[<@!>]/g, '') : message.author.id;
  const guildId = message.guild.id;

  const user = await message.guild.members.fetch(userId);
  const userWeeklyPoints = serverPoints[guildId]?.weekly[userId] || 0;
  const userAllTimePoints = serverPoints[guildId]?.total[userId] || 0;
  const userWeeklyRank = Object.values(serverPoints[guildId]?.weekly || {}).filter(p => p > userWeeklyPoints).length + 1;
  const userAllTimeRank = Object.values(serverPoints[guildId]?.total || {}).filter(p => p > userAllTimePoints).length + 1;

  const pointsEmbed = new EmbedBuilder()
    .setColor(getRandomColor())
    .setTitle(`${user.user.tag} için puan durumu`)  // Kullanıcının tag'ını göster
    .addFields(
      { name: 'Haftalık Puan', value: `${userWeeklyPoints}`, inline: true },
      { name: 'Toplam Puan', value: `${userAllTimePoints}`, inline: true },
      { name: 'Haftalık Sıralama', value: `${userWeeklyRank}`, inline: true },
      { name: 'Toplam Sıralama', value: `${userAllTimeRank}`, inline: true },
    );

  message.channel.send({ embeds: [pointsEmbed] });
}

// Yedekleme fonksiyonunu tanımla
async function sendBackup() {
    try {
        const user = await client.users.fetch(userId);
        await user.send({
            content: "İşte yedek dosyalarınız:",
            files: files.map(file => ({ attachment: file }))
        });
        console.log('Yedek dosyaları başarıyla gönderildi.');
    } catch (error) {
        console.error('Dosyalar gönderilirken bir hata oluştu:', error);
    }
}

// A!yedekle komutu kullanıldığında yedekleme fonksiyonunu çağır
client.on('messageCreate', async (message) => {
    if (message.content === 'A!yedekle') {
        await sendBackup();
        message.channel.send('Yedek dosyaları başarıyla gönderildi.');
    }
});

// Her saat başında yedek dosyalarını gönder
setInterval(() => {
    const now = new Date();
    if (now.getMinutes() === 0 && now.getSeconds() === 0) { // Saat başı
        sendBackup();
    }
}, 1000); // Her saniye kontrol eder

  // A!partnerkanalayarla komutunu işleme
  if (message.content.startsWith('A!partnerkanalayarla')) {
    if (!message.member.permissions.has('ADMINISTRATOR')) {
      return message.reply('Bu komutu kullanmak için yetkiniz yok.');
    }

    serverChannels[message.guild.id] = message.channel.id;
    fs.writeFileSync('serverChannels.json', JSON.stringify(serverChannels, null, 2));

    message.channel.send(`Bu sunucu için partner kanalı olarak ayarlandı: <#${message.channel.id}>`);
  }

// A!yardım komutunu işleme
if (message.content === 'A!yardım') {
  const helpEmbed = new EmbedBuilder()
    .setColor('#00FF00')
    .setTitle('Bot Komutları')
    .setDescription('Aşağıda botun tüm komutları listelenmiştir:')
    .addFields(
      { name: ' <a:butterfly5:1230240683319623830>A!puan [@kullanıcı]', value: 'Kullanıcının puan durumunu gösterir.', inline: true },
      { name: ' <a:butterfly5:1230240683319623830> A!top', value: 'Haftalık en çok puan toplayan kullanıcıları gösterir.', inline: true },
      { name: ' <a:butterfly5:1230240683319623830>A!topserver', value: 'Sunucuda en çok puan toplayan kullanıcıyı gösterir.', inline: true },
      { name: ' <a:butterfly5:1230240683319623830> A!alltop', value: 'Tüm sunuculardaki en çok puan toplayan kullanıcıları gösterir.', inline: true },
      { name: ' <a:butterfly5:1230240683319623830> A!yedekle', value: 'Veri yedeği oluşturur.', inline: true },
      { name: ' <a:butterfly5:1230240683319623830> A!bilgi', value: 'Bot hakkında bilgi verir.', inline: true },
      // Diğer komutlarınızı buraya ekleyebilirsiniz
    )
    .setFooter({ text: 'Daha fazla bilgi için komutları deneyebilirsiniz!' });

  message.channel.send({ embeds: [helpEmbed] });
}




  // A!top komutunu işleme
  if (message.content === 'A!top') {
    const guildId = message.guild.id;

    if (!serverPoints[guildId] || Object.keys(serverPoints[guildId].total).length === 0) {
      return message.channel.send('Bu sunucuda puan kaydı bulunmamaktadır.');
    }

    const userPoints = serverPoints[guildId].total;
    const sortedUsers = Object.entries(userPoints)
      .map(([userId, points]) => ({
        userId,
        points,
        username: message.guild.members.cache.get(userId)?.user.username || 'Bilinmeyen Kullanıcı',
        weeklyPoints: serverPoints[guildId]?.weekly[userId] || 0
      }))
      .sort((a, b) => b.points - a.points);

    const embeds = [];
    const chunkSize = 5; // Her sayfada gösterilecek kullanıcı sayısı
    for (let i = 0; i < sortedUsers.length; i += chunkSize) {
      const pageUsers = sortedUsers.slice(i, i + chunkSize);
      const topEmbed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('Bu Sunucudaki En Çok Puanı Olan Kullanıcılar')
        .addFields(
          ...pageUsers.map((user, index) => ({
            name: `${i + index + 1}. ${user.username}`,
            value: `Haftalık: ${user.weeklyPoints} <:ohacus:1252301623192060025>\nToplam: ${user.points} <:ohacus:1252301623192060025>`,
            inline: true
          }))
        );
      embeds.push(topEmbed);
    }

    sendPaginatedEmbed(message.channel, embeds);
  }

  // A!alltop komutunu işleme
if (message.content === 'A!alltop') {
  const sortedAllTimeUsers = Object.entries(serverPoints)
    .flatMap(([guildId, points]) =>
      Object.entries(points.total).map(([userId, totalPoints]) => ({
        userId,
        points: totalPoints,
        username: message.guild.members.cache.get(userId)?.user.username || 'Bilinmeyen Kullanıcı',
        weeklyPoints: points.weekly[userId] || 0
      }))
    )
    .sort((a, b) => b.points - a.points);

  const embeds = [];
  const chunkSize = 5; // Her sayfada gösterilecek kullanıcı sayısı

  for (let i = 0; i < sortedAllTimeUsers.length; i += chunkSize) {
    const pageUsers = sortedAllTimeUsers.slice(i, i + chunkSize);
    const topEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('Tüm Sunuculardaki En Çok Puanı Olan Kullanıcılar')
      .setDescription('Aşağıda tüm sunuculardaki en yüksek puana sahip kullanıcılar listelenmiştir.');

    // Kullanıcıları ekle
    pageUsers.forEach((user, index) => {
      // Burada her bir alanın dolu olduğundan emin olun
      topEmbed.addFields({
        name: `${i + index + 1}. ${user.username}`,
        value: `Haftalık: ${user.weeklyPoints} <:ohacus:1252301623192060025>\nToplam: ${user.points} <:ohacus:1252301623192060025>`,
        inline: true
      });
    });

    embeds.push(topEmbed);
  }

  // Embedleri gönderme fonksiyonu
  // Gönderilecek embedlerin geçerli olup olmadığını kontrol et
  if (embeds.length > 0) {
    await sendPaginatedEmbed(message.channel, embeds);
  } else {
    console.error('Gönderilecek embed bulunamadı.');
    message.channel.send('Henüz bir kullanıcı bulunamadı.');
  }
}

// Kullanıcı AFK durumundan döndüğünde
client.on('presenceUpdate', (oldPresence, newPresence) => {
    if (oldPresence && afkUsers.has(oldPresence.userId)) {
        afkUsers.delete(oldPresence.userId);
        saveAfkUsers(); // Kullanıcıyı dosyadan kaldır
        oldPresence.member.send('AFK durumundan döndünüz.');
    }
});

  // A!servertop komutunu işleme
  if (message.content === 'A!servertop') {
    const serverPointsData = Object.entries(serverPoints)
      .map(([guildId, points]) => ({
        guildId,
        totalPoints: Object.values(points.total).reduce((a, b) => a + b, 0),
        totalWeeklyPoints: Object.values(points.weekly).reduce((a, b) => a + b, 0),
        guildName: message.guild.name
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints);

    const embeds = [];
    const chunkSize = 5; // Her sayfada gösterilecek sunucu sayısı
    for (let i = 0; i < serverPointsData.length; i += chunkSize) {
      const pageServers = serverPointsData.slice(i, i + chunkSize);
      const serverTopEmbed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('En Çok Puanı Olan Sunucular')
        .addFields(
          ...pageServers.map((server, index) => ({
            name: `${i + index + 1}. ${server.guildName}`,
            value: `Haftalık: ${server.totalWeeklyPoints} <:ohacus:1252301623192060025>\nToplam: ${server.totalPoints} <:ohacus:1252301623192060025>`,
            inline: true
          }))
        );
      embeds.push(serverTopEmbed);
    }

    sendPaginatedEmbed(message.channel, embeds);
  }
});

// Sayfalama için yardımcı fonksiyon
async function sendPaginatedEmbed(channel, embeds) {
  const message = await channel.send({ embeds: [embeds[0]] });

  // Reaksiyon ekleme
  await message.react('◀️');
  await message.react('▶️');

  let currentPage = 0;

  const filter = (reaction, user) => {
    return ['◀️', '▶️'].includes(reaction.emoji.name) && !user.bot;
  };

  const collector = message.createReactionCollector({ filter, time: 60000 });

  collector.on('collect', (reaction) => {
    if (reaction.emoji.name === '▶️') {
      currentPage = (currentPage + 1) % embeds.length;
    } else if (reaction.emoji.name === '◀️') {
      currentPage = (currentPage - 1 + embeds.length) % embeds.length;
    }
    message.edit({ embeds: [embeds[currentPage]] });
    reaction.users.remove(reaction.users.cache.last());
  });
}

function getRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}



// Botu başlat
client.login(process.env.TOKEN);
