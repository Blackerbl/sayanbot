require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const cron = require('node-cron');
const { google } = require('googleapis');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const weeklyPoints = {};
const allTimePoints = {};
const serverChannels = {};

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
  for (const userId in weeklyPoints) {
    weeklyPoints[userId] = 0;
  }
  fs.writeFileSync('weeklyPoints.json', JSON.stringify(weeklyPoints, null, 2));
  console.log('Haftalık puanlar sıfırlandı.');
});

// Google Drive yedekleme işlemi
async function backupPointsToGoogleDrive() {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });

  const drive = google.drive({ version: 'v3', auth });

  const backupData = {
    weeklyPoints,
    allTimePoints,
    serverChannels,
  };

  const fileMetadata = {
    name: 'points_backup.json',
    parents: [folderId],
  };
  
  const media = {
    mimeType: 'application/json',
    body: JSON.stringify(backupData),
  };

  try {
    const response = await drive.files.create({
      resource: fileMetadata,
      media,
      fields: 'id',
    });
    console.log('Yedekleme başarılı. Dosya ID:', response.data.id);
  } catch (error) {
    console.error('Yedekleme işlemi sırasında hata oluştu:', error);
  }
}

// Yedekleme işlemini her 5 dakikada bir yapmak için cron job
cron.schedule('*/5 * * * *', () => {
  backupPointsToGoogleDrive();
});

function getRandomColor() {
  return `#${Math.floor(Math.random() * 16777215).toString(16)}`;
}

