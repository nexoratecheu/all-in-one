const locales = {
  az: {
    labels: {
      owner: "Bot Sahibi",
      admin: "Sahib",
      viewUser: "İstifadəçini Gör",
      lifetime: "Həmişəlik",
      weekly: "Həftəlik",
      days15: "15 Günlük",
      monthly: "Aylıq",
      months3: "3 Aylıq",
    },
    buttons: {
      invite: "🔗  Dəvət Et Pulsuz Al  🔗",
      vipChannel: "👑  VIP KANAL  👑",
      privateChat: "💋  Özəl Söhbət  💋",
      packages: "🍑  Paketlər  🍑",
      videoCall: "🥵  Video Zəng 🥵",
      wallet: "💸  Pulqabı  💸",
      home: "🏠  Ana Səhifə  🏠",
      language: "🌐  Dil  🌐",
      languageAz: "🇦🇿 Azərbaycan",
      languageTr: "🇹🇷 Türkçe",
      redirect: "🔐  Yönləndir (1/5)  🔐",
      done: "✅  Etdim  ✅",
      starAmount: "🌟  {amount} Ulduz  🌟",
      pocketBuy: "🍑  Paket {n} - {price}  🍑",
      showBuy: "🥵  Paket {n} - {price}  🥵",
      vipBuy: "👑  {label} - {price}  👑",
    },
    captions: {
      mainMenuSimple:
        "✋🏻 Salam Balam Xoş Gəldin!\n\n🔥 Tam Açıq Məzmunlar\n\n🥵 Video Zəng, Özəl Çəkilişlər\n\n✅ Pulsuz Giriş Fürsəti\n\n🔗 Dəvət Etdiyin Hər Nəfər Üçün {star_per_invite} 🌟 Qazan!",
      mainMenuFull:
        "✋🏻 Salam Balam Xoş Gəldin!\n\n👑 VIP Kanal Hər Gün Yeni Özəl Videolar\n\n🔥 Tam Açıq Məzmunlar\n\n🥵 Video Zəng, Özəl Çəkilişlər\n\n✅ Pulsuz Giriş Fürsəti\n\n🔗 Dəvət Etdiyin Hər Nəfər Üçün {star_per_invite} 🌟 Qazan!",
      joinRequest:
        "👋🏻 Salam Balam Xoş Gəldin\n\n🔞 Özəl Tam Açıq Videolarım, Şəkillərim, Arxivlərim, Video Zəng Yayımlarım Hamısı Premium Kanalımdadır!\n\n👇🏻 Məzmunlarımı Aşağıdakı Kanalda Görə Bilərsən!\n\n🔗 Kanal: [{channel_url}]\n\n⚠️ Diqqət Kanala Qoşulma İstəyinin Təsdiqlənməsi Üçün 5 Dəqiqə Ərzində Yönləndir Düyməsinə Toxunaraq 5 Dəfə Yönləndir!",
      contentMenu:
        "👑 VIP Kanal Hər Gün Yeni Özəl Videolar\n\n🍑 Paket 1: {p1_photos} Şəkil - Qiymət {p1_price}🌟\n\n🍑 Paket 2: {p2_videos} video - Qiymət {p2_price}🌟\n\n🍑 Paket 3: {p3_photos} Şəkil, {p3_videos} Video - Qiymət {p3_price}🌟\n\n🍑 Paket 4: {p4_photos} Şəkil, {p4_videos} Video - Qiymət {p4_price}🌟",
      showMenu:
        "👑 VIP Kanal Hər Gün Yeni Özəl Videolar\n\n🥵 Paket 1: 5 Dəqiqə Video Zəng - Qiymət {s1_price}🌟\n\n🥵 Paket 2: 10 Dəqiqə Video Zəng - Qiymət {s2_price}🌟\n\n🥵 Paket 3: 20 Dəqiqə Video Zəng - Qiymət {s3_price}🌟\n\n🥵 Paket 4: 30 Dəqiqə Video Zəng - Qiymət {s4_price}🌟",
      wallet:
        "💸 Hesab Balansı: {balance} 🌟\n\n➕ Dəvət Edilən Şəxs Sayı: {invite_count} Nəfər\n\n🔗 Dəvət Etdiyin Hər Nəfər Üçün {star_per_invite} 🌟 Qazan!\n\n🌟 İstədiyin Ulduz Miqdarına Toxunaraq Ulduz Satın Al",
      vipMenu:
        "👑 Həmişəlik - {lifetime} 🌟\n\n👑 Həftəlik - {weekly} 🌟\n\n👑 15 Günlük - {days15} 🌟\n\n👑 Aylıq - {monthly} 🌟\n\n👑 3 Aylıq - {months3} 🌟",
    },
    alerts: {
      insufficientBalance:
        "❌ Balans Çatışmır!\n\n🔗 Zəhmət olmasa Üzv Dəvət Edərək Ulduz Qazan!\n\n💸 Və Ya Pulqabına Ulduz Əlavə Et!",
      invalidPackage: "❌ Yanlış Paket Seçimi!",
      invalidOption: "❌ Geçersiz Seçenek!",
      languageOnlyAz:
        "Hazırda yalnız Azərbaycan dili aktivdir. Digər dillər tezliklə əlavə olunacaq.",
    },
    messages: {
      walletTopupSuccess:
        "✅ Pulqabına Ulduz Əlavə Edilməsi Uğurlu Oldu!\n\n🌟 Əlavə Olunan Ulduz Miqdarı: {amount}\n\n✅ Artıq Məzmunu Əldə Edə Bilərsən!",
      starBoughtOwner:
        "🌟 [İstifadəçi](tg://user?id={user_id}): {amount} Ulduz Satın Aldı \n\n#starbuyed",
      starNotAddedOwner: "❌ Ulduz Əlavə Edilmədi\n\n{error}\n\n#error",
      userDataReadFailOwner:
        "❌ İstifadəçi Məlumatları Alınamadı\n\n{error}\n\n#error",
      userDataWriteFailOwner:
        "❌ İstifadəçi Məlumatları Yazılmadı\n\n{error}\n\n#error",
      allUsersReadFailOwner:
        "❌ Bütün İstifadəçi Məlumatları Alınamadı\n\n{error}\n\n#error",
      invoiceSendFailOwner: "❌ Fatura Gönderilemedi\n\n{error}\n\n#error",
      startupFailOwner: "❌ Başlatma Xətası\n\n{error}\n\n#error",
      newUserJoinedOwner:
        "✅ Yeni İstifadəçi Qoşuldu!\n\n➕ Yeni İstifadəçi: [İstifadəçini Gör](tg://user?id={user_id})\n\n🔗 İstifadəçini Dəvət Etdi: [{inviter_label}](tg://user?id={inviter_id})\n\n#newuserjoined",
      inviteRewardUser:
        "✅ Təbriklər!\n\n🔗 Dəvət Etdiyin [İstifadəçini Gör](tg://user?id={new_user_id}) İstifadəçisi Botumuza Qoşuldu!\n\n🌟 {star_per_invite} Ulduz Qazandın!\n\n💸 İndiki Balans: {balance} 🌟",
      joinRequestSentOwner:
        "📢 Kanala Qoşulma İstəyi Üçün Mesaj Göndərildi\n\n#joinchannelmessage",
      joinRequestFailOwner: "❌Mesaj Göndərilmədi\n\n{error}\n\n#error",
      contentMenuFailOwner: "❌ Paketlər Menü Gönderəmedi\n\n{error}\n\n#error",
      showMenuFailOwner:
        "❌ Video Zəng Paketləri Menü Gönderəmedi\n\n{error}\n\n#error",
      homeMenuFailOwner: "❌ Ana Menü Gönderəmedi\n\n{error}\n\n#error",
      walletMenuFailOwner: "❌ Pulqabı Menü Gönderəmedi\n\n{error}\n\n#error",
      vipMenuFailOwner: "❌ VIP Kanal Menü Gönderəmedi\n\n{error}\n\n#error",
      vipAfterBuyFailOwner:
        "❌ VIP Kanal Satın Alma Sonrası Mesaj Gönderilemedi\n\n{error}\n\n#error",
      vipBuyFailOwner:
        "❌ VIP Kanal Satın Alma İşlemi Başarısız Oldu\n\n{error}\n\n#error",
      vipBoughtOwner:
        "✅ [İstifadəçini Gör](tg://user?id={user_id}) VIP KANAL Satın Aldı\n\n#{tag}",
      vipBoughtSuccess: "✅ Təbriklər VIP KANAL Uğurla Alındı!",
      vipPaymentSuccessWithInvite:
        "🎉 Ödəniş Uğurlu!\n\n⚠️ Diqqət Dəvət Linkini Paylaşma!\n\n👑 Dəvət Linki yalnız 1 Nəfər Üçün Keçərlidir!\n\n🔗 {invite_link}",
      pocketBoughtSuccess: "✅ Təbriklər Məzmun Uğurla Alındı!",
      pocketBoughtOwner:
        "✅ [İstifadəçini Gör](tg://user?id={user_id}) Poket{pocket} Satın Aldı",
      videoCallBoughtSuccess: "✅ Təbriklər Video Zəng Satın Alındı!",
      videoCallBoughtFollowup:
        "✅ Uğurla Alındı!\n\nİcra Edilməsi Üçün Özələ Yaz!",
      showBoughtOwner:
        "✅ [İstifadəçini Gör](tg://user?id={user_id}) Show Poket{pocket} Satın Aldı",
      chooseLanguage: "Zəhmət olmasa dili seçin:",
      languageSaved: "✅ Dil yadda saxlanıldı!",
      uploadSendPhoto: "Zəhmət olmasa Şəkil Göndərin",
      photoUploaded: "Şəkil Uğurla Yükləndi!",
      videoUploaded: "Video Uğurla Yükləndi!",
      myId: "Sənin ID-n: {id}",
      invoiceInvalidAmount:
        "Zəhmət olmasa düzgün məbləğ daxil edin. İstifadə: /invoice <amount_in_cents>",
      invoiceNotAuthorized: "Bu əmrdən istifadə etməyə icazən yoxdur.",
      invoiceDefaultTitle: "Invoice",
      invoiceDefaultDescription: "Invoice description",
      invoiceLink: "Invoice link: {link}",
      invoiceCreateFail: "Invoice link yaratmaq mümkün olmadı.",
      invoiceCreateFailOwner: "❌ Failed to create invoice link: {description}",
      invoiceCreateError: "Invoice link yaradılarkən xəta baş verdi.",
      invoiceCommandErrorOwner:
        "❌ Error in /invoice command for user {user_id}: {error}",
      dailyCheckOwner: "⏰ Running daily subscription check...",
      expiringSoonUser:
        "⏰ Abunəliyiniz Sabah Başa Çatır!\n\nDərhal /start Əmrini İstifadə Edərək Abunəliyinizi Yeniləyin və Özəl Məzmunlara Girişə Davam Edin!",
      expiringSoonOwner:
        "⚠️ Warning sent to user {user_id} about subscription expiring in 1 day.",
      expiredUser:
        "⏰ Abunəliyiniz Başa Çatdı!\n\nZəhmət olmasa /start Əmrini İstifadə Edərək Abunəliyinizi Yeniləyin və Özəl Məzmunlara Girişə Davam Edin!",
      expiredOwner:
        "❌ User {user_id} subscription expired and was removed from channel.",
      sqliteInitFailOwner: "❌ SQLite DB init xətası\n\n{error}\n\n#error",
      invoiceTitle: "Pulqabına Ulduz əlavə et",
      invoicePocketDescription:
        "Zəhmət olmasa Məzmuna Giriş Üçün Pulqabına {amount} Ulduz Əlavə Et",
      invoiceIncreaseDescription:
        "Zəhmət olmasa Pulqabına {amount} Ulduz Əlavə Etmək Üçün Ödəniş Et",
      invoiceItemLabel: "Item",
    },
  },
  tr: {
    labels: {
      owner: "Bot Sahibi",
      admin: "Sahip",
      viewUser: "Kullanıcıyı Gör",
      lifetime: "Ömürlük",
      weekly: "Haftalık",
      days15: "15 Günlük",
      monthly: "Aylık",
      months3: "3 Aylık",
    },
    buttons: {
      invite: "🔗  Davet Et Ücretsiz Al  🔗",
      vipChannel: "👑  VIP KANAL  👑",
      privateChat: "💋  Özel Sohbet  💋",
      packages: "🍑  Paketler  🍑",
      videoCall: "🥵  Görüntülü Arama 🥵",
      wallet: "💸  Cüzdan  💸",
      home: "🏠  Ana Sayfa  🏠",
      language: "🌐  Dil  🌐",
      languageAz: "🇦🇿 Azərbaycan",
      languageTr: "🇹🇷 Türkçe",
      redirect: "🔐  Yönlendir (1/5)  🔐",
      done: "✅  Yaptım  ✅",
      starAmount: "🌟  {amount} Yıldız  🌟",
      pocketBuy: "🍑  Paket {n} - {price}  🍑",
      showBuy: "🥵  Paket {n} - {price}  🥵",
      vipBuy: "👑  {label} - {price}  👑",
    },
    captions: {
      mainMenuSimple:
        "✋🏻 Merhaba Balam Hoş Geldin!\n\n🔥 Tam Açık İçerikler\n\n🥵 Görüntülü arama, özel çekimler\n\n✅ Ücretsiz giriş fırsatı\n\n🔗 Davet ettiğin her kişi için {star_per_invite} 🌟 kazan!",
      mainMenuFull:
        "✋🏻 Merhaba Balam Hoş Geldin!\n\n👑 VIP Kanal Her Gün Yeni Özel Videolar\n\n🔥 Tam Açık İçerikler\n\n🥵 Görüntülü arama, özel çekimler\n\n✅ Ücretsiz giriş fırsatı\n\n🔗 Davet ettiğin her kişi için {star_per_invite} 🌟 kazan!",
      joinRequest:
        "👋🏻 Merhaba Balam Hoş Geldin\n\n🔞 Özel tam açık videolarım, fotoğraflarım, arşivlerim ve görüntülü arama yayınlarımın hepsi Premium kanalımda!\n\n👇🏻 İçeriklerimi aşağıdaki kanalda görebilirsin!\n\n🔗 Kanal: [{channel_url}]\n\n⚠️ Dikkat: Kanala katılma isteğinin onaylanması için 5 dakika içinde “Yönlendir” düğmesine dokunarak 5 kez yönlendir!",
      contentMenu:
        "👑 VIP Kanal Her Gün Yeni Özel Videolar\n\n🍑 Paket 1: {p1_photos} Fotoğraf - Fiyat {p1_price}🌟\n\n🍑 Paket 2: {p2_videos} Video - Fiyat {p2_price}🌟\n\n🍑 Paket 3: {p3_photos} Fotoğraf, {p3_videos} Video - Fiyat {p3_price}🌟\n\n🍑 Paket 4: {p4_photos} Fotoğraf, {p4_videos} Video - Fiyat {p4_price}🌟",
      showMenu:
        "👑 VIP Kanal Her Gün Yeni Özel Videolar\n\n🥵 Paket 1: 5 Dakika Görüntülü Arama - Fiyat {s1_price}🌟\n\n🥵 Paket 2: 10 Dakika Görüntülü Arama - Fiyat {s2_price}🌟\n\n🥵 Paket 3: 20 Dakika Görüntülü Arama - Fiyat {s3_price}🌟\n\n🥵 Paket 4: 30 Dakika Görüntülü Arama - Fiyat {s4_price}🌟",
      wallet:
        "💸 Hesap Bakiyesi: {balance} 🌟\n\n➕ Davet edilen kişi sayısı: {invite_count}\n\n🔗 Davet ettiğin her kişi için {star_per_invite} 🌟 kazan!\n\n🌟 İstediğin yıldız miktarına dokunarak satın al",
      vipMenu:
        "👑 Ömürlük - {lifetime} 🌟\n\n👑 Haftalık - {weekly} 🌟\n\n👑 15 Günlük - {days15} 🌟\n\n👑 Aylık - {monthly} 🌟\n\n👑 3 Aylık - {months3} 🌟",
    },
    alerts: {
      insufficientBalance:
        "❌ Bakiye yetersiz!\n\n🔗 Lütfen üye davet ederek yıldız kazan!\n\n💸 Veya cüzdana yıldız ekle!",
      invalidPackage: "❌ Yanlış paket seçimi!",
      invalidOption: "❌ Geçersiz seçenek!",
      languageOnlyAz:
        "Şu anda yalnızca Azərbaycan dili aktif. Yakında Türkçe eklenecek.",
    },
    messages: {
      walletTopupSuccess:
        "✅ Cüzdana yıldız ekleme başarılı!\n\n🌟 Eklenen yıldız: {amount}\n\n✅ Artık içeriği alabilirsin!",
      starBoughtOwner:
        "🌟 [Kullanıcı](tg://user?id={user_id}): {amount} Yıldız satın aldı \n\n#starbuyed",
      starNotAddedOwner: "❌ Yıldız eklenemedi\n\n{error}\n\n#error",
      userDataReadFailOwner:
        "❌ Kullanıcı verisi alınamadı\n\n{error}\n\n#error",
      userDataWriteFailOwner:
        "❌ Kullanıcı verisi yazılamadı\n\n{error}\n\n#error",
      allUsersReadFailOwner:
        "❌ Tüm kullanıcı verileri alınamadı\n\n{error}\n\n#error",
      invoiceSendFailOwner: "❌ Fatura gönderilemedi\n\n{error}\n\n#error",
      startupFailOwner: "❌ Başlatma hatası\n\n{error}\n\n#error",
      newUserJoinedOwner:
        "✅ Yeni kullanıcı katıldı!\n\n➕ Yeni kullanıcı: [Kullanıcıyı Gör](tg://user?id={user_id})\n\n🔗 Davet eden: [{inviter_label}](tg://user?id={inviter_id})\n\n#newuserjoined",
      inviteRewardUser:
        "✅ Tebrikler!\n\n🔗 Davet ettiğin [Kullanıcıyı Gör](tg://user?id={new_user_id}) botumuza katıldı!\n\n🌟 {star_per_invite} Yıldız kazandın!\n\n💸 Güncel bakiye: {balance} 🌟",
      joinRequestSentOwner:
        "📢 Kanala katılma isteği için mesaj gönderildi\n\n#joinchannelmessage",
      joinRequestFailOwner: "❌ Mesaj gönderilemedi\n\n{error}\n\n#error",
      contentMenuFailOwner:
        "❌ Paket menüsü gönderilemedi\n\n{error}\n\n#error",
      showMenuFailOwner:
        "❌ Görüntülü arama paketleri menüsü gönderilemedi\n\n{error}\n\n#error",
      homeMenuFailOwner: "❌ Ana menü gönderilemedi\n\n{error}\n\n#error",
      walletMenuFailOwner:
        "❌ Cüzdan menüsü gönderilemedi\n\n{error}\n\n#error",
      vipMenuFailOwner:
        "❌ VIP kanal menüsü gönderilemedi\n\n{error}\n\n#error",
      vipAfterBuyFailOwner:
        "❌ VIP kanal satın alma sonrası mesaj gönderilemedi\n\n{error}\n\n#error",
      vipBuyFailOwner:
        "❌ VIP kanal satın alma işlemi başarısız\n\n{error}\n\n#error",
      vipBoughtOwner:
        "✅ [Kullanıcıyı Gör](tg://user?id={user_id}) VIP KANAL satın aldı\n\n#{tag}",
      vipBoughtSuccess: "✅ Tebrikler! VIP KANAL başarıyla alındı!",
      vipPaymentSuccessWithInvite:
        "🎉 Ödeme başarılı!\n\n⚠️ Dikkat: Davet linkini paylaşma!\n\n👑 Davet linki sadece 1 kişi için geçerlidir!\n\n🔗 {invite_link}",
      pocketBoughtSuccess: "✅ Tebrikler! İçerik başarıyla alındı!",
      pocketBoughtOwner:
        "✅ [Kullanıcıyı Gör](tg://user?id={user_id}) Poket{pocket} satın aldı",
      videoCallBoughtSuccess: "✅ Tebrikler! Görüntülü arama satın alındı!",
      videoCallBoughtFollowup:
        "✅ Başarıyla alındı!\n\nUygulanması için özelden yaz!",
      showBoughtOwner:
        "✅ [Kullanıcıyı Gör](tg://user?id={user_id}) Show Poket{pocket} satın aldı",
      chooseLanguage: "Lütfen dili seçin:",
      languageSaved: "✅ Dil kaydedildi!",
      uploadSendPhoto: "Lütfen fotoğraf gönderin",
      photoUploaded: "Fotoğraf başarıyla yüklendi!",
      videoUploaded: "Video başarıyla yüklendi!",
      myId: "Senin ID: {id}",
      invoiceInvalidAmount:
        "Lütfen geçerli bir tutar girin. Kullanım: /invoice <amount_in_cents>",
      invoiceNotAuthorized: "Bu komutu kullanmaya yetkin yok.",
      invoiceDefaultTitle: "Invoice",
      invoiceDefaultDescription: "Invoice description",
      invoiceLink: "Invoice link: {link}",
      invoiceCreateFail: "Invoice link oluşturulamadı.",
      invoiceCreateFailOwner: "❌ Failed to create invoice link: {description}",
      invoiceCreateError: "Invoice link oluşturulurken hata oluştu.",
      invoiceCommandErrorOwner:
        "❌ Error in /invoice command for user {user_id}: {error}",
      dailyCheckOwner: "⏰ Running daily subscription check...",
      expiringSoonUser:
        "⏰ Aboneliğiniz yarın bitiyor!\n\nHemen /start komutunu kullanarak aboneliğinizi yenileyin ve özel içeriklere erişmeye devam edin!",
      expiringSoonOwner:
        "⚠️ Warning sent to user {user_id} about subscription expiring in 1 day.",
      expiredUser:
        "⏰ Aboneliğiniz bitti!\n\nLütfen /start komutunu kullanarak aboneliğinizi yenileyin ve özel içeriklere erişmeye devam edin!",
      expiredOwner:
        "❌ User {user_id} subscription expired and was removed from channel.",
      sqliteInitFailOwner: "❌ SQLite DB init xətası\n\n{error}\n\n#error",
      invoiceTitle: "Cüzdana yıldız ekle",
      invoicePocketDescription:
        "Lütfen içeriğe erişmek için cüzdana {amount} yıldız ekle",
      invoiceIncreaseDescription:
        "Lütfen cüzdana {amount} yıldız eklemek için ödeme yap",
      invoiceItemLabel: "Item",
    },
  },
};

const getByPath = (obj, path) => {
  const parts = path.split(".");
  let current = obj;
  for (const part of parts) {
    if (!current || typeof current !== "object") return undefined;
    current = current[part];
  }
  return current;
};

const interpolate = (template, params) => {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    if (!(key in params)) return match;
    const value = params[key];
    if (value === null || value === undefined) return "";
    return String(value);
  });
};

const t = (lang, key, params) => {
  const table = locales[lang] || locales.az;
  const value = getByPath(table, key);
  if (typeof value === "string") return interpolate(value, params);
  if (lang && lang !== "az") {
    const fallback = getByPath(locales.az, key);
    if (typeof fallback === "string") return interpolate(fallback, params);
  }
  return key;
};

module.exports = { t };
