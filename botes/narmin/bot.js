const { Telegraf, session, Markup } = require("telegraf");
require("dotenv").config();
const axios = require("axios");
const config_data = require("./config.json");
const contect_data = require("./content.json");
const i18n = require("./i18n");
const cron = require("node-cron");
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
  try {
    await db.exec("ALTER TABLE users ADD COLUMN lang TEXT");
  } catch (e) {}
};

bot.use(session());
const getCtxUserId = (ctx) =>
  ctx?.from?.id ??
  ctx?.message?.from?.id ??
  ctx?.chatJoinRequest?.from?.id ??
  null;
const supportedLangs = new Set(["az", "tr", "en", "ru", "de", "id", "ar"]);
const normalizeLang = (value) => {
  const v = typeof value === "string" ? value.toLowerCase() : "";
  return supportedLangs.has(v) ? v : "az";
};
bot.use(async (ctx, next) => {
  if (!ctx.session) ctx.session = {};
  const userId = getCtxUserId(ctx);
  if (!ctx.session.lang) {
    let storedLang = null;
    if (userId) {
      const user = await get_user_data(userId);
      storedLang = user && typeof user.lang === "string" ? user.lang : null;
      const normalized = normalizeLang(storedLang);
      ctx.session.lang = normalized;
      if (user && normalizeLang(user.lang) !== user.lang) {
        await put_user_data(userId, { ...user, lang: normalized });
      }
    } else {
      ctx.session.lang = "az";
    }
  } else {
    ctx.session.lang = normalizeLang(ctx.session.lang);
  }
  ctx.t = (key, params) => i18n.t(ctx.session.lang, key, params);
  return next();
});

const t = (ctx, key, params) =>
  ctx && typeof ctx.t === "function"
    ? ctx.t(key, params)
    : i18n.t("az", key, params);

const getInviteUrl = (userId) =>
  `https://t.me/share/url?url=${encodeURIComponent(`https://t.me/${config_data.bot_username}?start=${userId}`)}`;

const buildMainMenuButtons = (ctx, userId) =>
  Markup.inlineKeyboard([
    [Markup.button.url(t(ctx, "buttons.invite"), getInviteUrl(userId))],
    [Markup.button.callback(t(ctx, "buttons.vipChannel"), "wip_channel")],
    [
      Markup.button.url(
        t(ctx, "buttons.privateChat"),
        "https://t.me/narmin_alyvaa",
      ),
    ],
    [
      Markup.button.callback(t(ctx, "buttons.packages"), "content"),
      Markup.button.callback(t(ctx, "buttons.videoCall"), "show"),
    ],
    [Markup.button.callback(t(ctx, "buttons.wallet"), "wallet")],
    [Markup.button.callback(t(ctx, "buttons.language"), "language")],
  ]);

