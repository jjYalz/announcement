// index.js — Full Discord.js bot script with complete PM reply feature
const { 
  Client, GatewayIntentBits, Partials, PermissionsBitField, EmbedBuilder, 
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType,
  StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle,
  InteractionType 
} = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.MessageContent, 
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel]
});

const KEYWORDS_RMT = ['ssrp', 'stateside', 'state side', 'statesiderp', 'roleplay'];
const KEYWORDS_SELL = ['sell', 'jual', 'wts'];
const TARGET_CHANNEL_NAME = 'moderator-only';
const ADMIN_ROLE_NAME = 'Handle Midman';
const MIDMAN_ALERT_CHANNEL = 'moderator-only';

const orderCounter = {};
const userTickets = {};
const finishedOrders = new Set();
const pendingConfirmations = {};
const messageContents = {};

client.once('ready', () => {
  console.log(`🤖 Bot aktif sebagai ${client.user.tag}`);
});

// Handle new listing messages
// Handle new listing messages (jual/beli)
client.on('messageCreate', async (message) => {
  if (message.author.bot || message.channel.name !== TARGET_CHANNEL_NAME) return;

  const content = message.content.toLowerCase();
  const containsRMT = KEYWORDS_RMT.some(k => content.includes(k));
  const containsSell = KEYWORDS_SELL.some(k => content.includes(k));
  const containsBuy = ['beli', 'buy', 'wtb'].some(k => content.includes(k));

  if (containsRMT && (containsSell || containsBuy)) {
    const msgId = message.id.toString();
    const authorId = message.author.id.toString();
    orderCounter[msgId] = 0;
    userTickets[msgId] = new Set();
    messageContents[msgId] = message.content;

    const isSell = containsSell && !containsBuy;
    const isBuy = containsBuy && !containsSell;
    const title = isSell ? '🛒 Jualan' : isBuy ? '🔍 Mencari / Membeli' : '📦 Listing';

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(`${message.content}

Note: **__Gunakan midman agar terhindar dari penipuan__**`)
      .setColor(isBuy ? '#8e44ad' : '#2f3136')
      .setFooter({ text: `Real Trade Money • ${new Date().toLocaleString('id-ID')}` });

    const row1 = new ActionRowBuilder().addComponents(
      ...(isSell ? [
        new ButtonBuilder().setCustomId(`order_${msgId}_${authorId}`).setLabel('Order').setStyle(ButtonStyle.Primary)
      ] : []),
      new ButtonBuilder().setCustomId(`delete_${msgId}_${authorId}`).setLabel('Delete').setStyle(ButtonStyle.Danger)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`privmsg_${msgId}_${authorId}`).setLabel(isSell ? 'Hubungi Penjual' : 'Hubungi Pembeli').setStyle(ButtonStyle.Success),
      ...(isSell ? [
        new ButtonBuilder().setCustomId(`ordercount_${msgId}`).setLabel('0 Orderan Terbuat').setStyle(ButtonStyle.Secondary).setDisabled(true)
      ] : [])
    );

    await message.channel.send({ embeds: [embed], components: [row1, row2] });
    await message.delete();
  } else {
    await message.delete().catch(() => {});
    const warn = await message.channel.send({
      content: `⚠️ <@${message.author.id}>, hanya bisa menjual/membeli sesuatu terkait server State Side Roleplay.`
    });
    setTimeout(() => warn.delete().catch(() => {}), 5000);
  }
});

