require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const cron = require('node-cron');
const { google } = require('googleapis');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const weeklyPoints = {};
const allTimePoints = {};
const serverChannels = {};
const drive = google.drive('v3');
let auth;

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
  authorize(); // Google API yetkilendirmesini başlat
});

// Google API için yetkilendirme
async function authorize() {
  const CREDENTIALS = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  const { client_secret, client_id } = CREDENTIALS.web;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret);

  // Token dosyasını kontrol et
  const tokenPath = 'token.json';
  if (fs.existsSync(tokenPath)) {
    const token = fs.readFileSync(tokenPath);
    oAuth2Client.setCredentials(JSON.parse(token));
    auth = oAuth2Client;
  } else {
    // Token yoksa yetkilendirme işlemini gerçekleştir
    console.log('Token bulunamadı. Lütfen yetkilendirme işlemini tamamlayın.');
    return;
  }
}

// Haftalık puanları her Pazar gece yarısı sıfırlamak için cron job
cron.schedule('0 0 * * 0', () => {
  for (const userId in weeklyPoints) {
    weeklyPoints[userId] = 0;
  }
  fs.writeFileSync('weeklyPoints.json', JSON.stringify(weeklyPoints, null, 2));
  console.log('Haftalık puanlar sıfırlandı.');
});

// Puanları Google Drive'a yedekleme
async function backupToGoogleDrive() {
  const fileMetadata = {
    name: 'points_backup.json',
    parents: ['YOUR_FOLDER_ID'] // Yedeklemenin yapılacağı klasör ID'sini buraya yazın
  };

  const media = {
    mimeType: 'application/json',
    body: fs.createReadStream('weeklyPoints.json') // Yedeklenecek dosya
  };

  try {
    const res = await drive.files.create({
      auth,
      resource: fileMetadata,
      media: media,
      fields: 'id'
    });
    console.log('Yedekleme işlemi başarılı. Yedeklenen dosya ID:', res.data.id);
  } catch (error) {
    console.error('Yedekleme işlemi sırasında hata oluştu:', error);
  }
}

// Her 5 dakikada bir yedekleme işlemi
setInterval(backupToGoogleDrive, 5 * 60 * 1000);

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
      .setTitle(':Soiyll_Butterfly:Yeni Partner:Soiyll_Butterfly:')
      .setDescription(`:Soiyll_Butterfly: ︰Yeni partner için teşekkürler <@${userId}>!`)
      .addFields(
        { name: ':Soiyll_Butterfly: Haftalık Puan', value: `${userWeeklyPoints} 🏆` },
        { name: ':Soiyll_Butterfly: Toplam Puan', value: `${userAllTimePoints} 🏆` },
        { name: ':Soiyll_Butterfly: Haftalık Sıralama', value: `${userWeeklyRank}` },
        { name: ':Soiyll_Butterfly: Toplam Sıralama', value: `${userAllTimeRank}` },
      );

    message.channel.send({ embeds: [embed] });

    // Puanları dosyalara kaydet
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

  // r!top server komutunu işleme
  if (message.content === 'r!top') {
    const guildMembers = message.guild.members.cache;
    const guildAllTimePoints = Object.entries(allTimePoints)
      .filter(([userId]) => guildMembers.has(userId))
      .sort(([, a], [, b]) => b - a);

    paginate(guildAllTimePoints, message, 'Bu Sunucuda En Çok Partner Yapanlar :Soiyll_Butterfly: ', ([userId, points]) => {
      const user = guildMembers.get(userId).user;
      return `${user ? user.tag : 'Bilinmeyen Kullanıcı'} - ${points} **Partner** :Soiyll_Butterfly: `;
    });
  }

  // r!topall komutunu işleme
  if (message.content === 'r!topall') {
    const sortedAllTimePoints = Object.entries(allTimePoints).sort(([, a], [, b]) => b - a);

    paginate(sortedAllTimePoints, message, ':Soiyll_Butterfly: En Çok Partner Yapan Kullanıcılar', ([userId, points]) => {
      const user = client.users.cache.get(userId);
      return `${user ? user.tag : 'Bilinmeyen Kullanıcı'} - ${points} Partner :Soiyll_Butterfly: `;
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

  const embed = new EmbedBuilder()
    .setColor(getRandomColor())
    .setTitle(title)
    .setDescription(paginatedData.map((item, index) => `${start + index + 1}. ${formatFunction(item)}`).join('\n'));

  const totalPages = Math.ceil(data.length / pageSize);
  embed.setFooter({ text: `Sayfa ${page} / ${totalPages}` });

  return embed;
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

client.login('YOUR_DISCORD_BOT_TOKEN'); // Discord bot tokeninizi buraya ekleyin
