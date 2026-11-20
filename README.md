# Dükkân Berber

Tek dükkân, 3–4 koltuk için randevu yönetimi. Müşteri hesabı yok; müşteri isim + telefonla randevu alır, WhatsApp koduyla randevusunu görür ve iptal eder.

## Kurulum

```bash
npm install
cp .env.example .env      # AUTH_SECRET'i değiştirin
npm run db:push           # şemayı oluştur
npm run db:seed           # demo berber/hizmet/ayarlar
npm run dev               # http://localhost:3000
```

Demo girişleri:

| Rol | E-posta | Şifre |
|---|---|---|
| Admin (sahip) | admin@berber.local | berber1234 |
| Berber | ahmet@berber.local | berber1234 |

## Sayfalar

| Rota | Açıklama |
|---|---|
| `/` | Video hero, fiyat listesi, ustalar, galeri şeridi, iletişim |
| `/randevu` | 3 adımlı randevu akışı (hizmet → usta/saat → bilgiler) |
| `/randevum` | Telefon + WhatsApp kodu doğrulaması, randevu listesi, iptal |
| `/panel` | Bugün: berber bazlı liste, durum işaretleme, walk-in/manuel randevu |
| `/panel/takvim` | Gün / hafta / ay görünümleri |
| `/panel/site` | Site önizlemesi + tıkla-düzenle (CMS) |
| `/panel/galeri` | Ana sayfa altındaki fotoğraf şeridi (yükle / sırala / sil) |
| `/panel/whatsapp` | Meta Cloud API bilgileri, bağlantı testi, test mesajı (admin) |
| `/panel/berberler` | Berber CRUD + çalışma saatleri (admin) |
| `/panel/hizmetler` | Hizmet CRUD (admin) |
| `/panel/ayarlar` | Tüm site metinleri, hero videosu, favicon, randevu kuralları (admin) |

## Site içeriği (CMS)

Sitedeki tüm metinler ve medya `Setting` tablosunda tutulur; `lib/settings.ts` içindeki `DEFAULTS` ve `FIELDS` listesi tek kaynaktır. Yeni bir alan eklemek için oraya bir anahtar + etiket eklemek yeterli.

**Sayfa üzerinde düzenleme:** `/?edit=1` (yalnızca admin oturumunda çalışır). Ana sayfadaki kesikli çerçeveli her metne tıklayınca düzenleme penceresi açılır, kaydedince sayfa anında güncellenir. Panelde `/panel/site` aynı sayfayı iframe içinde gösterir.

**Hero:** Navbar videonun üzerine biner. Firma adı hero'da **Tangerine** (el yazısı/imza) fontuyla büyük yazılır; logo yoktur. İsim boş bırakılabilir — boşken hero'da yer kaplamaz, düzenleme modunda “Firma adı” yer tutucusu görünür. Tangerine yalnızca latin alt kümesini sunduğu için ş/ğ/İ gibi harfler aynı aileden **Italianno** ile tamamlanır. Hero videosu `/panel/ayarlar` → Ana ekran → “Hero videosu” alanından yüklenir (mp4/webm, en fazla 20 MB; sessiz + döngüde oynar). Video yoksa `heroImage` arka plan olarak kullanılır; video varsa ilk kare (poster) olur.

**Galeri:** `/panel/galeri` sayfasından çoklu fotoğraf yükleyin, oklarla sıralayın, silin. Ana sayfanın altında yatay kaydırılan şerit olarak görünür (`#galeri`).

**Favicon:** `/panel/ayarlar` → Marka bölümünden yüklenir; boşsa `public/favicon.svg` kullanılır.

**Medya:** Görseller ve video `storage/media/` klasöründe dosya olarak saklanır; `Media` tablosunda yalnızca tür, uzantı ve boyut tutulur. `/api/media/<id>.<uzantı>` üzerinden servis edilir (üretimde nginx doğrudan diskten, byte-range destekli; geliştirmede route diskten okur). Yüklenenler `next build` sonrası da kaybolmaz — `storage/` klasörünü yedeklemeniz yeterlidir, veritabanı küçük kalır. Bir medya değiştirilince/silinince eski dosya otomatik temizlenir. Sınırlar: görsel 4 MB (PNG/JPG/WEBP/GIF/AVIF/ICO), video 20 MB.

**Toplu düzenleme:** `/panel/ayarlar` sayfasında tüm alanlar gruplu form olarak listelenir (marka, ana ekran, bölümler, adımlar, iletişim, randevu kuralları).

**Çalışma saatleri:** `/panel/ayarlar` → “Dükkân çalışma saatleri” tüm aktif berberlere aynı şablonu uygular. Berber bazında farklı saat için `/panel/berberler` sayfasında berberi düzenleyin.

**Berber fotoğrafları:** `/panel/berberler` sayfasında berberi düzenleyip fotoğraf yükleyin. Boşsa baş harfli avatar gösterilir.

## İş kuralları

- **Koltuk = berber.** Çakışma kontrolü `barberId + zaman aralığı` üzerinden; aynı berbere iki randevu girmez.
- Slot aralığı (varsayılan 15 dk), minimum ön süre (120 dk) ve maksimum ileri gün (60) ayarlardan gelir.
- Hizmet süresi kapanışa sığmıyorsa o slot üretilmez.
- Mola/izin = `Appointment(type: "block")`; aynı çakışma sorgusundan geçer.
- Randevu yazımı transaction içinde çakışmayı tekrar kontrol eder (çift kayıt koruması).
- Online randevu anında `confirmed` olur; berber `geldi / gelmedi / iptal` işaretler.

