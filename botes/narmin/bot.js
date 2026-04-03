const { Telegraf, session, Markup } = require("telegraf");
require("dotenv").config();
const axios = require("axios");
const config_data = require("./config.json");
const contect_data = require("./content.json");
const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const token = process.env.TOKEN;
const bot = new Telegraf(token);
let photo_id = "";
let video_id = "";
const imagesDir = path.join(__dirname, "images");
const videosDir = path.join(__dirname, "videos");
const sqlitePath = config_data.sqlite_path
  ? path.resolve(__dirname, config_data.sqlite_path)
  : path.join(__dirname, "narmin.sqlite");
const dbPromise = open({
  filename: sqlitePath,
  driver: sqlite3.Database,
});
const initDb = async () => {
  const db = await dbPromise;
  const schemaPath = path.join(__dirname, "sqlite_schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf8");
  await db.exec(schemaSql);
};

bot.use(session());
bot.on("pre_checkout_query", (ctx) => {
  ctx.answerPreCheckoutQuery(true);
});
bot.on("successful_payment", async (ctx) => {
  try {
    const user_data = await get_user_data(ctx.from.id);
    const new_user_data = await {
      ...user_data,
      user_balance:
        Number(user_data.user_balance) +
        Number(ctx.message.successful_payment.total_amount),
    };
    await put_user_data(ctx.from.id, new_user_data);
    await ctx.reply(
      `✅ Pulqabına Ulduz Əlavə Edilməsi Uğurlu Oldu!\n\n🌟 Əlavə Olunan Ulduz Miqdarı: ${ctx.message.successful_payment.total_amount}\n\n✅ Artıq Məzmunu Əldə Edə Bilərsən!`,
    );
    let main_menu_buttons = Markup.inlineKeyboard([
      [
        Markup.button.url(
          "🔗  Dəvət Et Pulsuz Al  🔗",
          `https://t.me/share/url?url=${encodeURIComponent(`https://t.me/${config_data.bot_username}?start=${ctx.from.id}`)}`,
        ),
      ],
      [Markup.button.callback(`👑  VIP KANAL  👑`, "wip_channel")],
      [Markup.button.url("💋  Özəl Söhbət  💋", "https://t.me/narmin_alyvaa")],
      [
        Markup.button.callback("🍑  Paketlər  🍑", "content"),
        Markup.button.callback("🥵  Video Zəng 🥵", "show"),
      ],
      [Markup.button.callback("💸  Pulqabı  💸", "wallet")],
      [Markup.button.callback("🌐  Dil  🌐", "language")],

    ]);
    await ctx.replyWithPhoto(config_data.profile_photo_id, {
      caption: `✋🏻 Salam Balam Xoş Gəldin!\n\n🔥 Tam Açıq Məzmunlar\n\n🥵 Video Zəng, Özəl Çəkilişlər\n\n✅ Pulsuz Giriş Fürsəti\n\n🔗 Dəvət Etdiyin Hər Nəfər Üçün ${config_data.star_per_invite} 🌟 Qazan!`,
      parse_mode: "Markdown",
      ...main_menu_buttons,
    });
    await bot.telegram.sendMessage(
      config_data.owner_id,
      `🌟 [İstifadəçi](tg://user?id=${ctx.from.id}): ${ctx.message.successful_payment.total_amount} Ulduz Satın Aldı \n\n#starbuyed`,
      { parse_mode: "Markdown" },
    );
  } catch (error) {
    bot.telegram.sendMessage(
      config_data.owner_id,
      `❌ Ulduz Əlavə Edilmədi\n\n${error}\n\n#error`,
    );
    console.log(error);
  }
});
const get_user_data = async (user_id) => {
  try {
    const db = await dbPromise;
    const row = await db.get("SELECT data FROM users WHERE user_id = ?", [
      user_id,
    ]);
    if (!row) return null;
    return JSON.parse(row.data);
  } catch (error) {
    console.log(error);
    bot.telegram.sendMessage(
      config_data.owner_id,
      `❌ İstifadəçi Məlumatları Alınamadı\n\n${error}\n\n#error`,
    );
  }
};
const put_user_data = async (user_id, data) => {
  try {
    const db = await dbPromise;
    const payload = JSON.stringify(data);
    const now = Date.now();
    const inviteFrom =
      data && data.invite_from !== undefined && data.invite_from !== null
        ? String(data.invite_from)
        : null;
    const userBalance =
      data && data.user_balance !== undefined && data.user_balance !== null
        ? Number(data.user_balance) || 0
        : 0;
    const userInvites = JSON.stringify(
      data && Array.isArray(data.user_invites) ? data.user_invites : [],
    );
    const isVip = data && data.is_vip ? 1 : 0;
    const expiresAt =
      data && data.expires_at !== undefined && data.expires_at !== null
        ? data.expires_at === false
          ? null
          : Number(data.expires_at) || null
        : null;
    const joinedAt =
      data && data.joined_at !== undefined && data.joined_at !== null
        ? Number(data.joined_at) || null
        : null;
    const inChannel = data && data.in_channel ? 1 : 0;
    await db.run(
      `INSERT INTO users (
         user_id,
         invite_from,
         user_balance,
         user_invites,
         is_vip,
         expires_at,
         joined_at,
         in_channel,
         data,
         updated_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         invite_from = excluded.invite_from,
         user_balance = excluded.user_balance,
         user_invites = excluded.user_invites,
         is_vip = excluded.is_vip,
         expires_at = excluded.expires_at,
         joined_at = excluded.joined_at,
         in_channel = excluded.in_channel,
         data = excluded.data,
         updated_at = excluded.updated_at`,
      [
        user_id,
        inviteFrom,
        userBalance,
        userInvites,
        isVip,
        expiresAt,
        joinedAt,
        inChannel,
        payload,
        now,
      ],
    );
  } catch (error) {
    console.log(error);
    bot.telegram.sendMessage(
      config_data.owner_id,
      `❌ İstifadəçi Məlumatları Yazılmadı\n\n${error}\n\n#error`,
    );
  }
};
const get_all_data = async () => {
  try {
    const db = await dbPromise;
    const rows = await db.all("SELECT user_id, data FROM users");
    const all_data = {};
    for (const row of rows) {
      try {
        all_data[row.user_id] = JSON.parse(row.data);
      } catch (e) {
        all_data[row.user_id] = {};
      }
    }
    return all_data;
  } catch (error) {
    console.log(error);
    bot.telegram.sendMessage(
      config_data.owner_id,
      `❌ Bütün İstifadəçi Məlumatları Alınamadı\n\n${error}\n\n#error`,
    );
    return {};
  }
};
const send_invoice_for_pocket = async (ctx, amount) => {
  try {
    let invoice = {
      title: `Pulqabına Ulduz əlavə et`,
      description: `Zəhmət olmasa Məzmuna Giriş Üçün Pulqabına ${amount} Ulduz Əlavə Et`,
      payload: "invoice_payload",
      start_parameter: "start",
      currency: "XTR",
      prices: [{ label: "Item", amount: amount }],
    };
    await ctx.replyWithInvoice(invoice);
  } catch (error) {
    console.log(error);
    bot.telegram.sendMessage(
      config_data.owner_id,
      `❌ Fatura Gönderilemedi\n\n${error}\n\n#error`,
    );
  }
};
const send_invoice_for_increase = async (ctx, amount) => {
  try {
    let invoice = {
      title: `Pulqabına Ulduz əlavə et`,
      description: `Zəhmət olmasa Pulqabına ${amount} Ulduz Əlavə Etmək Üçün Ödəniş Et`,
      payload: "invoice_payload",
      start_parameter: "start",
      currency: "XTR",
      prices: [{ label: "Item", amount: amount }],
    };
    await ctx.replyWithInvoice(invoice);
  } catch (error) {
    console.log(error);
    bot.telegram.sendMessage(
      config_data.owner_id,
      `❌ Fatura Gönderilemedi\n\n${error}\n\n#error`,
    );
  }
};
bot.start(async (ctx) => {
  let user_id = ctx.message.from.id;
  let invite_from_id = ctx.message.text.split(" ")[1];
  try {
    if ((await get_user_data(user_id)) == null) {
      await put_user_data(user_id, {
        user_id: user_id,
        invite_from:
          invite_from_id == undefined ? config_data.owner_id : invite_from_id,
        user_balance:
          invite_from_id == undefined
            ? config_data.star_per_invite
            : 2 * config_data.star_per_invite,
        user_invites: [config_data.owner_id],
      });
      await bot.telegram.sendMessage(
        config_data.owner_id,
        `✅ Yeni İstifadəçi Qoşuldu!\n\n➕ Yeni İstifadəçi: [İstifadəçini Gör](tg://user?id=${user_id})\n\n🔗 İstifadəçini Dəvət Etdi: [${invite_from_id == config_data.owner_id ? "Bot Sahibi" : invite_from_id == undefined ? "Sahib" : "İstifadəçini Gör"}](tg://user?id=${invite_from_id == undefined ? config_data.owner_id : invite_from_id})\n\n#newuserjoined`,
        { parse_mode: "Markdown" },
      );
      if (invite_from_id != undefined) {
        let user_data = await get_user_data(invite_from_id);
        if (user_data == null) {
        } else {
          let new_data = await {
            ...user_data,
            user_balance: user_data.user_balance + config_data.star_per_invite,
            user_invites: [...user_data.user_invites, user_id],
          };
          await put_user_data(invite_from_id, new_data);
          await bot.telegram.sendMessage(
            invite_from_id,
            `✅ Təbriklər!\n\n🔗 Dəvət Etdiyin [İstifadəçini Gör](tg://user?id=${ctx.from.id}) İstifadəçisi Botumuza Qoşuldu!\n\n🌟 ${config_data.star_per_invite} Ulduz Qazandın!\n\n💸 İndiki Balans: ${new_data.user_balance} 🌟`,
            { parse_mode: "Markdown" },
          );
        }
      }
    } else {
    }
    let main_menu_buttons = Markup.inlineKeyboard([
      [
        Markup.button.url(
          "🔗  Dəvət Et Pulsuz Al  🔗",
          `https://t.me/share/url?url=${encodeURIComponent(`https://t.me/${config_data.bot_username}?start=${user_id}`)}`,
        ),
      ],
      [Markup.button.callback(`👑  VIP KANAL  👑`, "wip_channel")],
      [Markup.button.url("💋  Özəl Söhbət  💋", "https://t.me/narmin_alyvaa")],
      [
        Markup.button.callback("🍑  Paketlər  🍑", "content"),
        Markup.button.callback("🥵  Video Zəng 🥵", "show"),
      ],
      [Markup.button.callback("💸  Pulqabı  💸", "wallet")],
      [Markup.button.callback("🌐  Dil  🌐", "language")],
    ]);
    await ctx.replyWithPhoto(config_data.profile_photo_id, {
      caption: `✋🏻 Salam Balam Xoş Gəldin!\n\n👑 VIP Kanal Hər Gün Yeni Özəl Videolar\n\n🔥 Tam Açıq Məzmunlar\n\n🥵 Video Zəng, Özəl Çəkilişlər\n\n✅ Pulsuz Giriş Fürsəti\n\n🔗 Dəvət Etdiyin Hər Nəfər Üçün ${config_data.star_per_invite} 🌟 Qazan!`,
      parse_mode: "Markdown",
      ...main_menu_buttons,
    });
  } catch (error) {
    console.log(error);
    bot.telegram.sendMessage(
      config_data.owner_id,
      `❌ Başlatma Xətası\n\n${error}\n\n#error`,
    );
  }
});
bot.on("chat_join_request", async (ctx) => {
  try {
    if (ctx.chatJoinRequest.chat.id == config_data.channel_id) {
      const userId = ctx.chatJoinRequest.from.id;
      let main_menu_buttons = Markup.inlineKeyboard([
        [
          Markup.button.url(
            "🔐  Yönləndir (1/5)  🔐",
            `https://t.me/share/url?url=${encodeURIComponent(`${config_data.channel_url}`)}`,
          ),
        ],
        [
          Markup.button.url(
            "✅  Etdim  ✅",
            `https://t.me/${config_data.bot_username}?start=start`,
          ),
        ],
      ]);
      await bot.telegram.sendPhoto(userId, config_data.profile_photo_id, {
        caption: `👋🏻 Salam Balam Xoş Gəldin\n\n🔞 Özəl Tam Açıq Videolarım, Şəkillərim, Arxivlərim, Video Zəng Yayımlarım Hamısı Premium Kanalımdadır!\n\n👇🏻 Məzmunlarımı Aşağıdakı Kanalda Görə Bilərsən!\n\n🔗 Kanal: [${config_data.channel_url}]\n\n⚠️ Diqqət Kanala Qoşulma İstəyinin Təsdiqlənməsi Üçün 5 Dəqiqə Ərzində Yönləndir Düyməsinə Toxunaraq 5 Dəfə Yönləndir!`,
        parse_mode: "Markdown",
        ...main_menu_buttons,
      });

      await bot.telegram.sendMessage(
        config_data.owner_id,
        `📢 Kanala Qoşulma İstəyi Üçün Mesaj Göndərildi\n\n#joinchannelmessage`,
      );
    }
  } catch (error) {
    bot.telegram.sendMessage(
      config_data.owner_id,
      `❌Mesaj Göndərilmədi\n\n${error}\n\n#error`,
    );
  }
});
bot.action("content", async (ctx) => {
  try {
    const content_menu_buttons = Markup.inlineKeyboard([
      [
        Markup.button.url(
          "🔗  Dəvət Et Pulsuz Al  🔗",
          `https://t.me/share/url?url=${encodeURIComponent(`https://t.me/${config_data.bot_username}?start=${ctx.from.id}`)}`,
        ),
      ],
      [Markup.button.callback(`👑  VIP KANAL  👑`, "wip_channel")],
      [
        Markup.button.callback(
          `🍑  Paket 1 - ${contect_data.pocket_1.price}  🍑`,
          "pocket_1",
        ),
        Markup.button.callback(
          `🍑  Paket 2 - ${contect_data.pocket_2.price}  🍑`,
          "pocket_2",
        ),
      ],
      [
        Markup.button.callback(
          `🍑  Paket 3 - ${contect_data.pocket_3.price}  🍑`,
          "pocket_3",
        ),
        Markup.button.callback(
          `🍑  Paket 4 - ${contect_data.pocket_4.price}  🍑`,
          "pocket_4",
        ),
      ],
      [Markup.button.callback("💸  Pulqabı  💸", "wallet")],
      [Markup.button.callback("🏠  Ana Səhifə  🏠", "home")],
    ]);
    await ctx.editMessageMedia(
      {
        type: "photo",
        media: config_data.profile_photo_id,
        caption: `👑 VIP Kanal Hər Gün Yeni Özəl Videolar\n\n🍑 Paket 1: ${contect_data.pocket_1.photo.length} Şəkil - Qiymət ${contect_data.pocket_1.price}🌟\n\n🍑 Paket 2: ${contect_data.pocket_2.video.length} video - Qiymət ${contect_data.pocket_2.price}🌟\n\n🍑 Paket 3: ${contect_data.pocket_3.photo.length} Şəkil, ${contect_data.pocket_3.video.length} Video - Qiymət ${contect_data.pocket_3.price}🌟\n\n🍑 Paket 4: ${contect_data.pocket_4.photo.length} Şəkil, ${contect_data.pocket_4.video.length} Video - Qiymət ${contect_data.pocket_4.price}🌟`,
      },
      content_menu_buttons,
    );
    ctx.answerCbQuery();
  } catch (error) {
    console.log(error);
    bot.telegram.sendMessage(
      config_data.owner_id,
      `❌ Paketlər Menü Gönderəmedi\n\n${error}\n\n#error`,
    );
  }
});
bot.action("show", async (ctx) => {
  try {
    const show_menu_buttons = Markup.inlineKeyboard([
      [
        Markup.button.url(
          "🔗  Dəvət Et Pulsuz Al  🔗",
          `https://t.me/share/url?url=${encodeURIComponent(`https://t.me/${config_data.bot_username}?start=${ctx.from.id}`)}`,
        ),
      ],
      [Markup.button.callback(`👑  VIP KANAL  👑`, "wip_channel")],
      [
        Markup.button.callback(
          `🥵  Paket 1 - ${contect_data.s_pocket_1.price}  🥵`,
          "show_1",
        ),
        Markup.button.callback(
          `🥵  Paket 2 - ${contect_data.s_pocket_2.price}  🥵`,
          "show_2",
        ),
      ],
      [
        Markup.button.callback(
          `🥵  Paket 3 - ${contect_data.s_pocket_3.price}  🥵`,
          "show_3",
        ),
        Markup.button.callback(
          `🥵  Paket 4 - ${contect_data.s_pocket_4.price}  🥵`,
          "show_4",
        ),
      ],
      [Markup.button.callback("🏠  Ana Səhifə  🏠", "home")],
    ]);
    await ctx.editMessageMedia(
      {
        type: "photo",
        media: config_data.profile_photo_id,
        caption: `👑 VIP Kanal Hər Gün Yeni Özəl Videolar\n\n🥵 Paket 1: 5 Dəqiqə Video Zəng - Qiymət ${contect_data.s_pocket_1.price}🌟\n\n🥵 Paket 2: 10 Dəqiqə Video Zəng - Qiymət ${contect_data.s_pocket_2.price}🌟\n\n🥵 Paket 3: 20 Dəqiqə Video Zəng - Qiymət ${contect_data.s_pocket_3.price}🌟\n\n🥵 Paket 4: 30 Dəqiqə Video Zəng - Qiymət ${contect_data.s_pocket_4.price}🌟`,
      },
      show_menu_buttons,
    );
    ctx.answerCbQuery();
  } catch (error) {
    console.log(error);
    bot.telegram.sendMessage(
      config_data.owner_id,
      `❌ Video Zəng Paketləri Menü Gönderəmedi\n\n${error}\n\n#error`,
    );
  }
});
bot.action("home", async (ctx) => {
  try {
    const home_menu_buttons = Markup.inlineKeyboard([
      [
        Markup.button.url(
          "🔗  Dəvət Et Pulsuz Al  🔗",
          `https://t.me/share/url?url=${encodeURIComponent(`https://t.me/${config_data.bot_username}?start=${ctx.from.id}`)}`,
        ),
      ],
      [Markup.button.callback(`👑  VIP KANAL  👑`, "wip_channel")],
      [Markup.button.url("💋  Özəl Söhbət  💋", "https://t.me/narmin_alyvaa")],
      [
        Markup.button.callback("🍑  Paketlər  🍑", "content"),
        Markup.button.callback("🥵  Video Zəng 🥵", "show"),
      ],
      [Markup.button.callback("💸  Pulqabı  💸", "wallet")],
      [Markup.button.callback("🌐  Dil  🌐", "language")],

    ]);
    await ctx.editMessageMedia(
      {
        type: "photo",
        media: config_data.profile_photo_id,
        caption: `✋🏻 Salam Balam Xoş Gəldin!\n\n👑 VIP Kanal Hər Gün Yeni Özəl Videolar\n\n🔥 Tam Açıq Məzmunlar\n\n🥵 Video Zəng, Özəl Çəkilişlər\n\n✅ Pulsuz Giriş Fürsəti\n\n🔗 Dəvət Etdiyin Hər Nəfər Üçün ${config_data.star_per_invite} 🌟 Qazan!`,
      },
      home_menu_buttons,
    );
    ctx.answerCbQuery();
  } catch (error) {
    console.log(error);
    bot.telegram.sendMessage(
      config_data.owner_id,
      `❌ Ana Menü Gönderəmedi\n\n${error}\n\n#error`,
    );
  }
});
bot.action("wallet", async (ctx) => {
  try {
    const user_data = await get_user_data(ctx.from.id);
    const wallet_menu_buttons = Markup.inlineKeyboard([
      [
        Markup.button.url(
          "🔗  Dəvət Et Pulsuz Al  🔗",
          `https://t.me/share/url?url=${encodeURIComponent(`https://t.me/${config_data.bot_username}?start=${ctx.from.id}`)}`,
        ),
      ],
      [Markup.button.callback(`👑  VIP KANAL  👑`, "wip_channel")],
      [
        Markup.button.callback("🌟  1 Ulduz  🌟", "buy_1"),
        Markup.button.callback("🌟  100 Ulduz  🌟", "buy_100"),
      ],
      [
        Markup.button.callback("🌟  250 Ulduz  🌟", "buy_250"),
        Markup.button.callback("🌟  500 Ulduz  🌟", "buy_500"),
      ],
      [
        Markup.button.callback("🌟  1000 Ulduz  🌟", "buy_1000"),
        Markup.button.callback("🌟  2500 Ulduz  🌟", "buy_2500"),
      ],
      [Markup.button.callback("🏠  Ana Səhifə  🏠", "home")],
    ]);
    await ctx.editMessageMedia(
      {
        type: "photo",
        media: config_data.profile_photo_id,
        caption: `💸 Hesab Balansı: ${user_data.user_balance} 🌟\n\n➕ Dəvət Edilən Şəxs Sayı: ${user_data.user_invites.length} Nəfər\n\n🔗 Dəvət Etdiyin Hər Nəfər Üçün ${config_data.star_per_invite} 🌟 Qazan!\n\n🌟 İstədiyin Ulduz Miqdarına Toxunaraq Ulduz Satın Al`,
      },
      wallet_menu_buttons,
    );
    ctx.answerCbQuery();
  } catch (error) {
    console.log(error);
    bot.telegram.sendMessage(
      config_data.owner_id,
      `❌ Pulqabı Menü Gönderəmedi\n\n${error}\n\n#error`,
    );
  }
});
bot.action("wip_channel", async (ctx) => {
  try {
    const content_wip_menu_buttons = Markup.inlineKeyboard([
      [
        Markup.button.callback(
          `👑  Həmişəlik - ${contect_data.wip_channel_price_lifetime}  👑`,
          `buy_wip_channel_lifetime`,
        ),
      ],
      [
        Markup.button.callback(
          `👑  Həftəlik - ${contect_data.wip_channel_price_weekly}  👑`,
          `buy_wip_channel_weekly`,
        ),
        Markup.button.callback(
          `👑  15 Günlük - ${contect_data.wip_channel_price_15days}  👑`,
          `buy_wip_channel_15days`,
        ),
      ],
      [
        Markup.button.callback(
          `👑  Aylıq - ${contect_data.wip_channel_price_monthly}  👑`,
          `buy_wip_channel_monthly`,
        ),
        Markup.button.callback(
          `👑  3 Aylıq - ${contect_data.wip_channel_price_3monthly}  👑`,
          `buy_wip_channel_3monthly`,
        ),
      ],
      [Markup.button.callback("💸  Pulqabı  💸", "wallet")],
      [Markup.button.callback("🏠  Ana Səhifə  🏠", "home")],
    ]);
    await ctx.editMessageMedia(
      {
        type: "photo",
        media: config_data.profile_photo_id,
        caption: `👑 Həmişəlik - ${contect_data.wip_channel_price_lifetime} 🌟\n\n👑 Həftəlik - ${contect_data.wip_channel_price_weekly} 🌟\n\n👑 15 Günlük - ${contect_data.wip_channel_price_15days} 🌟\n\n👑 Aylıq - ${contect_data.wip_channel_price_monthly} 🌟\n\n👑 3 Aylıq - ${contect_data.wip_channel_price_3monthly} 🌟`,
      },
      content_wip_menu_buttons,
    );
    ctx.answerCbQuery();
  } catch (error) {
    console.log(error);
    bot.telegram.sendMessage(
      config_data.owner_id,
      `❌ VIP Kanal Menü Gönderəmedi\n\n${error}\n\n#error`,
    );
  }
});
bot.action(/buy_wip_channel_(.+)/, async (ctx) => {
  try {
    const type = ctx.match[1];
    const user_data = await get_user_data(ctx.from.id);

    switch (type) {
      case "lifetime":
        if (user_data.user_balance < contect_data.wip_channel_price_lifetime) {
          await ctx.answerCbQuery(
            "❌ Balans Çatışmır!\n\n🔗 Zəhmət olmasa Üzv Dəvət Edərək Ulduz Qazan!\n\n💸 Və Ya Pulqabına Ulduz Əlavə Et!",
            { show_alert: true },
          );
          await send_invoice_for_pocket(
            ctx,
            contect_data.wip_channel_price_lifetime - user_data.user_balance,
          );
        } else {
          const geted_user_data = await get_user_data(ctx.from.id);
          let new_data = await {
            ...geted_user_data,
            user_balance:
              geted_user_data.user_balance -
              contect_data.wip_channel_price_lifetime,
            is_vip: true,
            expires_at: false,
            joined_at: Date.now(),
            in_channel: true,
          };
          await put_user_data(ctx.from.id, new_data);
          await bot.telegram.sendMessage(
            config_data.owner_id,
            `✅ [İstifadəçini Gör](tg://user?id=${ctx.from.id}) VIP KANAL Satın Aldı\n\n#vipchannelbuyedlifetime`,
            { parse_mode: "Markdown" },
          );
          await ctx.answerCbQuery("✅ Təbriklər VIP KANAL Uğurla Alındı!");
          const inviteLink = await ctx.telegram.createChatInviteLink(
            "-1003580607918",
            {
              member_limit: 1,
              expire_date: Math.floor(Date.now() / 1000) + 600,
            },
          );
          await ctx.reply(
            `🎉 Ödəniş Uğurlu!\n\n⚠️ Diqqət Dəvət Linkini Paylaşma!\n\n👑 Dəvət Linki yalnız 1 Nəfər Üçün Keçərlidir!\n\n🔗 ${inviteLink.invite_link}`,
          );
          setTimeout(async () => {
            try {
              let main_menu_buttons = Markup.inlineKeyboard([
                [
                  Markup.button.url(
                    "🔗  Dəvət Et Pulsuz Al  🔗",
                    `https://t.me/share/url?url=${encodeURIComponent(`https://t.me/${config_data.bot_username}?start=${ctx.from.id}`)}`,
                  ),
                ],
                [Markup.button.callback(`👑  VIP KANAL  👑`, "wip_channel")],
                [
                  Markup.button.url(
                    "💋  Özəl Söhbət  💋",
                    "https://t.me/narmin_alyvaa",
                  ),
                ],
                [
                  Markup.button.callback("🍑  Paketlər  🍑", "content"),
                  Markup.button.callback("🥵  Video Zəng 🥵", "show"),
                ],
                [Markup.button.callback("💸  Pulqabı  💸", "wallet")],
                [Markup.button.callback("🌐  Dil  🌐", "language")],

              ]);
              await ctx.replyWithPhoto(config_data.profile_photo_id, {
                caption: `✋🏻 Salam Balam Xoş Gəldin!\n\n👑 VIP Kanal Hər Gün Yeni Özəl Videolar\n\n🔥 Tam Açıq Məzmunlar\n\n🥵 Video Zəng, Özəl Çəkilişlər\n\n✅ Pulsuz Giriş Fürsəti\n\n🔗 Dəvət Etdiyin Hər Nəfər Üçün ${config_data.star_per_invite} 🌟 Qazan!`,
                parse_mode: "Markdown",
                ...main_menu_buttons,
              });
            } catch (error) {
              console.log(error);
              bot.telegram.sendMessage(
                config_data.owner_id,
                `❌ VIP Kanal Satın Alma Sonrası Mesaj Gönderilemedi\n\n${error}\n\n#error`,
              );
            }
          }, 5000);
        }
        break;
      case "weekly":
        if (user_data.user_balance < contect_data.wip_channel_price_weekly) {
          await ctx.answerCbQuery(
            "❌ Balans Çatışmır!\n\n🔗 Zəhmət olmasa Üzv Dəvət Edərək Ulduz Qazan!\n\n💸 Və Ya Pulqabına Ulduz Əlavə Et!",
            { show_alert: true },
          );
          await send_invoice_for_pocket(
            ctx,
            contect_data.wip_channel_price_weekly - user_data.user_balance,
          );
        } else {
          const geted_user_data = await get_user_data(ctx.from.id);
          let new_data = await {
            ...geted_user_data,
            user_balance:
              geted_user_data.user_balance -
              contect_data.wip_channel_price_weekly,
            is_vip: false,
            expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000,
            joined_at: Date.now(),
            in_channel: true,
          };
          await put_user_data(ctx.from.id, new_data);
          await bot.telegram.sendMessage(
            config_data.owner_id,
            `✅ [İstifadəçini Gör](tg://user?id=${ctx.from.id}) VIP KANAL Satın Aldı\n\n#vipchannelbuyedweekly`,
            { parse_mode: "Markdown" },
          );
          await ctx.answerCbQuery("✅ Təbriklər VIP KANAL Uğurla Alındı!");
          const inviteLink = await ctx.telegram.createChatInviteLink(
            "-1003580607918",
            {
              member_limit: 1,
              expire_date: Math.floor(Date.now() / 1000) + 600,
            },
          );
          await ctx.reply(
            `🎉 Ödəniş Uğurlu!\n\n⚠️ Diqqət Dəvət Linkini Paylaşma!\n\n👑 Dəvət Linki yalnız 1 Nəfər Üçün Keçərlidir!\n\n🔗 ${inviteLink.invite_link}`,
          );
          setTimeout(async () => {
            try {
              let main_menu_buttons = Markup.inlineKeyboard([
                [
                  Markup.button.url(
                    "🔗  Dəvət Et Pulsuz Al  🔗",
                    `https://t.me/share/url?url=${encodeURIComponent(`https://t.me/${config_data.bot_username}?start=${ctx.from.id}`)}`,
                  ),
                ],
                [Markup.button.callback(`👑  VIP KANAL  👑`, "wip_channel")],
                [
                  Markup.button.url(
                    "💋  Özəl Söhbət  💋",
                    "https://t.me/narmin_alyvaa",
                  ),
                ],
                [
                  Markup.button.callback("🍑  Paketlər  🍑", "content"),
                  Markup.button.callback("🥵  Video Zəng 🥵", "show"),
                ],
                [Markup.button.callback("💸  Pulqabı  💸", "wallet")],
      [Markup.button.callback("🌐  Dil  🌐", "language")],

              ]);
              await ctx.replyWithPhoto(config_data.profile_photo_id, {
                caption: `✋🏻 Salam Balam Xoş Gəldin!\n\n👑 VIP Kanal Hər Gün Yeni Özəl Videolar\n\n🔥 Tam Açıq Məzmunlar\n\n🥵 Video Zəng, Özəl Çəkilişlər\n\n✅ Pulsuz Giriş Fürsəti\n\n🔗 Dəvət Etdiyin Hər Nəfər Üçün ${config_data.star_per_invite} 🌟 Qazan!`,
                parse_mode: "Markdown",
                ...main_menu_buttons,
              });
            } catch (error) {
              console.log(error);
              bot.telegram.sendMessage(
                config_data.owner_id,
                `❌ VIP Kanal Satın Alma Sonrası Mesaj Gönderilemedi\n\n${error}\n\n#error`,
              );
            }
          }, 5000);
        }
        break;
      case "15days":
        if (user_data.user_balance < contect_data.wip_channel_price_15days) {
          await ctx.answerCbQuery(
            "❌ Balans Çatışmır!\n\n🔗 Zəhmət olmasa Üzv Dəvət Edərək Ulduz Qazan!\n\n💸 Və Ya Pulqabına Ulduz Əlavə Et!",
            { show_alert: true },
          );
          await send_invoice_for_pocket(
            ctx,
            contect_data.wip_channel_price_15days - user_data.user_balance,
          );
        } else {
          const geted_user_data = await get_user_data(ctx.from.id);
          let new_data = await {
            ...geted_user_data,
            user_balance:
              geted_user_data.user_balance -
              contect_data.wip_channel_price_15days,
            is_vip: false,
            expires_at: Date.now() + 15 * 24 * 60 * 60 * 1000,
            joined_at: Date.now(),
            in_channel: true,
          };
          await put_user_data(ctx.from.id, new_data);
          await bot.telegram.sendMessage(
            config_data.owner_id,
            `✅ [İstifadəçini Gör](tg://user?id=${ctx.from.id}) VIP KANAL Satın Aldı\n\n#vipchannelbuyed15days`,
            { parse_mode: "Markdown" },
          );
          await ctx.answerCbQuery("✅ Təbriklər VIP KANAL Uğurla Alındı!");
          const inviteLink = await ctx.telegram.createChatInviteLink(
            "-1003580607918",
            {
              member_limit: 1,
              expire_date: Math.floor(Date.now() / 1000) + 600,
            },
          );
          await ctx.reply(
            `🎉 Ödəniş Uğurlu!\n\n⚠️ Diqqət Dəvət Linkini Paylaşma!\n\n👑 Dəvət Linki yalnız 1 Nəfər Üçün Keçərlidir!\n\n🔗 ${inviteLink.invite_link}`,
          );
          setTimeout(async () => {
            try {
              let main_menu_buttons = Markup.inlineKeyboard([
                [
                  Markup.button.url(
                    "🔗  Dəvət Et Pulsuz Al  🔗",
                    `https://t.me/share/url?url=${encodeURIComponent(`https://t.me/${config_data.bot_username}?start=${ctx.from.id}`)}`,
                  ),
                ],
                [Markup.button.callback(`👑  VIP KANAL  👑`, "wip_channel")],
                [
                  Markup.button.url(
                    "💋  Özəl Söhbət  💋",
                    "https://t.me/narmin_alyvaa",
                  ),
                ],
                [
                  Markup.button.callback("🍑  Paketlər  🍑", "content"),
                  Markup.button.callback("🥵  Video Zəng 🥵", "show"),
                ],
                [Markup.button.callback("💸  Pulqabı  💸", "wallet")],
      [Markup.button.callback("🌐  Dil  🌐", "language")],

              ]);
              await ctx.replyWithPhoto(config_data.profile_photo_id, {
                caption: `✋🏻 Salam Balam Xoş Gəldin!\n\n👑 VIP Kanal Hər Gün Yeni Özəl Videolar\n\n🔥 Tam Açıq Məzmunlar\n\n🥵 Video Zəng, Özəl Çəkilişlər\n\n✅ Pulsuz Giriş Fürsəti\n\n🔗 Dəvət Etdiyin Hər Nəfər Üçün ${config_data.star_per_invite} 🌟 Qazan!`,
                parse_mode: "Markdown",
                ...main_menu_buttons,
              });
            } catch (error) {
              console.log(error);
              bot.telegram.sendMessage(
                config_data.owner_id,
                `❌ VIP Kanal Satın Alma Sonrası Mesaj Gönderilemedi\n\n${error}\n\n#error`,
              );
            }
          }, 5000);
        }
        break;
      case "monthly":
        if (user_data.user_balance < contect_data.wip_channel_price_monthly) {
          await ctx.answerCbQuery(
            "❌ Balans Çatışmır!\n\n🔗 Zəhmət olmasa Üzv Dəvət Edərək Ulduz Qazan!\n\n💸 Və Ya Pulqabına Ulduz Əlavə Et!",
            { show_alert: true },
          );
          await send_invoice_for_pocket(
            ctx,
            contect_data.wip_channel_price_monthly - user_data.user_balance,
          );
        } else {
          const geted_user_data = await get_user_data(ctx.from.id);
          let new_data = await {
            ...geted_user_data,
            user_balance:
              geted_user_data.user_balance -
              contect_data.wip_channel_price_monthly,
            is_vip: false,
            expires_at: Date.now() + 30 * 24 * 60 * 60 * 1000,
            joined_at: Date.now(),
            in_channel: true,
          };
          await put_user_data(ctx.from.id, new_data);
          await bot.telegram.sendMessage(
            config_data.owner_id,
            `✅ [İstifadəçini Gör](tg://user?id=${ctx.from.id}) VIP KANAL Satın Aldı\n\n#vipchannelbuyedmonthly`,
            { parse_mode: "Markdown" },
          );
          await ctx.answerCbQuery("✅ Təbriklər VIP KANAL Uğurla Alındı!");
          const inviteLink = await ctx.telegram.createChatInviteLink(
            "-1003580607918",
            {
              member_limit: 1,
              expire_date: Math.floor(Date.now() / 1000) + 600,
            },
          );
          await ctx.reply(
            `🎉 Ödəniş Uğurlu!\n\n⚠️ Diqqət Dəvət Linkini Paylaşma!\n\n👑 Dəvət Linki yalnız 1 Nəfər Üçün Keçərlidir!\n\n🔗 ${inviteLink.invite_link}`,
          );
          setTimeout(async () => {
            try {
              let main_menu_buttons = Markup.inlineKeyboard([
                [
                  Markup.button.url(
                    "🔗  Dəvət Et Pulsuz Al  🔗",
                    `https://t.me/share/url?url=${encodeURIComponent(`https://t.me/${config_data.bot_username}?start=${ctx.from.id}`)}`,
                  ),
                ],
                [Markup.button.callback(`👑  VIP KANAL  👑`, "wip_channel")],
                [
                  Markup.button.url(
                    "💋  Özəl Söhbət  💋",
                    "https://t.me/narmin_alyvaa",
                  ),
                ],
                [
                  Markup.button.callback("🍑  Paketlər  🍑", "content"),
                  Markup.button.callback("🥵  Video Zəng 🥵", "show"),
                ],
                [Markup.button.callback("💸  Pulqabı  💸", "wallet")],
      [Markup.button.callback("🌐  Dil  🌐", "language")],

              ]);
              await ctx.replyWithPhoto(config_data.profile_photo_id, {
                caption: `✋🏻 Salam Balam Xoş Gəldin!\n\n👑 VIP Kanal Hər Gün Yeni Özəl Videolar\n\n🔥 Tam Açıq Məzmunlar\n\n🥵 Video Zəng, Özəl Çəkilişlər\n\n✅ Pulsuz Giriş Fürsəti\n\n🔗 Dəvət Etdiyin Hər Nəfər Üçün ${config_data.star_per_invite} 🌟 Qazan!`,
                parse_mode: "Markdown",
                ...main_menu_buttons,
              });
            } catch (error) {
              console.log(error);
              bot.telegram.sendMessage(
                config_data.owner_id,
                `❌ VIP Kanal Satın Alma Sonrası Mesaj Gönderilemedi\n\n${error}\n\n#error`,
              );
            }
          }, 5000);
        }
        break;
      case "3monthly":
        if (user_data.user_balance < contect_data.wip_channel_price_3monthly) {
          await ctx.answerCbQuery(
            "❌ Balans Çatışmır!\n\n🔗 Zəhmət olmasa Üzv Dəvət Edərək Ulduz Qazan!\n\n💸 Və Ya Pulqabına Ulduz Əlavə Et!",
            { show_alert: true },
          );
          await send_invoice_for_pocket(
            ctx,
            contect_data.wip_channel_price_3monthly - user_data.user_balance,
          );
        } else {
          const geted_user_data = await get_user_data(ctx.from.id);
          let new_data = await {
            ...geted_user_data,
            user_balance:
              geted_user_data.user_balance -
              contect_data.wip_channel_price_3monthly,
            is_vip: false,
            expires_at: Date.now() + 90 * 24 * 60 * 60 * 1000,
            joined_at: Date.now(),
            in_channel: true,
          };
          await put_user_data(ctx.from.id, new_data);
          await bot.telegram.sendMessage(
            config_data.owner_id,
            `✅ [İstifadəçini Gör](tg://user?id=${ctx.from.id}) VIP KANAL Satın Aldı\n\n#vipchannelbuyed3monthly`,
            { parse_mode: "Markdown" },
          );
          await ctx.answerCbQuery("✅ Təbriklər VIP KANAL Uğurla Alındı!");
          const inviteLink = await ctx.telegram.createChatInviteLink(
            "-1003580607918",
            {
              member_limit: 1,
              expire_date: Math.floor(Date.now() / 1000) + 600,
            },
          );
          await ctx.reply(
            `🎉 Ödəniş Uğurlu!\n\n⚠️ Diqqət Dəvət Linkini Paylaşma!\n\n👑 Dəvət Linki yalnız 1 Nəfər Üçün Keçərlidir!\n\n🔗 ${inviteLink.invite_link}`,
          );
          setTimeout(async () => {
            try {
              let main_menu_buttons = Markup.inlineKeyboard([
                [
                  Markup.button.url(
                    "🔗  Dəvət Et Pulsuz Al  🔗",
                    `https://t.me/share/url?url=${encodeURIComponent(`https://t.me/${config_data.bot_username}?start=${ctx.from.id}`)}`,
                  ),
                ],
                [Markup.button.callback(`👑  VIP KANAL  👑`, "wip_channel")],
                [
                  Markup.button.url(
                    "💋  Özəl Söhbət  💋",
                    "https://t.me/narmin_alyvaa",
                  ),
                ],
                [
                  Markup.button.callback("🍑  Paketlər  🍑", "content"),
                  Markup.button.callback("🥵  Video Zəng 🥵", "show"),
                ],
                [Markup.button.callback("💸  Pulqabı  💸", "wallet")],
      [Markup.button.callback("🌐  Dil  🌐", "language")],

              ]);
              await ctx.replyWithPhoto(config_data.profile_photo_id, {
                caption: `✋🏻 Salam Balam Xoş Gəldin!\n\n👑 VIP Kanal Hər Gün Yeni Özəl Videolar\n\n🔥 Tam Açıq Məzmunlar\n\n🥵 Video Zəng, Özəl Çəkilişlər\n\n✅ Pulsuz Giriş Fürsəti\n\n🔗 Dəvət Etdiyin Hər Nəfər Üçün ${config_data.star_per_invite} 🌟 Qazan!`,
                parse_mode: "Markdown",
                ...main_menu_buttons,
              });
            } catch (error) {
              console.log(error);
              bot.telegram.sendMessage(
                config_data.owner_id,
                `❌ VIP Kanal Satın Alma Sonrası Mesaj Gönderilemedi\n\n${error}\n\n#error`,
              );
            }
          }, 5000);
        }
        break;
      default:
        await ctx.answerCbQuery("❌ Geçersiz Seçenek!");
        break;
    }
  } catch (error) {
    console.log(error);
    bot.telegram.sendMessage(
      config_data.owner_id,
      `❌ VIP Kanal Satın Alma İşlemi Başarısız Oldu\n\n${error}\n\n#error`,
    );
  }
});
bot.action(/pocket_(.+)/, async (ctx) => {
  const pocket = ctx.match[1];
  const user_data = await get_user_data(ctx.from.id);

  switch (pocket) {
    case "1":
      if (user_data.user_balance < contect_data.pocket_1.price) {
        await ctx.answerCbQuery(
          "❌ Balans Çatışmır!\n\n🔗 Zəhmət olmasa Üzv Dəvət Edərək Ulduz Qazan!\n\n💸 Və Ya Pulqabına Ulduz Əlavə Et!",
          { show_alert: true },
        );
        await send_invoice_for_pocket(
          ctx,
          contect_data.pocket_1.price - user_data.user_balance,
        );
      } else {
        const geted_user_data = await get_user_data(ctx.from.id);
        let new_data = await {
          ...geted_user_data,
          user_balance:
            geted_user_data.user_balance - contect_data.pocket_1.price,
        };
        await put_user_data(ctx.from.id, new_data);
        await bot.telegram.sendMessage(
          config_data.owner_id,
          `✅ [İstifadəçini Gör](tg://user?id=${ctx.from.id}) Poket1 Satın Aldı`,
          { parse_mode: "Markdown" },
        );
        await ctx.answerCbQuery("✅ Təbriklər Məzmun Uğurla Alındı!");
        let files = fs.readdirSync(imagesDir);
        const shuffled = files.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 5);
        selected.forEach((file, index) => {
          setTimeout(async () => {
            try {
              const filePath = path.join(imagesDir, file);

              await ctx.replyWithPhoto(
                { source: filePath }, // 👈 əsas fərq burdadır
                { protect_content: true, has_spoiler: true },
              );
            } catch (err) {
              console.log(err);
            }
          }, 2000 * index);
        });

        setTimeout(async () => {
          try {
            let main_menu_buttons = Markup.inlineKeyboard([
              [
                Markup.button.url(
                  "🔗  Dəvət Et Pulsuz Al  🔗",
                  `https://t.me/share/url?url=${encodeURIComponent(`https://t.me/${config_data.bot_username}?start=${ctx.from.id}`)}`,
                ),
              ],
              [Markup.button.callback(`👑  VIP KANAL  👑`, "wip_channel")],
              [
                Markup.button.url(
                  "💋  Özəl Söhbət  💋",
                  "https://t.me/narmin_alyvaa",
                ),
              ],
              [
                Markup.button.callback("🍑  Paketlər  🍑", "content"),
                Markup.button.callback("🥵  Video Zəng 🥵", "show"),
              ],
              [Markup.button.callback("💸  Pulqabı  💸", "wallet")],
      [Markup.button.callback("🌐  Dil  🌐", "language")],

            ]);
            await ctx.replyWithPhoto(config_data.profile_photo_id, {
              caption: `✋🏻 Salam Balam Xoş Gəldin!\n\n👑 VIP Kanal Hər Gün Yeni Özəl Videolar\n\n🔥 Tam Açıq Məzmunlar\n\n🥵 Video Zəng, Özəl Çəkilişlər\n\n✅ Pulsuz Giriş Fürsəti\n\n🔗 Dəvət Etdiyin Hər Nəfər Üçün ${config_data.star_per_invite} 🌟 Qazan!`,
              parse_mode: "Markdown",
              ...main_menu_buttons,
            });
          } catch (error) {
            console.log(error);
          }
        }, 2000 * contect_data.pocket_1.photo.length);
      }
      break;
    case "2":
      if (user_data.user_balance < contect_data.pocket_2.price) {
        await ctx.answerCbQuery(
          "❌ Balans Çatışmır!\n\n🔗 Zəhmət olmasa Üzv Dəvət Edərək Ulduz Qazan!\n\n💸 Və Ya Pulqabına Ulduz Əlavə Et!",
          { show_alert: true },
        );
        await send_invoice_for_pocket(
          ctx,
          contect_data.pocket_2.price - user_data.user_balance,
        );
      } else {
        const geted_user_data = await get_user_data(ctx.from.id);
        let new_data = await {
          ...geted_user_data,
          user_balance:
            geted_user_data.user_balance - contect_data.pocket_2.price,
        };
        await put_user_data(ctx.from.id, new_data);
        await ctx.answerCbQuery("✅ Təbriklər Məzmun Uğurla Alındı!");
        await bot.telegram.sendMessage(
          config_data.owner_id,
          `✅ [İstifadəçini Gör](tg://user?id=${ctx.from.id}) Poket2 Satın Aldı`,
          { parse_mode: "Markdown" },
        );
        // rastgele 2 videonu videos klasorunden gonder
        let files = fs.readdirSync(videosDir);
        const shuffled = files.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 2);
        selected.forEach((file, index) => {
          setTimeout(async () => {
            try {
              const filePath = path.join(videosDir, file);

              await ctx.replyWithVideo(
                { source: filePath }, // 👈 əsas fərq burdadır
                { protect_content: true, has_spoiler: true },
              );
            } catch (err) {
              console.log(err);
            }
          }, 2000 * index);
        });
        setTimeout(async () => {
          try {
            let main_menu_buttons = Markup.inlineKeyboard([
              [
                Markup.button.url(
                  "🔗  Dəvət Et Pulsuz Al  🔗",
                  `https://t.me/share/url?url=${encodeURIComponent(`https://t.me/${config_data.bot_username}?start=${ctx.from.id}`)}`,
                ),
              ],
              [Markup.button.callback(`👑  VIP KANAL  👑`, "wip_channel")],
              [
                Markup.button.url(
                  "💋  Özəl Söhbət  💋",
                  "https://t.me/narmin_alyvaa",
                ),
              ],
              [
                Markup.button.callback("🍑  Paketlər  🍑", "content"),
                Markup.button.callback("🥵  Video Zəng 🥵", "show"),
              ],
              [Markup.button.callback("💸  Pulqabı  💸", "wallet")],
      [Markup.button.callback("🌐  Dil  🌐", "language")],

            ]);
            await ctx.replyWithPhoto(config_data.profile_photo_id, {
              caption: `✋🏻 Salam Balam Xoş Gəldin!\n\n👑 VIP Kanal Hər Gün Yeni Özəl Videolar\n\n🔥 Tam Açıq Məzmunlar\n\n🥵 Video Zəng, Özəl Çəkilişlər\n\n✅ Pulsuz Giriş Fürsəti\n\n🔗 Dəvət Etdiyin Hər Nəfər Üçün ${config_data.star_per_invite} 🌟 Qazan!`,
              parse_mode: "Markdown",
              ...main_menu_buttons,
            });
          } catch (error) {
            console.log(error);
          }
        }, 2000 * contect_data.pocket_2.video.length);
      }
      break;
    case "3":
      if (user_data.user_balance < contect_data.pocket_3.price) {
        await ctx.answerCbQuery(
          "❌ Balans Çatışmır!\n\n🔗 Zəhmət olmasa Üzv Dəvət Edərək Ulduz Qazan!\n\n💸 Və Ya Pulqabına Ulduz Əlavə Et!",
          { show_alert: true },
        );
        await send_invoice_for_pocket(
          ctx,
          contect_data.pocket_3.price - user_data.user_balance,
        );
      } else {
        const geted_user_data = await get_user_data(ctx.from.id);
        let new_data = await {
          ...geted_user_data,
          user_balance:
            geted_user_data.user_balance - contect_data.pocket_3.price,
        };
        await put_user_data(ctx.from.id, new_data);
        await ctx.answerCbQuery("✅ Təbriklər Məzmun Uğurla Alındı!");
        await bot.telegram.sendMessage(
          config_data.owner_id,
          `✅ [İstifadəçini Gör](tg://user?id=${ctx.from.id}) Poket3 Satın Aldı`,
          { parse_mode: "Markdown" },
        );
        let files = fs.readdirSync(imagesDir);
        const shuffled = files.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 5);
        selected.forEach((file, index) => {
          setTimeout(async () => {
            try {
              const filePath = path.join(imagesDir, file);

              await ctx.replyWithPhoto(
                { source: filePath }, // 👈 əsas fərq burdadır
                { protect_content: true, has_spoiler: true },
              );
            } catch (err) {
              console.log(err);
            }
          }, 2000 * index);
        });
        setTimeout(() => {
          let files = fs.readdirSync(videosDir);
          const shuffled = files.sort(() => 0.5 - Math.random());
          const selected = shuffled.slice(0, 2);
          selected.forEach((file, index) => {
            setTimeout(async () => {
              try {
                const filePath = path.join(videosDir, file);

                await ctx.replyWithVideo(
                  { source: filePath }, // 👈 əsas fərq burdadır
                  { protect_content: true, has_spoiler: true },
                );
              } catch (err) {
                console.log(err);
              }
            }, 2000 * index);
          });
        }, contect_data.pocket_3.photo.length * 2000);
        setTimeout(
          async () => {
            try {
              let main_menu_buttons = Markup.inlineKeyboard([
                [
                  Markup.button.url(
                    "🔗  Dəvət Et Pulsuz Al  🔗",
                    `https://t.me/share/url?url=${encodeURIComponent(`https://t.me/${config_data.bot_username}?start=${ctx.from.id}`)}`,
                  ),
                ],
                [Markup.button.callback(`👑  VIP KANAL  👑`, "wip_channel")],
                [
                  Markup.button.url(
                    "💋  Özəl Söhbət  💋",
                    "https://t.me/narmin_alyvaa",
                  ),
                ],
                [
                  Markup.button.callback("🍑  Paketlər  🍑", "content"),
                  Markup.button.callback("🥵  Video Zəng 🥵", "show"),
                ],
                [Markup.button.callback("💸  Pulqabı  💸", "wallet")],
      [Markup.button.callback("🌐  Dil  🌐", "language")],

              ]);
              await ctx.replyWithPhoto(config_data.profile_photo_id, {
                caption: `✋🏻 Salam Balam Xoş Gəldin!\n\n👑 VIP Kanal Hər Gün Yeni Özəl Videolar\n\n🔥 Tam Açıq Məzmunlar\n\n🥵 Video Zəng, Özəl Çəkilişlər\n\n✅ Pulsuz Giriş Fürsəti\n\n🔗 Dəvət Etdiyin Hər Nəfər Üçün ${config_data.star_per_invite} 🌟 Qazan!`,
                parse_mode: "Markdown",
                ...main_menu_buttons,
              });
            } catch (error) {
              console.log(error);
            }
          },
          2000 *
            (contect_data.pocket_3.video.length +
              contect_data.pocket_3.photo.length),
        );
      }
      break;
    case "4":
      if (user_data.user_balance < contect_data.pocket_4.price) {
        await ctx.answerCbQuery(
          "❌ Balans Çatışmır!\n\n🔗 Zəhmət olmasa Üzv Dəvət Edərək Ulduz Qazan!\n\n💸 Və Ya Pulqabına Ulduz Əlavə Et!",
          { show_alert: true },
        );
        await send_invoice_for_pocket(
          ctx,
          contect_data.pocket_4.price - user_data.user_balance,
        );
      } else {
        const geted_user_data = await get_user_data(ctx.from.id);
        let new_data = await {
          ...geted_user_data,
          user_balance:
            geted_user_data.user_balance - contect_data.pocket_4.price,
        };
        await put_user_data(ctx.from.id, new_data);
        await ctx.answerCbQuery("✅ Təbriklər Məzmun Uğurla Alındı!");
        await bot.telegram.sendMessage(
          config_data.owner_id,
          `✅ [İstifadəçini Gör](tg://user?id=${ctx.from.id}) Poket4 Satın Aldı`,
          { parse_mode: "Markdown" },
        );

        let files = fs.readdirSync(imagesDir);
        const shuffled = files.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 10);
        selected.forEach((file, index) => {
          setTimeout(async () => {
            try {
              const filePath = path.join(imagesDir, file);

              await ctx.replyWithPhoto(
                { source: filePath }, // 👈 əsas fərq burdadır
                { protect_content: true, has_spoiler: true },
              );
            } catch (err) {
              console.log(err);
            }
          }, 2000 * index);
        });
        setTimeout(() => {
          let files = fs.readdirSync(videosDir);
          const shuffled = files.sort(() => 0.5 - Math.random());
          const selected = shuffled.slice(0, 5);
          selected.forEach((file, index) => {
            setTimeout(async () => {
              try {
                const filePath = path.join(videosDir, file);

                await ctx.replyWithVideo(
                  { source: filePath }, // 👈 əsas fərq burdadır
                  { protect_content: true, has_spoiler: true },
                );
              } catch (err) {
                console.log(err);
              }
            }, 2000 * index);
          });
        }, contect_data.pocket_4.photo.length * 2000);
        setTimeout(
          async () => {
            try {
              let main_menu_buttons = Markup.inlineKeyboard([
                [
                  Markup.button.url(
                    "🔗  Dəvət Et Pulsuz Al  🔗",
                    `https://t.me/share/url?url=${encodeURIComponent(`https://t.me/${config_data.bot_username}?start=${ctx.from.id}`)}`,
                  ),
                ],
                [Markup.button.callback(`👑  VIP KANAL  👑`, "wip_channel")],
                [
                  Markup.button.url(
                    "💋  Özəl Söhbət  💋",
                    "https://t.me/narmin_alyvaa",
                  ),
                ],
                [
                  Markup.button.callback("🍑  Paketlər  🍑", "content"),
                  Markup.button.callback("🥵  Video Zəng 🥵", "show"),
                ],
                [Markup.button.callback("💸  Pulqabı  💸", "wallet")],
      [Markup.button.callback("🌐  Dil  🌐", "language")],

              ]);
              await ctx.replyWithPhoto(config_data.profile_photo_id, {
                caption: `✋🏻 Salam Balam Xoş Gəldin!\n\n👑 VIP Kanal Hər Gün Yeni Özəl Videolar\n\n🔥 Tam Açıq Məzmunlar\n\n🥵 Video Zəng, Özəl Çəkilişlər\n\n✅ Pulsuz Giriş Fürsəti\n\n🔗 Dəvət Etdiyin Hər Nəfər Üçün ${config_data.star_per_invite} 🌟 Qazan!`,
                parse_mode: "Markdown",
                ...main_menu_buttons,
              });
            } catch (error) {
              console.log(error);
            }
          },
          2000 *
            (contect_data.pocket_4.video.length +
              contect_data.pocket_4.photo.length),
        );
      }
      break;
    default:
      await ctx.answerCbQuery("❌ Yanlış Paket Seçimi!", {
        show_alert: true,
      });
      break;
  }
});
bot.action(/show_(.+)/, async (ctx) => {
  try {
    const pocket_number = ctx.match[1];
    const user_data = await get_user_data(ctx.from.id);

    switch (pocket_number) {
      case "1":
        if (user_data.user_balance < contect_data.s_pocket_1.price) {
          await ctx.answerCbQuery(
            "❌ Balans Çatışmır!\n\n🔗 Zəhmət olmasa Üzv Dəvət Edərək Ulduz Qazan!\n\n💸 Və Ya Pulqabına Ulduz Əlavə Et!",
            { show_alert: true },
          );
          await send_invoice_for_pocket(
            ctx,
            contect_data.s_pocket_1.price - user_data.user_balance,
          );
        } else {
          const geted_user_data = await get_user_data(ctx.from.id);
          let new_data = await {
            ...geted_user_data,
            user_balance:
              geted_user_data.user_balance - contect_data.s_pocket_1.price,
          };
          await put_user_data(ctx.from.id, new_data);
          await ctx.answerCbQuery("✅ Təbriklər Video Zəng Satın Alındı!");
          await ctx.reply("✅ Uğurla Alındı!\n\nİcra Edilməsi Üçün Özələ Yaz!");
          await bot.telegram.sendMessage(
            config_data.owner_id,
            `✅ [İstifadəçini Gör](tg://user?id=${ctx.from.id}) Show Poket1 Satın Aldı`,
            { parse_mode: "Markdown" },
          );
        }
        break;
      case "2":
        if (user_data.user_balance < contect_data.s_pocket_2.price) {
          await ctx.answerCbQuery(
            "❌ Balans Çatışmır!\n\n🔗 Zəhmət olmasa Üzv Dəvət Edərək Ulduz Qazan!\n\n💸 Və Ya Pulqabına Ulduz Əlavə Et!",
            { show_alert: true },
          );
          await send_invoice_for_pocket(
            ctx,
            contect_data.s_pocket_2.price - user_data.user_balance,
          );
        } else {
          const geted_user_data = await get_user_data(ctx.from.id);
          let new_data = await {
            ...geted_user_data,
            user_balance:
              geted_user_data.user_balance - contect_data.s_pocket_2.price,
          };
          await put_user_data(ctx.from.id, new_data);
          await ctx.answerCbQuery("✅ Təbriklər Video Zəng Satın Alındı!");
          await ctx.reply("✅ Uğurla Alındı!\n\nİcra Edilməsi Üçün Özələ Yaz!");
          await bot.telegram.sendMessage(
            config_data.owner_id,
            `✅ [İstifadəçini Gör](tg://user?id=${ctx.from.id}) Show Poket2 Satın Aldı`,
            { parse_mode: "Markdown" },
          );
        }
        break;
      case "3":
        if (user_data.user_balance < contect_data.s_pocket_3.price) {
          await ctx.answerCbQuery(
            "❌ Balans Çatışmır!\n\n🔗 Zəhmət olmasa Üzv Dəvət Edərək Ulduz Qazan!\n\n💸 Və Ya Pulqabına Ulduz Əlavə Et!",
            { show_alert: true },
          );
          await send_invoice_for_pocket(
            ctx,
            contect_data.s_pocket_3.price - user_data.user_balance,
          );
        } else {
          const geted_user_data = await get_user_data(ctx.from.id);
          let new_data = await {
            ...geted_user_data,
            user_balance:
              geted_user_data.user_balance - contect_data.s_pocket_3.price,
          };
          await put_user_data(ctx.from.id, new_data);
          await ctx.answerCbQuery("✅ Təbriklər Video Zəng Satın Alındı!");
          await ctx.reply("✅ Uğurla Alındı!\n\nİcra Edilməsi Üçün Özələ Yaz!");
          await bot.telegram.sendMessage(
            config_data.owner_id,
            `✅ [İstifadəçini Gör](tg://user?id=${ctx.from.id}) Show Poket3 Satın Aldı`,
            { parse_mode: "Markdown" },
          );
        }
        break;
      case "4":
        if (user_data.user_balance < contect_data.s_pocket_4.price) {
          await ctx.answerCbQuery(
            "❌ Balans Çatışmır!\n\n🔗 Zəhmət olmasa Üzv Dəvət Edərək Ulduz Qazan!\n\n💸 Və Ya Pulqabına Ulduz Əlavə Et!",
            { show_alert: true },
          );
          await send_invoice_for_pocket(
            ctx,
            contect_data.s_pocket_4.price - user_data.user_balance,
          );
        } else {
          const geted_user_data = await get_user_data(ctx.from.id);
          let new_data = await {
            ...geted_user_data,
            user_balance:
              geted_user_data.user_balance - contect_data.s_pocket_4.price,
          };
          await put_user_data(ctx.from.id, new_data);
          await ctx.answerCbQuery("✅ Təbriklər Video Zəng Satın Alındı!");
          await ctx.reply("✅ Uğurla Alındı!\n\nİcra Edilməsi Üçün Özələ Yaz!");
          await bot.telegram.sendMessage(
            config_data.owner_id,
            `✅ [İstifadəçini Gör](tg://user?id=${ctx.from.id}) Show Poket4 Satın Aldı`,
            { parse_mode: "Markdown" },
          );
        }
        break;
      default:
        await ctx.answerCbQuery("❌ Yanlış Paket Seçimi!", {
          show_alert: true,
        });
        return;
    }
  } catch (error) {
    console.log(error);
  }
});
bot.action(/buy_(.+)/, async (ctx) => {
  try {
    const amount = ctx.match[1];
    await send_invoice_for_increase(ctx, amount);
    await ctx.answerCbQuery();
  } catch (error) {
    console.log(error);
  }
});

