# DC Doktor Klinik — Sağlık Kuruluşu Yönetim Platformu

> **Durum:** Faz 0 — tasarım onaylandı; kurum kaydı, giriş, yetki motoru, çok kiracılı veritabanı, denetim izi ve bunların web arayüzü çalışıyor.

DC Doktor Klinik; **muayenehane, poliklinik, tıp merkezi, dal merkezi, ağız ve diş sağlığı klinikleri, estetik/medikal estetik klinikleri, fizik tedavi / diyet / psikoloji danışmanlık merkezleri, veteriner klinikleri ve evde sağlık hizmeti sunan kuruluşların** tüm operasyonunu — hasta, klinik, personel, nöbet, ilaç/stok, cihaz, finans, kalite, hukuki uyum ve raporlamayı — **tek bir platformda ve tek bir “Komuta Merkezi” ekranından** yönetmek için tasarlanmış bir yazılımdır.

Tasarımın temel iddiası şudur: **Kliniğin sahibi hekim olmasa, kliniğe hiç uğramasa bile**, işletmenin sağlığını tek ekrandan görebilmeli; ancak **hastanın tıbbi sırrına** yalnızca hukuken yetkili ve tedavi ilişkisi olan sağlık personeli erişebilmelidir.

## Doküman Haritası

| # | Doküman | İçerik |
|---|---------|--------|
| 01 | [Vizyon, Kapsam ve Temel İlkeler](docs/01-vizyon-kapsam-ilkeler.md) | Desteklenen kurum tipleri, tasarım ilkeleri, kurum tipine göre modül açma/kapama |
| 02 | [Organizasyon, Roller ve Yetkilendirme](docs/02-roller-ve-yetkilendirme.md) | Sahip / Genel Müdür / Mesul Müdür / Başhekim ayrımı, tüm roller, yetki matrisi, onay akışları, acil erişim |
| 03 | [Komuta Merkezi (Tek Ekran)](docs/03-komuta-merkezi.md) | Role göre gösterge panelleri, alarm ve eskalasyon kuralları |
| 04 | [Modüller — Genel Bakış](docs/moduller/00-modul-listesi.md) | Tüm modüllerin listesi ve birbirleriyle ilişkisi |
| 04.1 | [Hasta Yönetimi ve Randevu](docs/moduller/01-hasta-ve-randevu.md) | Kayıt, kimlik, randevu, kabul, bekleme, hasta portalı |
| 04.2 | [Klinik / Tıbbi Kayıt (EHR)](docs/moduller/02-klinik-kayit.md) | Muayene, tanı, reçete, rapor, onam, laboratuvar, görüntüleme |
| 04.3 | [Branş Modülleri: Diş, Estetik, Veteriner, Evde Sağlık](docs/moduller/03-brans-modulleri.md) | Odontogram, estetik seans/foto, hayvan sağlığı, saha ekibi |
| 04.4 | [Personel, İK, Nöbet ve Vardiya](docs/moduller/04-personel-nobet.md) | Özlük, belge takibi, puantaj, nöbet, izin, performans, hakediş |
| 04.5 | [İlaç, Stok, Cihaz ve Sterilizasyon](docs/moduller/05-ilac-stok-cihaz.md) | Depo, SKT, soğuk zincir, narkotik, İTS/ÜTS, kalibrasyon, sterilizasyon |
| 04.6 | [Finans ve Muhasebe](docs/moduller/06-finans.md) | Fiyatlandırma, tahsilat, SGK/MEDULA, özel sigorta, e-Fatura, kasa, hekim hakedişi |
| 04.7 | [Kalite, Hasta Güvenliği, Enfeksiyon, İSG, Atık](docs/moduller/07-kalite-guvenlik.md) | SKS, olay bildirimi, şikâyet, tıbbi atık, radyasyon güvenliği |
| 04.8 | [İletişim, CRM, Pazarlama ve Sağlık Turizmi](docs/moduller/08-iletisim-crm.md) | SMS/e-posta/WhatsApp, hatırlatmalar, anket, reklam mevzuatı, turizm |
| 04.9 | [Raporlama ve Analitik](docs/moduller/09-raporlama.md) | Yönetim, finans, klinik, resmî raporlar |
| 05 | [Mevzuat, Resmî Entegrasyonlar ve Uyum](docs/05-mevzuat-ve-uyum.md) | Sağlık Bakanlığı, SGK, KVKK, Tarım ve Orman Bakanlığı, vergi, İSG |
| 06 | [Hukuki Metin ve Form Kütüphanesi](docs/06-hukuki-metinler.md) | Aydınlatma metinleri, açık rıza, onam formları, sözleşmeler, iç politikalar |
| 07 | [Veri Modeli](docs/07-veri-modeli.md) | Ana varlıklar ve ilişkiler |
| 08 | [Teknik Mimari ve Güvenlik](docs/08-teknik-mimari.md) | Mimari, teknoloji önerisi, güvenlik, yedekleme, denetim izi |
| 09 | [Yol Haritası](docs/09-yol-haritasi.md) | Aşamalı geliştirme planı (MVP → tam ürün) |
| 10 | [Karar Bekleyen Konular](docs/10-karar-bekleyen-konular.md) | Bir sonraki görüşmede netleştirilecek sorular |
| 11 | [Alınan Kararlar](docs/11-alinan-kararlar.md) | İş modeli, kurum tipi profili motoru, SaaS katmanı, çok dil |
| 12 | [Marka Kılavuzu](docs/12-marka-kilavuzu.md) | Logo, renkler, yazı tipleri, arayüz dili |
| 13 | [Ekran Taslakları](docs/13-ekran-taslaklari.md) | Onaylanan ana ekranlar ve bağlantıları |
| — | [Ürün sunumu (PPTX)](docs/sunum/DC-Doktor-Klinik-Urun-Sunumu.pptx) · [PDF](docs/sunum/DC-Doktor-Klinik-Urun-Sunumu.pdf) | Kurulumdan kullanıma tüm özellikler, roller, kurallar ve ekler (65 slayt) |

