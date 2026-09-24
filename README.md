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
| `apps/web` | Next.js web arayüzü: giriş, kayıt sihirbazı, Komuta Merkezi, kullanıcılar ve yetkiler, denetim izi |
| `apps/web/e2e` | Tarayıcıda uçtan uca akış testi (Playwright) |
| `apps/api/migrations` | Veritabanı şeması (SQL); satır düzeyi güvenlik ile kiracı izolasyonu |

### API (v1) — şu an hazır olanlar

| Uç nokta | Açıklama |
|---|---|
| `GET /kurum-tipleri` · `POST /kurum-tipleri/onizleme` | Kayıt sihirbazı: tipler ve seçime göre modül/rol/belge/entegrasyon listesi |
| `POST /kimlik/kayit` | Kurum kaydı (veteriner + insan sağlığı seçilirse ayrı şubeler açılır) |
| `POST /kimlik/giris` | Giriş, 8 saatlik oturum anahtarı |
| `GET /ben` | Oturumdaki kullanıcı, şubeler, roller ve (`x-sube-id` başlığına göre) etkin izinler |
| `GET/POST /kullanicilar` · `POST /kullanicilar/:id/roller` | Kullanıcı ekleme ve kurallı rol atama |
| `GET /denetim-izi` | Hash zincirli, değiştirilemez erişim ve işlem kayıtları |