// bot.action("buy_photo_special_now", async (ctx) => {
//     try {
//         const user_data = await get_user_data(ctx.from.id)
//         if (user_data.user_balance < 150) {
//             await ctx.answerCbQuery("❌ Yetersiz Bakiye!\n\n🔗 Lütfen Üye Davet Ederek Yıldız Kazan!\n\n💸 Ve Ya Cüzdana Yıldız Ekle!", { show_alert: true });
//             await send_invoice_for_pocket(ctx, 150 - user_data.user_balance)
//         } else {
//             const geted_user_data = await get_user_data(ctx.from.id)
//             let new_data = await { ...geted_user_data, user_balance: geted_user_data.user_balance - 150 }
//             await put_user_data(ctx.from.id, new_data)
//             await ctx.answerCbQuery("✅ Tebrikler Içerik Başarıyla Alındı!");
//             await ctx.replyWithPhoto(photo_id, { protect_content: true, has_spoiler: true })
//             let main_menu_buttons = Markup.inlineKeyboard([[Markup.button.url("🔗  Davet Et Ücretsiz Al  🔗", `https://t.me/share/url?url=${encodeURIComponent(`https://t.me/${config_data.bot_username}?start=${ctx.from.id}`)}`)], [Markup.button.callback(`👑  VIP KANAL  👑`, "wip_channel")], [Markup.button.url("💋  Özel Söhbet  💋", "https://t.me/narmin_alyvaa")], [Markup.button.callback("🍑  İçerikler  🍑", "content"), Markup.button.callback("🥵  Show  🥵", "show")], [Markup.button.callback("💸  Cüzdan  💸", "wallet")]])
//             await ctx.replyWithPhoto(config_data.profile_photo_id, { caption: `✋🏻 Merhaba Balam Hoş Geldin!\n\n👑 VIP Kanal Her Gün Yeni Özel Videolar\n\n🔥 Full Açıк İçerikler\n\n🥵 Shоw, Özel Çekimler\n\n✅ Ücretsiz Erişim Fırsatı\n\n🔗 Davet Etdiğin Her Kişi İçin ${config_data.star_per_invite} 🌟 Kazan!`, parse_mode: 'Markdown', ...main_menu_buttons })
//         }
//     } catch (error) {
//         console.log(error)
//     }
// })
// bot.action("buy_video_special_now", async (ctx) => {
//     try {
//         const user_data = await get_user_data(ctx.from.id)
//         if (user_data.user_balance < 300) {
//             await ctx.answerCbQuery("❌ Yetersiz Bakiye!\n\n🔗 Lütfen Üye Davet Ederek Yıldız Kazan!\n\n💸 Ve Ya Cüzdana Yıldız Ekle!", { show_alert: true });
//             await send_invoice_for_pocket(ctx, 300 - user_data.user_balance)
//         } else {
//             const geted_user_data = await get_user_data(ctx.from.id)
//             let new_data = await { ...geted_user_data, user_balance: geted_user_data.user_balance - 300 }
//             await put_user_data(ctx.from.id, new_data)
//             await ctx.answerCbQuery("✅ Tebrikler Içerik Başarıyla Alındı!");
//             await ctx.replyWithVideo(video_id, { protect_content: true, has_spoiler: true })
//             let main_menu_buttons = Markup.inlineKeyboard([[Markup.button.url("🔗  Davet Et Ücretsiz Al  🔗", `https://t.me/share/url?url=${encodeURIComponent(`https://t.me/${config_data.bot_username}?start=${ctx.from.id}`)}`)], [Markup.button.callback(`👑  VIP KANAL  👑`, "wip_channel")], [Markup.button.url("💋  Özel Söhbet  💋", "https://t.me/narmin_alyvaa")], [Markup.button.callback("🍑  İçerikler  🍑", "content"), Markup.button.callback("🥵  Show  🥵", "show")], [Markup.button.callback("💸  Cüzdan  💸", "wallet")]])
//             await ctx.replyWithPhoto(config_data.profile_photo_id, { caption: `✋🏻 Merhaba Balam Hoş Geldin!\n\n👑 VIP Kanal Her Gün Yeni Özel Videolar\n\n🔥 Full Açıк İçerikler\n\n🥵 Shоw, Özel Çekimler\n\n✅ Ücretsiz Erişim Fırsatı\n\n🔗 Davet Etdiğin Her Kişi İçin ${config_data.star_per_invite} 🌟 Kazan!`, parse_mode: 'Markdown', ...main_menu_buttons })
//         }
//     } catch (error) {
//         console.log(error)
//     }
// })
// bot.command("botusatinal", async (ctx) => {
//     try {
//         ctx.reply("💸 Botu Satın Almak Için @showcunuz_ceren İle İletişime Geç!")
//         await bot.telegram.sendMessage(config_data.owner_id, `[Kullanici](tg://user?id=${ctx.from.id}):  Botu Satınalmak istedi`, { parse_mode: 'Markdown' })
//     } catch (error) {
//         console.log(error)
//     }
// })