## Telegram (bildirim)

Panelden yönetilir: `/panel/telegram` (sadece admin).

| Bildirim | Kime | Ne zaman |
|---|---|---|
| Yeni randevu | Sahip | Randevu oluşunca |
| Müşteri iptali / panel onayı | Sahip | İptal / onay anında |
| Günlük özet (randevu, ciro, berber kırılımı, yarın) | Sahip | Her akşam 21:00 (İstanbul) |

Bot **yalnızca işletme sahibine** açıktır; tanınmayan sohbetlere yanıt vermez, sadece kendi chat ID'sini gösterir.

**Bot komutları** (botla olan sohbette):

| Komut | İşlev |
|---|---|
| `/randevularim` | bugünün randevuları (berber bazlı) |
| `/randevularim yarin` | yarının listesi |
| `/randevularim 2026-11-25` | belirli bir gün (`25.11.2026` de olur) |
| `/ozet` | günlük özeti hemen gönder |
| `/yardim` | komut listesi |

- Bot: Telegram'da `@BotFather` → `/newbot` ile token al, panele kaydet.
- Sahip bottan bir kez `/start` yazmalı — Telegram botları kendilerine hiç yazmamış birine mesaj atamaz.
- Buton/komutların çalışması için panelde bir kez "Webhook'u kur" denir (secret otomatik üretilir).
- Boş token ile mesajlar konsola yazılır (dry-run).

Cron (`crontab -e`, 15 dakikada bir):

```bash
*/15 * * * * curl -s -H "x-cron-secret: $CRON_SECRET" https://<domain>/api/cron/daily-summary
*/15 * * * * curl -s -H "x-cron-secret: $CRON_SECRET" https://<domain>/api/cron/reminders
```

Özet endpoint'i İstanbul saatine göre 21:00 penceresini kendi seçer ve aynı gün ikinci kez göndermez; `?force=1` ile test edilebilir.

## WhatsApp (opsiyonel)

**Panelden yönetim:** `/panel/whatsapp` (sadece admin). Telefon numarası ID, erişim anahtarı, Business Account ID, webhook doğrulama anahtarı, Graph API sürümü ve üç şablon adı buradan girilir. Değerler `Setting` tablosunda tutulur; `.env` yalnızca boş alanlar için yedektir.

- **Bağlantıyı test et** — kayıtlı token ile `GET /{sürüm}/{phone-number-id}?fields=display_phone_number,verified_name,quality_rating` çağırır; Meta'nın hata mesajını ve kodunu gösterir.
- **Test mesajı gönder** — seçilen şablonla gerçek bir mesaj atar; şablon onaylı değilse veya alıcı test listesinde yoksa Meta'nın hatasını gösterir.
- Anahtar arayüzde bir daha gösterilmez; “Anahtarı sil” ile kaldırılır.
- Varsayılan Graph API sürümü `v26.0` (Temmuz 2026). Meta yeni sürüm yayınlarsa alandan güncellenebilir.

Anahtar yokken veya “WhatsApp mesajları aktif” kapalıyken mesajlar konsola yazılır (dry-run) ve OTP kodu arayüzde gösterilir. Gerçek gönderim için Meta'da işletme doğrulaması ve üç şablon gerekir:

| Şablon | Değişkenler | Kullanım |
|---|---|---|
| `randevu_onayi` | `{{1}}` berber, `{{2}}` tarih/saat | Randevu oluşturulunca |
| `randevu_hatirlatma` | `{{1}}` tarih/saat + hizmet + berber | 24 saat ve 2 saat önce |
| `otp_kodu` | `{{1}}` 6 haneli kod | `/randevum` doğrulaması |

Hatırlatmalar cron ile tetiklenir:

```bash
curl -H "x-cron-secret: $CRON_SECRET" https://<domain>/api/cron/reminders
```

15 dakikada bir çağırın; iki saatlik pencere tarandığı için kaçırma olmaz.

Webhook: `GET/POST /api/whatsapp/webhook` — panelde girilen doğrulama anahtarı ile doğrulanır.

## Komutlar

```bash
npm run dev        # geliştirme
npm run build      # production build
npm run lint       # eslint
npm test           # slot motoru testleri (lib/slots.test.ts)
npm run db:reset   # veritabanını sıfırla + seed
```

## Test

`npm test` slot motorunu doğrular: dolu randevu, bitişik randevu, kapanışa sığmayan hizmet, izin günü, minimum ön süre, geçmiş gün, 60 gün sınırı.

`npx tsx scripts/smoke.ts` gerçek veritabanında randevu oluşturma + çakışma engelleme + slot düşümünü doğrular.

## Yapı

```
app/
  page.tsx              # ana sayfa
  randevu/ randevum/    # müşteri tarafı
  panel/                # berber + admin paneli
  actions/              # server actions (public, panel, auth)
  api/                  # slots, ics, cron, whatsapp webhook
lib/
  slots.ts              # saf slot hesabı (test edilir)
  booking.ts            # çakışma kontrolü + randevu yazımı
  time.ts               # Europe/Istanbul yardımcıları (UTC+3 sabit)
  settings.ts           # site içeriği anahtarları, alan listesi, varsayılanlar
  whatsapp.ts           # Cloud API / dry-run
prisma/schema.prisma    # 7 tablo
```

## Bilinen sınırlar

- Tek dükkân; çok şube yok.
- Zaman dilimi Türkiye için sabit UTC+3 varsayar (yaz saati uygulaması 2016'dan beri yok).
- Ödeme, müşteri hesabı, komisyon raporu, sürükle-bırak takvim yok.