## Önemli Not

Bu dokümanlardaki mevzuat atıfları tasarım amaçlıdır. Sağlık mevzuatı (özellikle Sağlık Bakanlığı yönetmelikleri, SUT, KVKK kararları ve reklam/tanıtım kuralları) sık değişir. **Canlıya çıkmadan önce tüm hukuki metinler ve mevzuat eşlemeleri bir sağlık hukuku uzmanı ve KVKK danışmanı tarafından güncel mevzuata göre doğrulanmalıdır.** Tasarım, mevzuat değiştiğinde kod değiştirmeden güncellenebilecek şekilde (parametrik kurallar, sürümlü şablonlar) kurgulanmıştır.

## Geliştirme

**Gereksinimler:** Node.js 22+, pnpm 10, PostgreSQL 16 (veya Docker).

```bash
pnpm install
cp .env.example .env
# Veritabanı: Docker ile `docker compose up -d` ya da yerel PostgreSQL'de
#   psql -U postgres -f scripts/db-init.sql
pnpm --filter @dc/shared build
pnpm db:migrate          # tabloları oluşturur
pnpm dev:api             # http://localhost:3000/api/v1
pnpm --filter @dc/web dev # http://localhost:3001 (API'ye /api/v1 üzerinden bağlanır)
pnpm test                # tüm testler (API testleri dc_klinik_test veritabanını sıfırlar)
```

| Klasör | İçerik |
|---|---|
| `packages/shared` | Meslekler, izin kataloğu, rol kataloğu, kilitli yasal yetki kuralları, kurum tipi profilleri |
| `apps/api` | NestJS API: kurum kaydı, giriş, rol atama, yetki denetimi, denetim izi |
| `apps/web` | Next.js web arayüzü: giriş, kayıt sihirbazı, Komuta Merkezi, hastalar, randevular, muayene, finans, personel ve belgeler, nöbet çizelgesi, stok ve ilaç, kalite ve uyum, kullanıcılar ve yetkiler, denetim izi |
| `apps/web/e2e` | Tarayıcıda uçtan uca akış testleri (Playwright): kurum/yetki, hasta, randevu, muayene, finans, personel/belge, nöbet, stok ve kalite akışları |
| `apps/api/migrations` | Veritabanı şeması (SQL); satır düzeyi güvenlik ile kiracı izolasyonu |

### API (v1) — şu an hazır olanlar

