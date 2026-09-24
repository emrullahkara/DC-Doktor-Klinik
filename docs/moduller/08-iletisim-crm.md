# 04.8 — İletişim, CRM, Pazarlama ve Sağlık Turizmi

## 1. İletişim Kanalları
- SMS (İYS — İleti Yönetim Sistemi uyumlu), e-posta, mobil push, WhatsApp Business API, sesli arama (santral/çağrı merkezi entegrasyonu — arayan numaradan hasta kartını açma).
- Mesaj şablonları (çok dilli), değişkenler (ad, randevu saati, hekim).

## 2. Mesaj Türleri ve Hukuki Ayrım
| Tür | Örnek | İzin Gerekliliği |
|---|---|---|
| **Bilgilendirme (işlemsel)** | Randevu hatırlatma, sonuç hazır, ödeme hatırlatma, aşı zamanı | Hizmetin ifası kapsamında; ticari ileti değildir (içerik saf bilgilendirme olmalı) |
| **Ticari elektronik ileti** | Kampanya, indirim, yeni hizmet duyurusu | **İYS’ye kayıtlı onay** gerekir; ret hakkı her mesajda |
| **Sağlık içerikli** | “Tahlil sonucunuz …” | İçerik **mesajda yer almaz**, portal/uygulama linki + kimlik doğrulama |

Sistem, ticari içerikli şablonların yalnızca onaylı alıcılara gitmesini **zorunlu kılar**; toplu gönderimler loglanır.

## 3. Otomatik Hatırlatma Senaryoları
- Randevu (24 saat / 2 saat önce, teyit butonlu)
- Kontrol zamanı geldi (hekimin belirlediği kontrol aralığına göre)
- Kronik hasta periyodik tetkik
- Aşı takvimi (çocuk, yetişkin, veteriner)
- Diş: 6 aylık kontrol/temizlik
- Estetik: sonraki seans, botoks tekrar zamanı (ör. 4–6 ay)
- Paket bitiş tarihi, taksit vadesi
- Doğum günü (rızaya bağlı, ticari içerik yoksa)
- Tedavi sonrası 1. gün / 7. gün “nasılsınız” mesajı → sorun bildirirse klinik ekrana alarm

## 4. Memnuniyet ve Geri Bildirim
- Ziyaret sonrası kısa anket (NPS + 3–5 soru), hekim/personel/temizlik/bekleme puanı.
- Düşük puan → otomatik şikâyet kaydı ve hasta ilişkilerine görev.
- Yüksek puan → çevrimiçi değerlendirme daveti (reklam/tanıtım mevzuatına aykırı teşvik içermeyecek şekilde).

## 5. Pazarlama ve Tanıtım — Mevzuat Uyum Kontrolü
Sağlık hizmetlerinde reklam ve tanıtım **ciddi kısıtlamalara** tabidir (Sağlık Bakanlığı tanıtım/bilgilendirme düzenlemeleri, meslek birliklerinin etik kuralları, Reklam Kurulu kararları). Sistem şu kontrolleri yapar:
- Hazırlanan kampanya/duyuru metnine **uyum kontrol listesi** (yanıltıcı ifade, “en iyi / garanti / kesin sonuç” türü ifadeler, fiyat indirimi reklamı, önce/sonra görsel kullanımı, hasta yorumlarının kullanımı, ünlü kullanımı vb.) — mesul müdür onayı olmadan yayınlanamaz.
- Önce/sonra fotoğrafları yalnızca ayrı açık rızası olan hastalardan ve mevzuatın izin verdiği sınırlarda kullanılabilir; sistem rızasız fotoğrafın dışa aktarımını engeller.
- Pazarlama analitiği: kanal bazında hasta kazanımı (kimlik bilgisi olmadan, toplu).

> Bu alan en sık değişen mevzuat alanlarındandır; kontrol listesi yönetilebilir parametre olarak tutulur ve hukuk danışmanıyla periyodik güncellenir.

## 6. Lead (Aday Hasta) Yönetimi
- Web formu, sosyal medya formları, telefon, WhatsApp’tan gelen talepler tek listede.
- Durum: yeni → arandı → randevu verildi → geldi → tedaviye başladı / kaybedildi (sebep).
- Danışman ataması, geri arama hatırlatması, dönüşüm oranları.
- Aday hasta verisi için ayrı aydınlatma ve saklama süresi (dönüşmezse imha).

## 7. Sağlık Turizmi
- **Yetki belgesi** takibi (Uluslararası Sağlık Turizmi Yetki Belgesi), aracı kuruluşların yetki belgesi kontrolü.
- Yabancı hasta kaydı: pasaport, uyruk, dil, ülkedeki iletişim, sigorta (yurt dışı), refakatçi.
- Çok dilli belgeler: onam, aydınlatma metni, epikriz, fatura (en az hastanın anladığı dilde onam — tercüman imzası).
- Süreç: ön değerlendirme (uzaktan belge/fotoğraf) → teklif (döviz) → seyahat planı (uçuş, transfer, otel) → tedavi → kontrol → dönüş sonrası uzaktan takip.
- Tercüman ataması ve kaydı.
- Aracı kurum komisyonu hesaplama ve ekstresi; mevzuattaki komisyon/fiyat kurallarına uyum.
- Döviz kuru (TCMB), dövizli fiyat listesi ve fatura.
- USHAŞ ve ilgili resmî bildirim/istatistik yükümlülükleri için raporlar.
- Yurt dışı hasta verisinin aktarımı → KVKK yurt dışı aktarım kuralları kontrolü.