bot.command("upload", async (ctx) => {
  if (ctx.from.id == config_data.owner_id) {
    if (!ctx.session) ctx.session = {};
    ctx.session.uploading = true;
    await ctx.reply("Zəhmət olmasa Şəkil Göndərin");
  }
});
bot.command("invoice", async (ctx) => {
  try {
    const TELEGRAM_API_URL = `https://api.telegram.org/bot${process.env.TOKEN}/createInvoiceLink`;
    const amount = parseInt(ctx.message.text.split(" ")[1]);
    const title = ctx.message.text.split(" ")[2] || "Invoice";
    const description = ctx.message.text.split(" ")[3] || "Invoice description";
    if (isNaN(amount)) {
      await ctx.reply(
        "Please provide a valid amount. Usage: /invoice <amount_in_cents>",
      );
      return;
    }
    if (ctx.from.id != config_data.owner_id) {
      await ctx.reply("You are not authorized to use this command.");
      return;
    }
    const invoice = {
      title: title,
      description: description,
      payload: "unique-payload-identifier",
      currency: "XTR",
      prices: [{ label: "Item", amount: amount }],
    };
    await axios
      .post(TELEGRAM_API_URL, invoice)
      .then((response) => {
        if (response.data.ok) {
          ctx.reply(`Invoice link: ${response.data.result}`);
        } else {
          ctx.reply("Failed to create invoice link.");
          bot.telegram.sendMessage(
            config_data.owner_id,
            `❌ Failed to create invoice link: ${response.data.description}`,
          );
        }
      })
      .catch((error) => {
        console.log(error);
        ctx.reply("Error occurred while creating invoice link.");
        bot.telegram.sendMessage(
          config_data.owner_id,
          `❌ Error in /invoice command for user ${ctx.from.id}: ${error}`,
        );
      });
  } catch (error) {
    console.log(error);
    bot.telegram.sendMessage(
      config_data.owner_id,
      `❌ Error in /invoice command for user ${ctx.from.id}: ${error}`,
    );
  }
});
bot.command("myid", async (ctx) => {
  try {
    await ctx.reply(`Sənin ID-n: ${ctx.from.id}`);
  } catch (error) {
    console.log(error);
  }
});
bot.on("photo", async (ctx) => {
  try {
    if (!ctx.session) ctx.session = {};
    if (ctx.session.uploading && ctx.from.id == config_data.owner_id) {
      //upload photo to images folder with file_id as name
      const photo = ctx.message.photo.pop();
      const file_id = photo.file_id;
      const file_link = await bot.telegram.getFileLink(file_id);
      const response = await fetch(file_link.href);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const fs = require("fs");
      fs.writeFile(`./images/${file_id}.jpg`, buffer, () => {
        console.log("Photo Uploaded");
      });
      ctx.session.uploading = false;
      await ctx.reply("Şəkil Uğurla Yükləndi!");
      return;
    }

    let main_menu_buttons = Markup.inlineKeyboard([
      [
        Markup.button.url(
          "🔗  Dəvət Et Pulsuz Al  🔗",
          `https://t.me/share/url?url=${encodeURIComponent(`https://t.me/${config_data.bot_username}?start=${ctx.from.id}`)}`,
        ),
      ],
      [Markup.button.url("💋  Özəl Söhbət  💋", "https://t.me/narmin_alyvaa")],
      [
        Markup.button.callback("🍑  Paketlər  🍑", "content"),
        Markup.button.callback("🥵  Video Zəng 🥵", "show"),
      ],
      [Markup.button.callback("💸  Pulqabı  💸", "wallet")],
      [Markup.button.callback("🌐  Dil  🌐", "language")],

    ]);
    await ctx.replyWithPhoto(config_data.profile_photo_id, {
      caption: `✋🏻 Salam Balam Xoş Gəldin!\n\n🔥 Tam Açıq Məzmunlar\n\n🥵 Video Zəng, Özəl Çəkilişlər\n\n✅ Pulsuz Giriş Fürsəti\n\n🔗 Dəvət Etdiyin Hər Nəfər Üçün ${config_data.star_per_invite} 🌟 Qazan!`,
      parse_mode: "Markdown",
      ...main_menu_buttons,
    });
  } catch (error) {
    console.log(error);
  }
});
bot.on("video", async (ctx) => {
  try {
    if (!ctx.session) ctx.session = {};
    if (ctx.session.uploading && ctx.from.id == config_data.owner_id) {
      //upload video to videos folder with file_id as name
      const video = ctx.message.video;
      const file_id = video.file_id;
      const file_link = await bot.telegram.getFileLink(file_id);
      const response = await fetch(file_link.href);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const fs = require("fs");
      fs.writeFileSync(`videos/${file_id}.mp4`, buffer);
      ctx.session.uploading = false;
      await ctx.reply("Video Uğurla Yükləndi!");
      return;
    } else {
    }

    let main_menu_buttons = Markup.inlineKeyboard([
      [
        Markup.button.url(
          "🔗  Dəvət Et Pulsuz Al  🔗",
          `https://t.me/share/url?url=${encodeURIComponent(`https://t.me/${config_data.bot_username}?start=${ctx.from.id}`)}`,
        ),
      ],
      [Markup.button.url("💋  Özəl Söhbət  💋", "https://t.me/narmin_alyvaa")],
      [
        Markup.button.callback("🍑  Paketlər  🍑", "content"),
        Markup.button.callback("🥵  Video Zəng 🥵", "show"),
      ],
      [Markup.button.callback("💸  Pulqabı  💸", "wallet")],
      [Markup.button.callback("🌐  Dil  🌐", "language")],

    ]);
    await ctx.replyWithPhoto(config_data.profile_photo_id, {
      caption: `✋🏻 Salam Balam Xoş Gəldin!\n\n🔥 Tam Açıq Məzmunlar\n\n🥵 Video Zəng, Özəl Çəkilişlər\n\n✅ Pulsuz Giriş Fürsəti\n\n🔗 Dəvət Etdiyin Hər Nəfər Üçün ${config_data.star_per_invite} 🌟 Qazan!`,
      parse_mode: "Markdown",
      ...main_menu_buttons,
    });
  } catch (error) {
    console.log(error);
  }
});