const getMainMenuCaption = (ctx, variant) => {
  const key =
    variant === "full" ? "captions.mainMenuFull" : "captions.mainMenuSimple";
  return t(ctx, key, { star_per_invite: config_data.star_per_invite });
};
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
      t(ctx, "messages.walletTopupSuccess", {
        amount: ctx.message.successful_payment.total_amount,
      }),
    );
    let main_menu_buttons = buildMainMenuButtons(ctx, ctx.from.id);
    await ctx.replyWithPhoto(config_data.profile_photo_id, {
      caption: getMainMenuCaption(ctx, "simple"),
      parse_mode: "Markdown",
      ...main_menu_buttons,
    });
    await bot.telegram.sendMessage(
      config_data.owner_id,
      t(null, "messages.starBoughtOwner", {
        user_id: ctx.from.id,
        amount: ctx.message.successful_payment.total_amount,
      }),
      { parse_mode: "Markdown" },
    );
  } catch (error) {
    bot.telegram.sendMessage(
      config_data.owner_id,
      t(null, "messages.starNotAddedOwner", { error }),
    );
    console.log(error);
  }
});
const get_user_data = async (user_id) => {
  try {
    const db = await dbPromise;
    const row = await db.get("SELECT data, lang FROM users WHERE user_id = ?", [
      user_id,
    ]);
    if (!row) return null;
    const parsed = JSON.parse(row.data);
    if (!parsed.lang && row.lang) parsed.lang = row.lang;
    return parsed;
  } catch (error) {
    console.log(error);
    bot.telegram.sendMessage(
      config_data.owner_id,
      t(null, "messages.userDataReadFailOwner", { error }),
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
    const lang =
      data && typeof data.lang === "string" ? normalizeLang(data.lang) : null;
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
         lang,
         data,
         updated_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         invite_from = excluded.invite_from,
         user_balance = excluded.user_balance,
         user_invites = excluded.user_invites,
         is_vip = excluded.is_vip,
         expires_at = excluded.expires_at,
         joined_at = excluded.joined_at,
         in_channel = excluded.in_channel,
         lang = excluded.lang,
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
        lang,
        payload,
        now,
      ],
    );
  } catch (error) {
    console.log(error);
    bot.telegram.sendMessage(
      config_data.owner_id,
      t(null, "messages.userDataWriteFailOwner", { error }),
    );
  }
};
const get_all_data = async () => {
  try {
    const db = await dbPromise;
    const rows = await db.all("SELECT user_id, data, lang FROM users");
    const all_data = {};
    for (const row of rows) {
      try {
        const parsed = JSON.parse(row.data);
        if (!parsed.lang && row.lang) parsed.lang = row.lang;
        all_data[row.user_id] = parsed;
      } catch (e) {
        all_data[row.user_id] = {};
      }
    }
    return all_data;
  } catch (error) {
    console.log(error);
    bot.telegram.sendMessage(
      config_data.owner_id,
      t(null, "messages.allUsersReadFailOwner", { error }),
    );
    return {};
  }
};
const send_invoice_for_pocket = async (ctx, amount) => {
  try {
    let invoice = {
      title: t(ctx, "messages.invoiceTitle"),
      description: t(ctx, "messages.invoicePocketDescription", { amount }),
      payload: "invoice_payload",
      start_parameter: "start",
      currency: "XTR",
      prices: [{ label: t(ctx, "messages.invoiceItemLabel"), amount: amount }],
    };
    await ctx.replyWithInvoice(invoice);
  } catch (error) {
    console.log(error);
    bot.telegram.sendMessage(
      config_data.owner_id,
      t(null, "messages.invoiceSendFailOwner", { error }),
    );
  }
};
const send_invoice_for_increase = async (ctx, amount) => {
  try {
    let invoice = {
      title: t(ctx, "messages.invoiceTitle"),
      description: t(ctx, "messages.invoiceIncreaseDescription", { amount }),
      payload: "invoice_payload",
      start_parameter: "start",
      currency: "XTR",
      prices: [{ label: t(ctx, "messages.invoiceItemLabel"), amount: amount }],
    };
    await ctx.replyWithInvoice(invoice);
  } catch (error) {
    console.log(error);
    bot.telegram.sendMessage(
      config_data.owner_id,
      t(null, "messages.invoiceSendFailOwner", { error }),
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
        lang: ctx.session.lang,
      });
      await bot.telegram.sendMessage(
        config_data.owner_id,
        t(null, "messages.newUserJoinedOwner", {
          user_id,
          inviter_label:
            invite_from_id == config_data.owner_id
              ? t(ctx, "labels.owner")
              : invite_from_id == undefined
                ? t(ctx, "labels.admin")
                : t(ctx, "labels.viewUser"),
          inviter_id:
            invite_from_id == undefined ? config_data.owner_id : invite_from_id,
        }),
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
          const inviterLang =
            user_data && typeof user_data.lang === "string"
              ? user_data.lang
              : "az";
          await bot.telegram.sendMessage(
            invite_from_id,
            i18n.t(inviterLang, "messages.inviteRewardUser", {
              new_user_id: ctx.from.id,
              star_per_invite: config_data.star_per_invite,
              balance: new_data.user_balance,
            }),
            { parse_mode: "Markdown" },
          );
        }
      }
    } else {
    }
    let main_menu_buttons = buildMainMenuButtons(ctx, user_id);
    await ctx.replyWithPhoto(config_data.profile_photo_id, {
      caption: getMainMenuCaption(ctx, "full"),
      parse_mode: "Markdown",
      ...main_menu_buttons,
    });
  } catch (error) {
    console.log(error);
    bot.telegram.sendMessage(
      config_data.owner_id,
      t(null, "messages.startupFailOwner", { error }),
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
            t(ctx, "buttons.redirect"),
            `https://t.me/share/url?url=${encodeURIComponent(`${config_data.channel_url}`)}`,
          ),
        ],
        [
          Markup.button.url(
            t(ctx, "buttons.done"),
            `https://t.me/${config_data.bot_username}?start=start`,
          ),
        ],
      ]);
      await bot.telegram.sendPhoto(userId, config_data.profile_photo_id, {
        caption: t(ctx, "captions.joinRequest", {
          channel_url: config_data.channel_url,
        }),
        parse_mode: "Markdown",
        ...main_menu_buttons,
      });

      await bot.telegram.sendMessage(
        config_data.owner_id,
        t(null, "messages.joinRequestSentOwner"),
      );
    }
  } catch (error) {
    bot.telegram.sendMessage(
      config_data.owner_id,
      t(null, "messages.joinRequestFailOwner", { error }),
    );
  }
});
bot.action("content", async (ctx) => {
  try {
    const content_menu_buttons = Markup.inlineKeyboard([
      [Markup.button.url(t(ctx, "buttons.invite"), getInviteUrl(ctx.from.id))],
      [Markup.button.callback(t(ctx, "buttons.vipChannel"), "wip_channel")],
      [
        Markup.button.callback(
          t(ctx, "buttons.pocketBuy", {
            n: 1,
            price: contect_data.pocket_1.price,
          }),
          "pocket_1",
        ),
        Markup.button.callback(
          t(ctx, "buttons.pocketBuy", {
            n: 2,
            price: contect_data.pocket_2.price,
          }),
          "pocket_2",
        ),
      ],
      [
        Markup.button.callback(
          t(ctx, "buttons.pocketBuy", {
            n: 3,
            price: contect_data.pocket_3.price,
          }),
          "pocket_3",
        ),
        Markup.button.callback(
          t(ctx, "buttons.pocketBuy", {
            n: 4,
            price: contect_data.pocket_4.price,
          }),
          "pocket_4",
        ),
      ],
      [Markup.button.callback(t(ctx, "buttons.wallet"), "wallet")],
      [Markup.button.callback(t(ctx, "buttons.home"), "home")],
    ]);
    await ctx.editMessageMedia(
      {
        type: "photo",
        media: config_data.profile_photo_id,
        caption: t(ctx, "captions.contentMenu", {
          p1_photos: contect_data.pocket_1.photo.length,
          p1_price: contect_data.pocket_1.price,
          p2_videos: contect_data.pocket_2.video.length,
          p2_price: contect_data.pocket_2.price,
          p3_photos: contect_data.pocket_3.photo.length,
          p3_videos: contect_data.pocket_3.video.length,
          p3_price: contect_data.pocket_3.price,
          p4_photos: contect_data.pocket_4.photo.length,
          p4_videos: contect_data.pocket_4.video.length,
          p4_price: contect_data.pocket_4.price,
        }),
      },
      content_menu_buttons,
    );
    ctx.answerCbQuery();
  } catch (error) {
    console.log(error);
    bot.telegram.sendMessage(
      config_data.owner_id,
      t(null, "messages.contentMenuFailOwner", { error }),
    );
  }
});
bot.action("show", async (ctx) => {
  try {
    const show_menu_buttons = Markup.inlineKeyboard([
      [Markup.button.url(t(ctx, "buttons.invite"), getInviteUrl(ctx.from.id))],
      [Markup.button.callback(t(ctx, "buttons.vipChannel"), "wip_channel")],
      [
        Markup.button.callback(
          t(ctx, "buttons.showBuy", {
            n: 1,
            price: contect_data.s_pocket_1.price,
          }),
          "show_1",
        ),
        Markup.button.callback(
          t(ctx, "buttons.showBuy", {
            n: 2,
            price: contect_data.s_pocket_2.price,
          }),
          "show_2",
        ),
      ],
      [
        Markup.button.callback(
          t(ctx, "buttons.showBuy", {
            n: 3,
            price: contect_data.s_pocket_3.price,
          }),
          "show_3",
        ),
        Markup.button.callback(
          t(ctx, "buttons.showBuy", {
            n: 4,
            price: contect_data.s_pocket_4.price,
          }),
          "show_4",
        ),
      ],
      [Markup.button.callback(t(ctx, "buttons.home"), "home")],
    ]);
    await ctx.editMessageMedia(
      {
        type: "photo",
        media: config_data.profile_photo_id,
        caption: t(ctx, "captions.showMenu", {
          s1_price: contect_data.s_pocket_1.price,
          s2_price: contect_data.s_pocket_2.price,
          s3_price: contect_data.s_pocket_3.price,
          s4_price: contect_data.s_pocket_4.price,
        }),
      },
      show_menu_buttons,
    );
    ctx.answerCbQuery();
  } catch (error) {
    console.log(error);
    bot.telegram.sendMessage(
      config_data.owner_id,
      t(null, "messages.showMenuFailOwner", { error }),
    );
  }
});
bot.action("home", async (ctx) => {
  try {
    const home_menu_buttons = buildMainMenuButtons(ctx, ctx.from.id);
    await ctx.editMessageMedia(
      {
        type: "photo",
        media: config_data.profile_photo_id,
        caption: getMainMenuCaption(ctx, "full"),
      },
      home_menu_buttons,
    );
    ctx.answerCbQuery();
  } catch (error) {
    console.log(error);
    bot.telegram.sendMessage(
      config_data.owner_id,
      t(null, "messages.homeMenuFailOwner", { error }),
    );
  }
});
bot.action("wallet", async (ctx) => {
  try {
    const user_data = await get_user_data(ctx.from.id);
    const wallet_menu_buttons = Markup.inlineKeyboard([
      [Markup.button.url(t(ctx, "buttons.invite"), getInviteUrl(ctx.from.id))],
      [Markup.button.callback(t(ctx, "buttons.vipChannel"), "wip_channel")],
      [
        Markup.button.callback(
          t(ctx, "buttons.starAmount", { amount: 1 }),
          "buy_1",
        ),
        Markup.button.callback(
          t(ctx, "buttons.starAmount", { amount: 100 }),
          "buy_100",
        ),
      ],
      [
        Markup.button.callback(
          t(ctx, "buttons.starAmount", { amount: 250 }),
          "buy_250",
        ),
        Markup.button.callback(
          t(ctx, "buttons.starAmount", { amount: 500 }),
          "buy_500",
        ),
      ],
      [
        Markup.button.callback(
          t(ctx, "buttons.starAmount", { amount: 1000 }),
          "buy_1000",
        ),
        Markup.button.callback(
          t(ctx, "buttons.starAmount", { amount: 2500 }),
          "buy_2500",
        ),
      ],
      [Markup.button.callback(t(ctx, "buttons.home"), "home")],
    ]);
    await ctx.editMessageMedia(
      {
        type: "photo",
        media: config_data.profile_photo_id,
        caption: t(ctx, "captions.wallet", {
          balance: user_data.user_balance,
          invite_count: user_data.user_invites.length,
          star_per_invite: config_data.star_per_invite,
        }),
      },
      wallet_menu_buttons,
    );
    ctx.answerCbQuery();
  } catch (error) {
    console.log(error);
    bot.telegram.sendMessage(
      config_data.owner_id,
      t(null, "messages.walletMenuFailOwner", { error }),
    );
  }
});
bot.action("wip_channel", async (ctx) => {
  try {
    const content_wip_menu_buttons = Markup.inlineKeyboard([
      [
        Markup.button.callback(
          t(ctx, "buttons.vipBuy", {
            label: t(ctx, "labels.lifetime"),
            price: contect_data.wip_channel_price_lifetime,
          }),
          `buy_wip_channel_lifetime`,
        ),
      ],
      [
        Markup.button.callback(
          t(ctx, "buttons.vipBuy", {
            label: t(ctx, "labels.weekly"),
            price: contect_data.wip_channel_price_weekly,
          }),
          `buy_wip_channel_weekly`,
        ),
        Markup.button.callback(
          t(ctx, "buttons.vipBuy", {
            label: t(ctx, "labels.days15"),
            price: contect_data.wip_channel_price_15days,
          }),
          `buy_wip_channel_15days`,
        ),
      ],
      [
        Markup.button.callback(
          t(ctx, "buttons.vipBuy", {
            label: t(ctx, "labels.monthly"),
            price: contect_data.wip_channel_price_monthly,
          }),
          `buy_wip_channel_monthly`,
        ),
        Markup.button.callback(
          t(ctx, "buttons.vipBuy", {
            label: t(ctx, "labels.months3"),
            price: contect_data.wip_channel_price_3monthly,
          }),
          `buy_wip_channel_3monthly`,
        ),
      ],
      [Markup.button.callback(t(ctx, "buttons.wallet"), "wallet")],
      [Markup.button.callback(t(ctx, "buttons.home"), "home")],
    ]);
    await ctx.editMessageMedia(
      {
        type: "photo",
        media: config_data.profile_photo_id,
        caption: t(ctx, "captions.vipMenu", {
          lifetime: contect_data.wip_channel_price_lifetime,
          weekly: contect_data.wip_channel_price_weekly,
          days15: contect_data.wip_channel_price_15days,
          monthly: contect_data.wip_channel_price_monthly,
          months3: contect_data.wip_channel_price_3monthly,
        }),
      },
      content_wip_menu_buttons,
    );
    ctx.answerCbQuery();
  } catch (error) {
    console.log(error);
    bot.telegram.sendMessage(
      config_data.owner_id,
      t(null, "messages.vipMenuFailOwner", { error }),
    );
  }
});
bot.action(/buy_wip_channel_(.+)/, async (ctx) => {
  try {
    const type = ctx.match[1];
    const plans = {
      lifetime: {
        price: contect_data.wip_channel_price_lifetime,
        is_vip: true,
        expires_at: null,
        tag: "vipchannelbuyedlifetime",
      },
      weekly: {
        price: contect_data.wip_channel_price_weekly,
        is_vip: false,
        expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000,
        tag: "vipchannelbuyedweekly",
      },
      "15days": {
        price: contect_data.wip_channel_price_15days,
        is_vip: false,
        expires_at: Date.now() + 15 * 24 * 60 * 60 * 1000,
        tag: "vipchannelbuyed15days",
      },
      monthly: {
        price: contect_data.wip_channel_price_monthly,
        is_vip: false,
        expires_at: Date.now() + 30 * 24 * 60 * 60 * 1000,
        tag: "vipchannelbuyedmonthly",
      },
      "3monthly": {
        price: contect_data.wip_channel_price_3monthly,
        is_vip: false,
        expires_at: Date.now() + 90 * 24 * 60 * 60 * 1000,
        tag: "vipchannelbuyed3monthly",
      },
    };

    const plan = plans[type];
    if (!plan) {
      await ctx.answerCbQuery(t(ctx, "alerts.invalidOption"), {
        show_alert: true,
      });
      return;
    }

    const user_data = await get_user_data(ctx.from.id);
    if (user_data.user_balance < plan.price) {
      await ctx.answerCbQuery(t(ctx, "alerts.insufficientBalance"), {
        show_alert: true,
      });
      await send_invoice_for_pocket(ctx, plan.price - user_data.user_balance);
      return;
    }

    const geted_user_data = await get_user_data(ctx.from.id);
    let new_data = await {
      ...geted_user_data,
      user_balance: geted_user_data.user_balance - plan.price,
      is_vip: plan.is_vip,
      expires_at: plan.is_vip ? false : plan.expires_at,
      joined_at: Date.now(),
      in_channel: true,
    };
    await put_user_data(ctx.from.id, new_data);

    await bot.telegram.sendMessage(
      config_data.owner_id,
      t(null, "messages.vipBoughtOwner", {
        user_id: ctx.from.id,
        tag: plan.tag,
      }),
      { parse_mode: "Markdown" },
    );

    await ctx.answerCbQuery(t(ctx, "messages.vipBoughtSuccess"));

    const inviteLink = await ctx.telegram.createChatInviteLink(
      config_data.channel_id,
      {
        member_limit: 1,
        expire_date: Math.floor(Date.now() / 1000) + 600,
      },
    );

    await ctx.reply(
      t(ctx, "messages.vipPaymentSuccessWithInvite", {
        invite_link: inviteLink.invite_link,
      }),
    );

    setTimeout(async () => {
      try {
        const main_menu_buttons = buildMainMenuButtons(ctx, ctx.from.id);
        await ctx.replyWithPhoto(config_data.profile_photo_id, {
          caption: getMainMenuCaption(ctx, "full"),
          parse_mode: "Markdown",
          ...main_menu_buttons,
        });
      } catch (error) {
        console.log(error);
        bot.telegram.sendMessage(
          config_data.owner_id,
          t(null, "messages.vipAfterBuyFailOwner", { error }),
        );
      }
    }, 5000);
  } catch (error) {
    console.log(error);
    bot.telegram.sendMessage(
      config_data.owner_id,
      t(null, "messages.vipBuyFailOwner", { error }),
    );
  }
});
bot.action(/pocket_(.+)/, async (ctx) => {
  const pocket = ctx.match[1];
  const user_data = await get_user_data(ctx.from.id);

  switch (pocket) {
    case "1":
      if (user_data.user_balance < contect_data.pocket_1.price) {
        await ctx.answerCbQuery(t(ctx, "alerts.insufficientBalance"), {
          show_alert: true,
        });
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
          t(null, "messages.pocketBoughtOwner", {
            user_id: ctx.from.id,
            pocket: 1,
          }),
          { parse_mode: "Markdown" },
        );
        await ctx.answerCbQuery(t(ctx, "messages.pocketBoughtSuccess"));
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
            let main_menu_buttons = buildMainMenuButtons(ctx, ctx.from.id);
            await ctx.replyWithPhoto(config_data.profile_photo_id, {
              caption: getMainMenuCaption(ctx, "full"),
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
        await ctx.answerCbQuery(t(ctx, "alerts.insufficientBalance"), {
          show_alert: true,
        });
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
        await ctx.answerCbQuery(t(ctx, "messages.pocketBoughtSuccess"));
        await bot.telegram.sendMessage(
          config_data.owner_id,
          t(null, "messages.pocketBoughtOwner", {
            user_id: ctx.from.id,
            pocket: 2,
          }),
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
            let main_menu_buttons = buildMainMenuButtons(ctx, ctx.from.id);
            await ctx.replyWithPhoto(config_data.profile_photo_id, {
              caption: getMainMenuCaption(ctx, "full"),
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
        await ctx.answerCbQuery(t(ctx, "alerts.insufficientBalance"), {
          show_alert: true,
        });
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
        await ctx.answerCbQuery(t(ctx, "messages.pocketBoughtSuccess"));
        await bot.telegram.sendMessage(
          config_data.owner_id,
          t(null, "messages.pocketBoughtOwner", {
            user_id: ctx.from.id,
            pocket: 3,
          }),
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
              let main_menu_buttons = buildMainMenuButtons(ctx, ctx.from.id);
              await ctx.replyWithPhoto(config_data.profile_photo_id, {
                caption: getMainMenuCaption(ctx, "full"),
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
        await ctx.answerCbQuery(t(ctx, "alerts.insufficientBalance"), {
          show_alert: true,
        });
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
        await ctx.answerCbQuery(t(ctx, "messages.pocketBoughtSuccess"));
        await bot.telegram.sendMessage(
          config_data.owner_id,
          t(null, "messages.pocketBoughtOwner", {
            user_id: ctx.from.id,
            pocket: 4,
          }),
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
              let main_menu_buttons = buildMainMenuButtons(ctx, ctx.from.id);
              await ctx.replyWithPhoto(config_data.profile_photo_id, {
                caption: getMainMenuCaption(ctx, "full"),
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
      await ctx.answerCbQuery(t(ctx, "alerts.invalidPackage"), {
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
          await ctx.answerCbQuery(t(ctx, "alerts.insufficientBalance"), {
            show_alert: true,
          });
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
          await ctx.answerCbQuery(t(ctx, "messages.videoCallBoughtSuccess"));
          await ctx.reply(t(ctx, "messages.videoCallBoughtFollowup"));
          await bot.telegram.sendMessage(
            config_data.owner_id,
            t(null, "messages.showBoughtOwner", {
              user_id: ctx.from.id,
              pocket: 1,
            }),
            { parse_mode: "Markdown" },
          );
        }
        break;
      case "2":
        if (user_data.user_balance < contect_data.s_pocket_2.price) {
          await ctx.answerCbQuery(t(ctx, "alerts.insufficientBalance"), {
            show_alert: true,
          });
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
          await ctx.answerCbQuery(t(ctx, "messages.videoCallBoughtSuccess"));
          await ctx.reply(t(ctx, "messages.videoCallBoughtFollowup"));
          await bot.telegram.sendMessage(
            config_data.owner_id,
            t(null, "messages.showBoughtOwner", {
              user_id: ctx.from.id,
              pocket: 2,
            }),
            { parse_mode: "Markdown" },
          );
        }
        break;
      case "3":
        if (user_data.user_balance < contect_data.s_pocket_3.price) {
          await ctx.answerCbQuery(t(ctx, "alerts.insufficientBalance"), {
            show_alert: true,
          });
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
          await ctx.answerCbQuery(t(ctx, "messages.videoCallBoughtSuccess"));
          await ctx.reply(t(ctx, "messages.videoCallBoughtFollowup"));
          await bot.telegram.sendMessage(
            config_data.owner_id,
            t(null, "messages.showBoughtOwner", {
              user_id: ctx.from.id,
              pocket: 3,
            }),
            { parse_mode: "Markdown" },
          );
        }
        break;
      case "4":
        if (user_data.user_balance < contect_data.s_pocket_4.price) {
          await ctx.answerCbQuery(t(ctx, "alerts.insufficientBalance"), {
            show_alert: true,
          });
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
          await ctx.answerCbQuery(t(ctx, "messages.videoCallBoughtSuccess"));
          await ctx.reply(t(ctx, "messages.videoCallBoughtFollowup"));
          await bot.telegram.sendMessage(
            config_data.owner_id,
            t(null, "messages.showBoughtOwner", {
              user_id: ctx.from.id,
              pocket: 4,
            }),
            { parse_mode: "Markdown" },
          );
        }
        break;
      default:
        await ctx.answerCbQuery(t(ctx, "alerts.invalidPackage"), {
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

bot.action("language", async (ctx) => {
  try {
    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback(t(ctx, "buttons.languageAz"), "set_lang_az"),
        Markup.button.callback(t(ctx, "buttons.languageTr"), "set_lang_tr"),
      ],
      [
        Markup.button.callback(t(ctx, "buttons.languageEn"), "set_lang_en"),
        Markup.button.callback(t(ctx, "buttons.languageRu"), "set_lang_ru"),
      ],
      [
        Markup.button.callback(t(ctx, "buttons.languageDe"), "set_lang_de"),
        Markup.button.callback(t(ctx, "buttons.languageId"), "set_lang_id"),
      ],
      [Markup.button.callback(t(ctx, "buttons.languageAr"), "set_lang_ar")],
      [Markup.button.callback(t(ctx, "buttons.home"), "home")],
    ]);
    await ctx.answerCbQuery();
    await ctx.editMessageMedia(
      {
        type: "photo",
        media: config_data.profile_photo_id,
        caption: t(ctx, "messages.chooseLanguage"),
        parse_mode: "Markdown",
      },
      keyboard,
    );
  } catch (error) {
    console.log(error);
  }
});

bot.action(/set_lang_(az|tr|en|ru|de|id|ar)/, async (ctx) => {
  try {
    const selected = normalizeLang(ctx.match[1]);
    ctx.session.lang = selected;

    const userId = ctx.from.id;
    const user = await get_user_data(userId);
    const updated = user
      ? { ...user, lang: selected }
      : {
          user_id: userId,
          invite_from: config_data.owner_id,
          user_balance: 0,
          user_invites: [config_data.owner_id],
          lang: selected,
          in_channel: false,
        };
    await put_user_data(userId, updated);

    await ctx.answerCbQuery(t(ctx, "messages.languageSaved"));

    const main_menu_buttons = buildMainMenuButtons(ctx, userId);
    await ctx.editMessageMedia(
      {
        type: "photo",
        media: config_data.profile_photo_id,
        caption: getMainMenuCaption(ctx, "full"),
        parse_mode: "Markdown",
      },
      main_menu_buttons,
    );
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
    await ctx.reply(t(ctx, "messages.uploadSendPhoto"));
  }
});
bot.command("invoice", async (ctx) => {
  try {
    const TELEGRAM_API_URL = `https://api.telegram.org/bot${process.env.TOKEN}/createInvoiceLink`;
    const amount = parseInt(ctx.message.text.split(" ")[1]);
    const title =
      ctx.message.text.split(" ")[2] || t(ctx, "messages.invoiceDefaultTitle");
    const description =
      ctx.message.text.split(" ")[3] ||
      t(ctx, "messages.invoiceDefaultDescription");
    if (isNaN(amount)) {
      await ctx.reply(t(ctx, "messages.invoiceInvalidAmount"));
      return;
    }
    if (ctx.from.id != config_data.owner_id) {
      await ctx.reply(t(ctx, "messages.invoiceNotAuthorized"));
      return;
    }
    const invoice = {
      title: title,
      description: description,
      payload: "unique-payload-identifier",
      currency: "XTR",
      prices: [{ label: t(ctx, "messages.invoiceItemLabel"), amount: amount }],
    };
    await axios
      .post(TELEGRAM_API_URL, invoice)
      .then((response) => {
        if (response.data.ok) {
          ctx.reply(
            t(ctx, "messages.invoiceLink", { link: response.data.result }),
          );
        } else {
          ctx.reply(t(ctx, "messages.invoiceCreateFail"));
          bot.telegram.sendMessage(
            config_data.owner_id,
            t(null, "messages.invoiceCreateFailOwner", {
              description: response.data.description,
            }),
          );
        }
      })
      .catch((error) => {
        console.log(error);
        ctx.reply(t(ctx, "messages.invoiceCreateError"));
        bot.telegram.sendMessage(
          config_data.owner_id,
          t(null, "messages.invoiceCommandErrorOwner", {
            user_id: ctx.from.id,
            error,
          }),
        );
      });
  } catch (error) {
    console.log(error);
    bot.telegram.sendMessage(
      config_data.owner_id,
      t(null, "messages.invoiceCommandErrorOwner", {
        user_id: ctx.from.id,
        error,
      }),
    );
  }
});
bot.command("myid", async (ctx) => {
  try {
    await ctx.reply(t(ctx, "messages.myId", { id: ctx.from.id }));
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
      await ctx.reply(t(ctx, "messages.photoUploaded"));
      return;
    }

    let main_menu_buttons = buildMainMenuButtons(ctx, ctx.from.id);
    await ctx.replyWithPhoto(config_data.profile_photo_id, {
      caption: getMainMenuCaption(ctx, "simple"),
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
      await ctx.reply(t(ctx, "messages.videoUploaded"));
      return;
    } else {
    }

    let main_menu_buttons = buildMainMenuButtons(ctx, ctx.from.id);
    await ctx.replyWithPhoto(config_data.profile_photo_id, {
      caption: getMainMenuCaption(ctx, "simple"),
      parse_mode: "Markdown",
      ...main_menu_buttons,
    });
  } catch (error) {
    console.log(error);
  }
});

bot.on("text", async (ctx) => {
  try {
    let main_menu_buttons = buildMainMenuButtons(ctx, ctx.from.id);
    await ctx.replyWithPhoto(config_data.profile_photo_id, {
      caption: getMainMenuCaption(ctx, "full"),
      parse_mode: "Markdown",
      ...main_menu_buttons,
    });
  } catch (error) {
    console.log(error);
  }
});

let dailyCheckRunning = false;
const runDailySubscriptionCheck = async () => {
  if (dailyCheckRunning) return;
  dailyCheckRunning = true;
  try {
    await bot.telegram.sendMessage(
      config_data.owner_id,
      t(null, "messages.dailyCheckOwner"),
    );
    const now = Date.now();
    const all_users = await get_all_data();
    for (const key of Object.keys(all_users)) {
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
            const userLang =
              all_users[key] && typeof all_users[key].lang === "string"
                ? all_users[key].lang
                : "az";
            await bot.telegram.sendMessage(
              all_users[key].user_id,
              i18n.t(userLang, "messages.expiringSoonUser"),
            );
            await bot.telegram.sendMessage(
              config_data.owner_id,
              t(null, "messages.expiringSoonOwner", {
                user_id: all_users[key].user_id,
              }),
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
            const userLang =
              all_users[key] && typeof all_users[key].lang === "string"
                ? all_users[key].lang
                : "az";
            await bot.telegram.sendMessage(
              all_users[key].user_id,
              i18n.t(userLang, "messages.expiredUser"),
            );
            await bot.telegram.sendMessage(
              config_data.owner_id,
              t(null, "messages.expiredOwner", {
                user_id: all_users[key].user_id,
              }),
            );
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        }
      } catch (error) {
        console.log(error);
      }
    }
  } catch (error) {
    console.log(error);
  } finally {
    dailyCheckRunning = false;
  }
};

const startCronJobs = () => {
  cron.schedule("0 0 * * *", runDailySubscriptionCheck);
};

initDb()
  .then(() => bot.launch())
  .then(() => {
    startCronJobs();
    console.log("Bot is running...");
  })
  .catch(async (error) => {
    console.log(error);
    try {
      await bot.telegram.sendMessage(
        config_data.owner_id,
        t(null, "messages.sqliteInitFailOwner", { error }),
      );
    } catch (e) {}
    process.exit(1);
  });

// Graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