client.on('messageCreate', async message => {
  const inviteLinkRegex = /discord(?:\.com|app\.com|\.gg)\/(?:invite\/)?[a-zA-Z0-9-]{2,32}/;

  if (serverChannels[message.guild.id] === message.channel.id && inviteLinkRegex.test(message.content)) {
    const userId = message.author.id;

    if (!weeklyPoints[userId]) {
      weeklyPoints[userId] = 0;
    }

    if (!allTimePoints[userId]) {
      allTimePoints[userId] = 0;
    }

    weeklyPoints[userId] += 1;
    allTimePoints[userId] += 1;

    const userWeeklyPoints = weeklyPoints[userId];
    const userAllTimePoints = allTimePoints[userId];
    const userWeeklyRank = Object.values(weeklyPoints).filter(p => p > userWeeklyPoints).length + 1;
    const userAllTimeRank = Object.values(allTimePoints).filter(p => p > userAllTimePoints).length + 1;

    const embed = new EmbedBuilder()
      .setColor(getRandomColor())
      .setTitle('<:Soiyll_Butterfly:1230240871585415339>Yeni Partner<:Soiyll_Butterfly:1230240871585415339>')
      .setDescription(`<:Soiyll_Butterfly:1230240871585415339> ︰Yeni partner için teşekkürler <@${userId}>!`)
      .addFields(
        { name: '<:Soiyll_Butterfly:1230240871585415339> Haftalık Puan', value: `${userWeeklyPoints} 🏆` },
        { name: '<:Soiyll_Butterfly:1230240871585415339> Toplam Puan', value: `${userAllTimePoints} 🏆` },
        { name: '<:Soiyll_Butterfly:1230240871585415339> Haftalık Sıralama', value: `${userWeeklyRank}` },
        { name: '<:Soiyll_Butterfly:1230240871585415339> Toplam Sıralama', value: `${userAllTimeRank}` },
      );

    message.channel.send({ embeds: [embed] });

    fs.writeFileSync('weeklyPoints.json', JSON.stringify(weeklyPoints, null, 2));
    fs.writeFileSync('allTimePoints.json', JSON.stringify(allTimePoints, null, 2));
  }

  // r!partnerdurum komutunu işleme
  if (message.content.startsWith('r!partnerdurum')) {
    const args = message.content.split(' ');
    if (args.length < 2) {
      return message.reply('Lütfen bir kullanıcı belirtin.');
    }

    const user = message.mentions.users.first() || message.guild.members.cache.get(args[1]).user;

    if (!user) {
      return message.reply('Belirtilen kullanıcı bulunamadı.');
    }

    const userId = user.id;
    const userWeeklyPoints = weeklyPoints[userId] || 0;
    const userAllTimePoints = allTimePoints[userId] || 0;
    const userWeeklyRank = Object.values(weeklyPoints).filter(p => p > userWeeklyPoints).length + 1;
    const userAllTimeRank = Object.values(allTimePoints).filter(p => p > userAllTimePoints).length + 1;

    const embed = new EmbedBuilder()
      .setColor(getRandomColor())
      .setTitle(`${user.tag} için Partner Puanları`)
      .addFields(
        { name: '︶ ͡ ۫ ˓ ʚ🪷ɞ ˒ ۫ ͡ ︶', value: '\u200B' }, // Boş bir alan için, yalnızca stil amaçlı
        { name: '🪽︰ Toplam Puan', value: `**${userAllTimePoints} 🏆**` },
        { name: '🕯️︰ Haftalık Puan', value: `**${userWeeklyPoints} 🏆**` },
        { name: '☁️︰ Haftalık Sıralama', value: `**${userWeeklyRank}**` },
        { name: '🦢︰ Toplam Sıralama', value: `**${userAllTimeRank}**` },
        { name: '︶ ͡ ۫ ˓ ʚ🪷ɞ ˒ ۫ ͡ ︶', value: '\u200B' } // Boş bir alan için, yalnızca stil amaçlı
      );

    message.channel.send({ embeds: [embed] });
  }

  // r!partnerkanalayarla komutunu işleme
  if (message.content.startsWith('r!partnerkanalayarla')) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply('Bu komutu kullanmak için yetkiniz yok.');
    }

    serverChannels[message.guild.id] = message.channel.id;

    fs.writeFileSync('serverChannels.json', JSON.stringify(serverChannels, null, 2));

    message.channel.send(`Bu sunucu için partner kanalı olarak <#${message.channel.id}> ayarlandı.`);
  }

  // r!topserver komutunu işleme
  if (message.content === 'r!topserver') {
    const guildsArray = Array.from(client.guilds.cache.values());
    const guildPoints = guildsArray.map(guild => ({
      name: guild.name,
      points: Object.values(allTimePoints).reduce((total, points) => total + points, 0)
    }));
    const sortedGuilds = guildPoints.sort((a, b) => b.points - a.points);

    paginate(sortedGuilds, message, 'En Çok Partner Yapan Sunucular', guild => `${guild.name} - ${guild.points} puan`);
  }

  // r!top komutunu işleme
  if (message.content === 'r!top') {
    const guildMembers = message.guild.members.cache;
    const guildAllTimePoints = Object.entries(allTimePoints)
      .filter(([userId]) => guildMembers.has(userId))
      .sort(([, a], [, b]) => b - a);
      
    paginate(guildAllTimePoints, message, 'Bu Sunucuda En Çok Partner Yapanlar <:Soiyll_Butterfly:1230240871585415339> ', ([userId, points]) => {
      const user = guildMembers.get(userId).user;
      return `${user ? user.tag : 'Bilinmeyen Kullanıcı'} - ${points} **Partner** <:Soiyll_Butterfly:1230240871585415339> `;
    });
  }

  // r!topall komutunu işleme
  if (message.content === 'r!topall') {
    const sortedAllTimePoints = Object.entries(allTimePoints).sort(([, a], [, b]) => b - a);

    paginate(sortedAllTimePoints, message, '<:Soiyll_Butterfly:1230240871585415339> En Çok Partner Yapan Kullanıcılar', ([userId, points]) => {
      const user = client.users.cache.get(userId);
      return `${user ? user.tag : 'Bilinmeyen Kullanıcı'} - ${points} Partner <:Soiyll_Butterfly:1230240871585415339> `;
    });
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;

  const [action, page, ...data] = interaction.customId.split('_');

  if (action === 'paginate') {
    const embed = createPaginatedEmbed(data, parseInt(page, 10));
    await interaction.update({ embeds: [embed], components: createPaginationComponents(parseInt(page, 10), data.length) });
  }
});

function paginate(data, message, title, formatFunction) {
  const pageSize = 10;
  const totalPages = Math.ceil(data.length / pageSize);

  const embed = createPaginatedEmbed(data, 1, title, formatFunction);
  const components = createPaginationComponents(1, totalPages);

  message.channel.send({ embeds: [embed], components });
}

function createPaginatedEmbed(data, page, title, formatFunction) {
  const pageSize = 10;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paginatedData = data.slice(start, end);

  return new EmbedBuilder()
    .setColor(getRandomColor())
    .setTitle(title)
    .setDescription(paginatedData.map((item, index) => `${start + index + 1}. ${formatFunction(item)}`).join('\n'))
    .setFooter({ text: `Sayfa ${page} / ${Math.ceil(data.length / pageSize)}` }); // Sayfa bilgisi
}

function createPaginationComponents(page, totalPages) {
  return [
    {
      type: 1,
      components: [
        {
          type: 2,
          style: 1,
          label: '⬅️',
          customId: `paginate_${page - 1}`,
          disabled: page === 1
        },
        {
          type: 2,
          style: 1,
          label: '➡️',
          customId: `paginate_${page + 1}`,
          disabled: page === totalPages
        }
      ]
    }
  ];
}

client.login(process.env.DISCORD_TOKEN);