bot.on("text", async (ctx) => {
  try {
    let main_menu_buttons = Markup.inlineKeyboard([
      [
        Markup.button.url(
          "🔗  Dəvət Et Pulsuz Al  🔗",
          `https://t.me/share/url?url=${encodeURIComponent(`https://t.me/${config_data.bot_username}?start=${ctx.from.id}`)}`,
        ),
      ],
      [Markup.button.callback(`👑  VIP KANAL  👑`, "wip_channel")],
      [Markup.button.url("💋  Özəl Söhbət  💋", "https://t.me/narmin_alyvaa")],
      [
        Markup.button.callback("🍑  Paketlər  🍑", "content"),
        Markup.button.callback("🥵  Video Zəng 🥵", "show"),
      ],
      [Markup.button.callback("💸  Pulqabı  💸", "wallet")],
      [Markup.button.callback("🌐  Dil  🌐", "language")],

    ]);
    await ctx.replyWithPhoto(config_data.profile_photo_id, {
      caption: `✋🏻 Salam Balam Xoş Gəldin!\n\n👑 VIP Kanal Hər Gün Yeni Özəl Videolar\n\n🔥 Tam Açıq Məzmunlar\n\n🥵 Video Zəng, Özəl Çəkilişlər\n\n✅ Pulsuz Giriş Fürsəti\n\n🔗 Dəvət Etdiyin Hər Nəfər Üçün ${config_data.star_per_invite} 🌟 Qazan!`,
      parse_mode: "Markdown",
      ...main_menu_buttons,
    });
  } catch (error) {
    console.log(error);
  }
});

