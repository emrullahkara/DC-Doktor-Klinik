# 03 — Komuta Merkezi (Tek Ekran)

Kullanıcının “her şeyi tek ekrandan görmek istiyorum” talebinin karşılığıdır. Komuta Merkezi, **role göre şekillenen**, gerçek zamanlı güncellenen, kırmızı/sarı/yeşil durum mantığıyla çalışan ana ekrandır. Web’de geniş pano, mobilde kaydırılabilir kartlar şeklinde çalışır.

## 1. Tasarım Mantığı

- **Üstte “Kurum Sağlık Skoru” (0–100):** Operasyon, Finans, Personel, Stok, Uyum, Hasta Memnuniyeti alt skorlarının ağırlıklı ortalaması. Sahip kliniğe uğramasa bile tek bakışta durumu anlar.
- **Ortada “Şimdi” şeridi:** O an klinikte ne oluyor (bekleyen hasta, odalardaki hekimler, sahadaki ekipler).
- **Sağda “Yapılacaklar / Alarmlar”:** Çözülmesi gereken, sorumlusu ve süresi belli işler.
- **Altta trendler:** Gün/hafta/ay karşılaştırmaları.
- Her kart tıklanınca detay ekranına iner (drill-down); yetkisi olmayan kullanıcı detaya inemez, yalnızca toplu sayıyı görür.
- Şube filtresi: Tek şube / tüm şubeler (konsolide).

## 2. Role Göre Panolar

### 2.1. Sahip / Genel Müdür Panosu
| Kart | İçerik |
|---|---|
| Kurum Sağlık Skoru | 0–100 + alt skorlar + geçen haftaya göre değişim |
| Bugünün Özeti | Planlanan / gelen / gelmeyen (no-show) / iptal randevu; walk-in hasta; ortalama bekleme süresi |
| Ciro ve Tahsilat | Bugün / bu ay / hedefe göre %; nakit–kart–havale–sigorta–SGK kırılımı; tahsil edilmemiş alacak |
| Kârlılık | Aylık gelir – gider; hekim/birim/işlem bazında kârlılık (anonim tıbbi içerik) |
| Kapasite Kullanımı | Hekim/oda/ünit/cihaz doluluk oranı; boş slotlar |
| Personel | Bugün çalışan / izinli / raporlu / geç kalan; boş nöbet; fazla mesai |
| Belge & Ruhsat Alarmları | 30/60/90 gün içinde süresi dolacaklar (ruhsat, mesul müdür belgesi, sigorta, NDK lisansı, personel sertifikaları) |
| Stok | Kritik seviyedeki ürünler, SKT yaklaşanlar, bu ayki fire/imha tutarı |
| Hasta Memnuniyeti | NPS, anket puanları, açık şikâyetler, Google yorum ortalaması (entegrasyonla) |
| Uyum | Onamı eksik işlem sayısı, imzalanmamış rapor/reçete, açık olay bildirimi, KVKK başvuruları (yasal süre sayacıyla) |
| SGK / Sigorta | Bu dönem MEDULA’ya gönderilen/iade edilen/kesinti; özel sigorta onay bekleyenler |

### 2.2. Mesul Müdür Panosu
- Ruhsat, faaliyet izin belgesi, personel çalışma belgeleri (ÇKYS) durumu
- Personel bildirimi yapılmamış yeni işe girişler / ayrılışlar (yasal süre sayacı)
- Olay bildirimleri (hasta güvenliği, çalışan güvenliği), şikâyetler, Bakanlık / CİMER / SABİM başvuruları
- Tıbbi atık: son teslim, biriken miktar, lisanslı firma sözleşme süresi
- Narkotik/psikotrop defter uyuşmazlıkları
- Olağan dışı erişim (break-the-glass, gece erişimi, toplu kayıt görüntüleme) raporu
- Sterilizasyon başarısız çevrim alarmları, cihaz kalibrasyon gecikmeleri
- Denetime hazırlık skoru (SKS / Bakanlık kontrol listesine göre eksikler)

### 2.3. Başhekim Panosu
- Hekim bazında hasta sayısı, ortalama muayene süresi, tekrar başvuru oranı
- İmzalanmamış/eksik tıbbi kayıtlar (hekim bazında)
- Kritik tahlil sonucu bildirimleri ve okunma durumu
- Konsültasyon istekleri, bekleyen sevkler
- Komplikasyon / beklenmeyen sonuç kayıtları
- Antibiyotik reçeteleme oranı, kırmızı/mor reçete sayısı (akılcı ilaç göstergeleri)

### 2.4. Hekim Panosu
- Bugünkü randevu listesi (geldi/bekliyor/içeride/bitti), gecikme uyarısı
- Kendi hastalarının sonuçlanan tetkikleri (kritik değerler kırmızı)
- İmza bekleyen belgeler (reçete, rapor, epikriz)
- Takip gerektiren hastalar (kontrol zamanı geçmiş, ilaç bitiş tarihi yaklaşan kronik hasta)
- Kendi hakediş özeti (yetki verilmişse)
- Nöbet/çalışma takvimi