// Handle interactions (buttons, modals, select menus)
client.on('interactionCreate', async (interaction) => {
  // Modal submits
  if (interaction.type === InteractionType.ModalSubmit) {

    const [action, msgId, buyerId, ownerId] = interaction.customId.split('_');

    // Buyer -> Seller PM
    if (action === 'hubungipesan') {
      const pesan = interaction.fields.getTextInputValue('pesan_input');
      const ownerMember = await interaction.guild.members.fetch(ownerId).catch(() => null);
      if (ownerMember) {
        pendingConfirmations[`${buyerId}_${msgId}`] = {
  listing: messageContents[msgId],
  buyerId,
  ownerId
};
        await ownerMember.send({
  embeds: [
    new EmbedBuilder()
    .setColor('#5865F2')
    .setDescription(`📩 **<@${buyerId}> bertanya tentang jualan kamu**\n\n🛒 **Listing:**\n${messageContents[msgId]}\n\n💬 **Pesan:**\n${pesan}`)
  ],
  components: [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
      .setCustomId(`reply_${msgId}_${buyerId}_${ownerId}`)
      .setLabel('Jawab')
      .setStyle(ButtonStyle.Primary)
    )
  ]
});
        await interaction.reply({ content: '✅ Pesan dikirim ke penjual.', ephemeral: true });
      } else {
        await interaction.reply({ content: '❌ Penjual tidak ditemukan.', ephemeral: true });
      }
      return;
    }

// Seller atau Buyer -> balas pesan
if (action === 'balaspesan') {
  const jawaban = interaction.fields.getTextInputValue('balas_input');
  const senderId = interaction.user.id;
  const targetId = senderId === buyerId ? ownerId : buyerId;
  const targetUser = await client.users.fetch(targetId).catch(() => null);
  const listing = pendingConfirmations[`${buyerId}_${msgId}`]?.listing || pendingConfirmations[`${ownerId}_${msgId}`]?.listing || messageContents[msgId];

  if (!targetUser) {
    return interaction.reply({ content: '❌ Penerima tidak ditemukan.', ephemeral: true });
  }

  await targetUser.send({
  embeds: [
    new EmbedBuilder()
    .setColor('#57F287')
    .setDescription(`📩 **<@${senderId}> membalas pesan kamu**\n\n🛒 **Listing:**\n${listing}\n\n💬 **Balasan:**\n${jawaban}`)
  ],
  components: [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
      .setCustomId(`reply_${msgId}_${senderId}_${targetId}`)
      .setLabel('Jawab')
      .setStyle(ButtonStyle.Primary)
    )
  ]
});

  await interaction.reply({ content: '✅ Balasan dikirim.', ephemeral: true });
  return;
}

  } // ✅ Ini adalah penutup dari: if (interaction.type === InteractionType.ModalSubmit)

  // Buttons & select menus
  if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;

  [action, msgId, id2, id3] = interaction.customId.split('_');
  const userId = interaction.user.id.toString();
  const guild = interaction.guild;

  // Order ticket
  if (action === 'order') {
    if (!userTickets[msgId]) userTickets[msgId] = new Set();
    if (userTickets[msgId].has(userId) && !finishedOrders.has(`${msgId}_${userId}`)) {
      return interaction.reply({ content: '⚠️ Kamu sudah membuat tiket untuk posting ini.', ephemeral: true });
    }
    // reset if finished
    if (finishedOrders.has(`${msgId}_${userId}`)) {
      userTickets[msgId].delete(userId);
      finishedOrders.delete(`${msgId}_${userId}`);
    }
    userTickets[msgId].add(userId);
    orderCounter[msgId]++;

    const buyer = await guild.members.fetch(userId);
    const seller = await guild.members.fetch(id2).catch(() => null);
    const overwrites = [
      { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
      { id: buyer.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
    ];
    if (seller) overwrites.push({ id: seller.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] });
    const adminRole = guild.roles.cache.find(r => r.name === ADMIN_ROLE_NAME);
    if (adminRole) overwrites.push({ id: adminRole.id, allow: [PermissionsBitField.Flags.ViewChannel] });

    const ticketChannel = await guild.channels.create({
      name: `ticket-${buyer.user.username}-${Date.now()%10000}`,
      type: ChannelType.GuildText,
      permissionOverwrites: overwrites
    });

    // Send ticket embed + action select
    await ticketChannel.send({
      embeds: [
        new EmbedBuilder()
        .setTitle('🛒 Tiket telah dibuat')
        .setDescription(`📦 Pesanan:\n${messageContents[msgId]}\n\n📩 ${buyer} silakan jelaskan detail.`)
        .setColor('#3498db')
      ],
      components: [
        new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
          .setCustomId(`select_${msgId}_${userId}_${id2}`)
          .setPlaceholder('Pilih Menu')
          .addOptions([
            { label: '✅ Selesaikan Orderan', value: 'selesai' },
            { label: '🛡️ Request Jasa Midman', value: 'midman' }
          ])
        )
      ]
    });

    // DM seller
    if (seller) {
      await seller.send({
        content: `Orderan baru dari ${buyer} pada Jualan:\n\n${messageContents[msgId]}\n\nNote: Tekan tombol dibawah untuk ke-channel orderan!`,
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
            .setLabel('Goto Channel')
            .setURL(`https://discord.com/channels/${guild.id}/${ticketChannel.id}`)
            .setStyle(ButtonStyle.Link)
          )
        ]
      });
    }

    // Update order count button
    const msg = interaction.message;
    const updatedRows = msg.components.map(row =>
      ActionRowBuilder.from(row).setComponents(
        row.components.map(btn => {
          if (btn.customId === `ordercount_${msgId}`) {
            return ButtonBuilder.from(btn).setLabel(`${orderCounter[msgId]} Orderan Terbuat`);
          }
          return btn;
        })
      )
    );
    await msg.edit({ components: updatedRows });

    return interaction.reply({ content: '✅ Tiket kamu sudah dibuat!', ephemeral: true });
  }

  // Handle select menu actions
  if (action === 'select') {
    const choice = interaction.values[0];
    const [, smMsgId, buyerId, sellerId] = interaction.customId.split('_');
    if (choice === 'selesai') {
      if (interaction.user.id.toString() !== buyerId) {
        return interaction.reply({ content: '❌ Hanya buyer yang bisa selesaikan.', ephemeral: true });
      }
      const confirmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`confirm_${smMsgId}_${buyerId}_${sellerId}`).setLabel('✅ Saya Setuju (Penjual)').setStyle(ButtonStyle.Success)
      );
      return interaction.reply({ content: '🕓 Menunggu persetujuan penjual...', components: [confirmRow] });
    }
    if (choice === 'midman') {
      const midCh = guild.channels.cache.find(c => c.name === MIDMAN_ALERT_CHANNEL);
      if (midCh) {
        await midCh.send(`🚨 Ada yang butuh midman di <#${interaction.channel.id}> @everyone`);
        return interaction.reply({ content: '✅ Midman diminta!', ephemeral: true });
      }
      return interaction.reply({ content: '❌ Channel midman tidak ada.', ephemeral: true });
    }
  }

  // Seller confirms finish
  if (action === 'confirm') {
  const [, cnMsgId, buyerId, sellerId] = interaction.customId.split('_');
  if (interaction.user.id.toString() !== sellerId) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
        .setDescription('❌ Hanya penjual yang bisa setuju.')
        .setColor('#e74c3c')
      ],
      ephemeral: true
    });
  }

  const ch = interaction.channel;
  const messages = await ch.messages.fetch({ limit: 100 });
  const sorted = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

  let html = `
<html>
  <head>
    <meta charset="UTF-8">
    <title>Transkrip ${ch.name}</title>
    <style>
      body {
        background-color: #2f3136;
        color: #dcddde;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        padding: 20px;
      }
      .message {
        margin-bottom: 15px;
        padding: 10px 15px;
        background-color: #36393f;
        border-radius: 8px;
        max-width: 800px;
      }
      .username {
        font-weight: bold;
        color: #7289da;
      }
      .timestamp {
        font-size: 0.8em;
        color: #b9bbbe;
        margin-left: 5px;
      }
      .content {
        margin-top: 5px;
        white-space: pre-wrap;
      }
    </style>
  </head>
  <body>
    <h2>📜 Transkrip Channel: ${ch.name}</h2>
    <hr />
`;