setInterval(
  async () => {
    try {
      await bot.telegram.sendMessage(
        config_data.owner_id,
        `⏰ Running daily subscription check...`,
      );
      const now = Date.now();
      const all_users = await get_all_data();
      Object.keys(all_users).forEach(async (key, index) => {
        try {
          if (all_users[key].expires_at) {
            const expiresAt = new Date(all_users[key].expires_at);
            const oneDayBefore = new Date(
              expiresAt.getTime() - 24 * 60 * 60 * 1000,
            );
            if (
              now >= oneDayBefore &&
              now < expiresAt &&
              all_users[key].in_channel &&
              !all_users[key].is_vip
            ) {
              await bot.telegram.sendMessage(
                all_users[key].user_id,
                "⏰ Abunəliyiniz Sabah Başa Çatır!\n\nDərhal /start Əmrini İstifadə Edərək Abunəliyinizi Yeniləyin və Özəl Məzmunlara Girişə Davam Edin!",
              );
              await bot.telegram.sendMessage(
                config_data.owner_id,
                `⚠️ Warning sent to user ${all_users[key].user_id} about subscription expiring in 1 day.`,
              );
              await new Promise((resolve) => setTimeout(resolve, 2000));
            }
            if (
              expiresAt < now &&
              all_users[key].in_channel &&
              !all_users[key].is_vip
            ) {
              await bot.telegram.kickChatMember(
                config_data.channel_id,
                all_users[key].user_id,
              );
              await bot.telegram.unbanChatMember(
                config_data.channel_id,
                all_users[key].user_id,
              );
              let new_data = await {
                ...all_users[key],
                in_channel: false,
                expires_at: null,
              };
              await put_user_data(all_users[key].user_id, new_data);
              await bot.telegram.sendMessage(
                all_users[key].user_id,
                "⏰ Abunəliyiniz Başa Çatdı!\n\nZəhmət olmasa /start Əmrini İstifadə Edərək Abunəliyinizi Yeniləyin və Özəl Məzmunlara Girişə Davam Edin!",
              );
              await bot.telegram.sendMessage(
                config_data.owner_id,
                `❌ User ${all_users[key].user_id} subscription expired and was removed from channel.`,
              );
              await new Promise((resolve) => setTimeout(resolve, 2000));
            }
          }
        } catch (error) {
          console.log(error);
        }
      });
    } catch (error) {
      console.log(error);
    }
  },
  24 * 60 * 60 * 1000,
); // 24 saatte bir çalışacak şekilde ayarlandı

initDb()
  .then(() => bot.launch())
  .then(() => console.log("Bot is running..."))
  .catch(async (error) => {
    console.log(error);
    try {
      await bot.telegram.sendMessage(
        config_data.owner_id,
        `❌ SQLite DB init xətası\n\n${error}\n\n#error`,
      );
    } catch (e) {}
    process.exit(1);
  });

// Graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