### 2.5. Başhemşire / Hemşire Panosu
- İlaç uygulama çizelgesi (saati gelen/geciken)
- Vital bulgu girilmesi gereken hastalar
- Günlük vardiya, eksik personel, nöbet değişim talepleri
- Sterilizasyon ve cihaz kontrol listeleri (günlük acil çanta/defibrilatör kontrolü)
- Soğuk zincir sıcaklık durumu

### 2.6. Sekreter / Hasta Kabul Panosu
- Bekleme salonu görünümü (sıra, bekleme süresi, hangi hekime)
- Gelmesi beklenen hastalar, teyit edilmemiş randevular
- Eksik belge/onam (imzaya sunulacak formlar)
- Kasa özeti, bekleyen tahsilat, provizyon hataları

### 2.7. Veteriner Panosu (ek kartlar)
- Yatılı hayvanlar (kafes haritası, tedavi saatleri, beslenme)
- Bugün aşı zamanı gelen hayvanlar ve sahiplerine hatırlatma durumu
- Pansiyon doluluk, giriş/çıkış
- Resmî kayıt bildirimi bekleyen işlemler (mikroçip/kuduz aşısı)

### 2.8. Evde Sağlık Koordinatör Panosu (ek kartlar)
- Harita üzerinde ekiplerin canlı konumu ve ziyaret durumu (planlandı/yolda/hastada/tamamlandı)
- Gecikmeli / gerçekleşmeyen ziyaretler
- Kritik hasta uyarıları (vital değer eşik aşımı)
- Araç / yakıt / km takibi

## 3. Alarm ve Eskalasyon Motoru

Her alarm bir **kural** ile tanımlanır; kurum eşikleri kendi ayarlar.

| Alarm | Tetikleyici (varsayılan) | 1. Bildirim | Çözülmezse Eskalasyon |
|---|---|---|---|
| Personel sertifikası/belgesi dolacak | 90/60/30/7 gün kala | Personelin kendisi + İK | Mesul Müdür (30 gün), Genel Müdür (7 gün); süre dolunca personel ilgili işlemlerde **bloke** (ör. süresi dolmuş radyasyon eğitimi → röntgen çekemez) |
| Kurum ruhsatı / sigorta / NDK lisansı | 120/60/30 gün | Mesul Müdür | Sahip |
| İlaç SKT | 90/30 gün | Depo | Başhemşire; SKT geçmiş ürün **uygulamaya kapalı** |
| Kritik stok seviyesi | Min. seviye altı | Depo | Genel Müdür (otomatik sipariş önerisi) |
| Soğuk zincir sıcaklık dışı | 2–8 °C dışında > 15 dk | Sorumlu hemşire (SMS+uygulama) | Mesul Müdür; etkilenen lotlar karantinaya |
| Boş nöbet | Yayından 72 saat önce doldurulmamış | Planlayıcı | Başhekim / Başhemşire |
| Onamsız işlem | İşlem başlatılmak istenirken onam yok | Hekim (engel) | — |
| İmzasız tıbbi belge | 24 saat | Hekim | Başhekim (72 saat) |
| Kritik laboratuvar değeri | Sonuç geldiğinde | İsteyen hekim | 30 dk okunmazsa nöbetçi hekim / başhekim |
| KVKK başvurusu | Başvuru anı (yasal cevap süresi sayacı) | Veri sorumlusu temsilcisi | Mesul Müdür (süre yarılandığında) |
| Hasta şikâyeti | Kayıt anı | Hasta ilişkileri | Genel Müdür (48 saat), Mesul Müdür (tıbbi içerikli ise) |
| Kasa açığı / fazlası | Gün sonu fark > eşik | Vezne sorumlusu | Genel Müdür |
| Olağan dışı veri erişimi | Break-the-glass, toplu görüntüleme, mesai dışı | Mesul Müdür | — |
| Evde sağlık ziyareti gecikti | Planlanan saatten 30 dk sonra check-in yok | Koordinatör | Mesul Müdür |
| Sterilizasyon çevrimi başarısız | Kimyasal/biyolojik indikatör başarısız | Enfeksiyon kontrol hemşiresi | Başhekim; o çevrimdeki setler geri çağrılır |

Bildirim kanalları: uygulama içi, mobil push, SMS, e-posta, (opsiyonel) WhatsApp Business. Kullanıcı sessiz saatlerini ayarlayabilir; **kritik alarmlar sessiz saati deler**.

## 4. Sahip İçin Periyodik Özetler

Kliniğe uğramayan sahip için sistem otomatik gönderir:
- **Günlük (akşam):** Günün cirosu, hasta sayısı, kritik alarmlar.
- **Haftalık (Pazartesi sabah):** Hafta karşılaştırması, en iyi/en zayıf performans alanları, çözülmemiş alarmlar.
- **Aylık:** Yönetim raporu PDF (gelir tablosu, hekim/birim performansı, personel devir hızı, memnuniyet, uyum durumu).