sorted.forEach(msg => {
  const time = new Date(msg.createdTimestamp).toLocaleString('id-ID');
  const username = msg.author.tag;
  const content = msg.content || '[embed/attachment]';
  html += `
    <div class="message">
      <span class="username">${username}</span>
      <span class="timestamp">${time}</span>
      <div class="content">${content}</div>
    </div>
  `;
});

html += `
  </body>
</html>`;

  const { AttachmentBuilder } = require('discord.js');
  const transcript = new AttachmentBuilder(Buffer.from(html), { name: `transkrip-${ch.id}.html` });

  const logCh = interaction.guild.channels.cache.find(c => c.name === 'server-log');
  if (logCh) {
    await logCh.send({ content: `📄 Transkrip orderan ${ch.name}:`, files: [transcript] });
  }

  const buyerUser = await client.users.fetch(buyerId).catch(() => null);
  if (buyerUser) {
    await buyerUser.send({ content: `📄 Ini transkrip pesanan kamu:`, files: [transcript] }).catch(() => {});
  }

  await ch.send({
    embeds: [
      new EmbedBuilder()
      .setDescription('✅ Order telah diselesaikan oleh kedua pihak.')
      .setColor('#2ecc71')
    ]
  });

  finishedOrders.add(`${cnMsgId}_${buyerId}`);
  setTimeout(() => ch.delete().catch(() => {}), 3000);

  return interaction.reply({
    embeds: [
      new EmbedBuilder()
      .setDescription('👍 Channel akan dihapus dan transkrip telah dikirim.')
      .setColor('#2ecc71')
    ],
    ephemeral: true
  });
}

  // Hubungi penjual -> show modal
  if (action === 'privmsg') {
    const [, pmMsgId, ownerId] = interaction.customId.split('_');
    const buyerId = interaction.user.id.toString();
    const ownerMember = await interaction.guild.members.fetch(ownerId).catch(() => null);
    if (!ownerMember) {
      return interaction.reply({ content: '❌ Penjual tidak ditemukan.', ephemeral: true });
    }
    const modal = new ModalBuilder()
      .setCustomId(`hubungipesan_${pmMsgId}_${buyerId}_${ownerId}`)
      .setTitle('Pesan ke Penjual')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
          .setCustomId('pesan_input')
          .setLabel('Tuliskan pesan kamu')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
        )
      );
    return interaction.showModal(modal);
  }

  // Reply button in DM
  if (action === 'reply') {
    const [, msgId, fromId, toId] = interaction.customId.split('_');
    const key1 = `${fromId}_${msgId}`;
    const key2 = `${toId}_${msgId}`;
    const data = pendingConfirmations[key1] || pendingConfirmations[key2];

    if (!data) {
      return interaction.reply({ content: '❌ Data pesan tidak ditemukan.', ephemeral: true });
    }

    const replyTargetId = interaction.user.id === data.buyerId ? data.ownerId : data.buyerId;
    const replyTarget = await client.users.fetch(replyTargetId).catch(() => null);
    if (!replyTarget) {
      return interaction.reply({ content: '❌ Penerima tidak ditemukan.', ephemeral: true });
    }

    const modal = new ModalBuilder()
      .setCustomId(`balaspesan_${msgId}_${interaction.user.id}_${replyTargetId}`)
      .setTitle('Balas Pesan')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
          .setCustomId('balas_input')
          .setLabel('Balasan kamu')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
        )
      );
    return interaction.showModal(modal);
  }

  // Delete listing
  if (action === 'delete') {
    const [, dlMsgId, dlAuthorId] = interaction.customId.split('_');
    if (
      interaction.user.id.toString() === dlAuthorId ||
      interaction.member.roles.cache.some(r => r.name === ADMIN_ROLE_NAME)
    ) {
      await interaction.message.delete().catch(() => {});
    } else {
      return interaction.reply({ content: '❌ Tidak punya izin hapus.', ephemeral: true });
    }
  }
  }); // ✅ END OF interactionCreate

client.login(process.env.TOKEN);