| Uç nokta | Açıklama |
|---|---|
| `GET /kurum-tipleri` · `POST /kurum-tipleri/onizleme` | Kayıt sihirbazı: tipler ve seçime göre modül/rol/belge/entegrasyon listesi |
| `POST /kimlik/kayit` | Kurum kaydı (veteriner + insan sağlığı seçilirse ayrı şubeler açılır) |
| `POST /kimlik/giris` | Giriş, 8 saatlik oturum anahtarı |
| `GET /ben` | Oturumdaki kullanıcı, şubeler, roller ve (`x-sube-id` başlığına göre) etkin izinler |
| `GET/POST /kullanicilar` · `POST /kullanicilar/:id/roller` | Kullanıcı ekleme ve kurallı rol atama |
| `GET/POST /hastalar` · `GET/PATCH /hastalar/:id` | Hasta arama (Türkçe karakterden bağımsız), kayıt (KVKK aydınlatma zorunlu, mükerrer önleme), kart |
| `GET /hastalar/:id/kimlik-no` · `POST /hastalar/:id/rizalar` · `…/uyarilar` · `…/hayvanlar` | Açık kimlik no (kayıtlı), rıza verme/geri çekme, role göre görünen uyarılar, hayvan kaydı |
| `GET/POST /kaynaklar` · `GET /randevular/takvim` · `POST /randevular` · `…/:id/durum` · `…/:id/tasi` | Oda/cihaz, günlük takvim, çakışmasız randevu, kabul (sıra no), muayene, iptal, taşıma |
| `POST /muayeneler` · `GET/PATCH /muayeneler/:id` · `…/imzala` · `…/ek-not` · `GET /hastalar/:id/muayeneler` · `POST /hastalar/:id/acil-erisim` · `GET /icd10` | Muayene kaydı (tedavi ilişkisi şartı), parolalı imza ve kilit, ek not, geçmiş, gerekçeli acil erişim, ICD-10 arama |
| `GET/POST /hizmetler` · `POST /hizmetler/:id/fiyat` · `GET /fiyat-talepleri` · `POST /fiyat-talepleri/:id/karar` | Hizmet kataloğu; fiyat değişikliği dört göz ilkesiyle (talep eden onaylayamaz) |
| `GET /hastalar/:id/hesap` · `POST …/hesap/kalemler` · `…/kalemler/:id/iptal` · `POST /hastalar/:id/tahsilatlar` · `POST /tahsilatlar/:id/iade` | Hasta hesabı; %20 üstü indirim ve iade yönetici onaylı; tahsilatı alan iade edemez |
| `GET /kasa` · `POST /kasa/kapanis` | Ödeme türüne göre gün sonu kasa; fark açıklamasız kapatılamaz, kapalı güne hareket girilmez |
| `GET /personel` · `GET/PATCH /personel/:id` | Personel listesi (belge durumu özetiyle), personel kartı (kişi kendi kartını görür), özlük bilgileri |
| `POST /belgeler` · `POST /belgeler/:id/kaldir` · `GET /belgeler/:id/dosya` · `GET /kurum-belgeleri` | Personel ve kurum belgeleri; dosya türü imzadan doğrulanır, içerik şifreli saklanır, indirme kayda geçer |
| `GET/POST /cizelge` · `POST /cizelge/:id/gorevler` · `…/onaya-gonder` · `…/karar` · `…/revizyon` · `POST /gorevler/:id/sil` · `GET /gorevlerim` | Aylık nöbet/vardiya çizelgesi: çakışma ve izin engeli, süre kuralı ihlalleri, dört göz onayı |
| `GET/PATCH /nobet/ayarlar` · `GET/POST /personel/:id/izinler` · `POST /izinler/:id/iptal` | Nöbet kuralları (kurum ayarı) ve personel izinleri |
| `GET/POST /urunler` · `GET/PATCH /urunler/:id` · `POST /urunler/:id/hareketler` · `GET /urunler/:id/lot-izleme` · `GET /stok/sahitler` | Stok: lot/SKT, FEFO, hastaya kullanım, fire, sayım farkı; SKT geçmiş ürün kullanılamaz; narkotik şahitli; lot → hasta izleme |
| `POST /olaylar` · `GET /olaylar/takip/:kod` · `GET /olaylarim` · `GET/PATCH /olaylar(/:id)` | Olay bildirimi (isimsiz seçenekli, takip kodu), inceleme ve kök nedenle kapatma |
| `GET/POST /sikayetler` · `…/:id/cevap` · `…/:id/kapat` | Şikâyet: resmî kanalda cevap süresi sayacı; tıbbi şikâyete başhekim/mesul cevap verir |
| `GET/POST /dofler` · `…/:id/tamamla` · `…/:id/dogrula` · `GET /kalite/kisiler` | DÖF: sorumlu tamamlar, başka kalite yetkilisi etkinliği doğrular |
| `GET /alarmlar` | Alarm motoru: süresi yaklaşan/geçen ve eksik zorunlu belgeler; görünürlük eskalasyon kuralına göre |
| `GET /komuta/ozet` | Komuta Merkezi: bugünkü randevu, ciro, alacak, bekleme süresi, 14 günlük tahsilat |
| `GET /denetim-izi` | Hash zincirli, değiştirilemez erişim ve işlem kayıtları |

### Güvenlik önlemleri (özet)

- **Kiracı izolasyonu:** PostgreSQL satır düzeyi güvenlik (RLS); uygulama kullanıcısı tablo sahibi değildir.
- **Yetki sınırı:** Her istekte rol + şube kapsamı + kilitli meslek kuralları yeniden yüklenir; başka şubeye ait kayıt üzerinde işlem `403 SUBE_KAPSAMI_DISI` döner (finans iade/iptal, nöbet planlama/onay, kurum belgeleri, kalite kayıtları). Reddedilen istekler denetim izine yazılır.
- **Kaba kuvvet koruması:** Girişte aynı e-posta için 15 dakikada 5, aynı IP için 30 hatalı deneme; kurum kaydında IP başına saatte 5 deneme. Aşımda `429 COK_FAZLA_DENEME`. Sayaç süreç içi bellektedir; birden çok API örneği çalıştırılacaksa ortak bir depoya (Redis) taşınmalıdır. Ters vekil arkasında `TRUST_PROXY` ayarlanmalıdır.
- **HTTP başlıkları:** API ve web; CSP, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: no-referrer` gönderir, `X-Powered-By` kapalıdır; web üretimde HSTS ekler.
- **Veri:** Parolalar Argon2; kimlik no AES-256-GCM + HMAC kör indeks; yüklenen dosyalar şifreli; denetim izi yalnız eklemeli ve hash zincirli.
- **Bilinen sınır:** Oturum belirteci (JWT) çıkıştan sonra süresi dolana kadar geçerlidir; httpOnly + SameSite=Strict çerezde tutulduğu için tarayıcı dışından erişilemez.
