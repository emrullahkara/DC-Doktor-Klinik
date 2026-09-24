# 04.5 — İlaç, Stok, Cihaz ve Sterilizasyon

## 1. Stok Yapısı

### 1.1. Depo Hiyerarşisi
Ana depo → Şube deposu → Birim dolabı → Oda/ünit çekmecesi / Ekip çantası / Araç stoku / Acil arabası. Her lokasyonun sorumlusu ve min/max seviyesi vardır.

### 1.2. Ürün Kartı
- Ürün tipi: ilaç (beşeri/veteriner), aşı, tıbbi sarf, tıbbi cihaz/implant, dental malzeme, estetik ürün, laboratuvar kiti, temizlik/dezenfektan, ofis, perakende (pet-shop/dermokozmetik).
- Barkod (GTIN), karekod (İTS), ÜTS ürün numarası, ATC kodu, etken madde, form, doz, ambalaj/birim dönüşümü (kutu → ampul → ml).
- Saklama koşulu (oda sıcaklığı, 2–8 °C, dondurucu, ışıktan koru), açıldıktan sonra kullanım süresi.
- Kontrol statüsü: **narkotik / psikotrop (kırmızı-yeşil reçeteli)**, yüksek riskli ilaç (konsantre KCl, insülin, heparin), benzer isimli/benzer ambalajlı ilaç (LASA) uyarısı.
- Tedarikçi(ler), alış fiyatı, KDV, satış fiyatı (varsa), SUT eşlemesi.

### 1.3. Lot / Seri / SKT Takibi
Her giriş lot ve SKT ile yapılır; çıkışta **FEFO** (ilk bitecek ilk çıkar) önerilir. Hastaya uygulanan her ilaç/implant hangi lottan olduğu ile kaydedilir → **geri çağırma (recall)** durumunda “bu lotu hangi hastalara uyguladık?” sorusu saniyede cevaplanır.

## 2. Stok Süreçleri
- **Talep:** Birim → depo (dahili talep formu), onay akışı.
- **Satın alma:** Otomatik sipariş önerisi (min seviye, tüketim hızı, tedarik süresi) → teklif karşılaştırma → sipariş → onay (tutar eşiğine göre).
- **Mal kabul:** İrsaliye/e-İrsaliye eşleştirme, karekod okutma, sıcaklık kontrolü (soğuk zincir teslim), hasarlı/eksik tutanak. **Siparişi veren ile kabul eden farklı kişi** (görevler ayrılığı).
- **Tüketim:** Klinik işlem kaydında kullanılan malzeme/ilaç otomatik stoktan düşer (işlem reçetesi / “kit” tanımı: ör. “dolgu işlemi = 1 kompozit kapsül + 1 bonding + …”). Hekim sadece farkı düzenler.
- **Transfer:** Şubeler/depolar arası, onaylı.
- **Sayım:** Periyodik (aylık), kör sayım, sürpriz sayım; fark raporu ve onaylı düzeltme.
- **Fire / imha:** Kırılma, SKT geçmesi, kontaminasyon — tutanak, imha firması belgesi, maliyet raporu.
- **İade:** Tedarikçiye iade, hasta iadesi.

## 3. Soğuk Zincir
- Buzdolaplarına IoT sıcaklık sensörü entegrasyonu (veya günde en az 2 kez manuel kayıt formu).
- Aralık dışı sıcaklıkta alarm (bkz. Komuta Merkezi); **etkilenen lotların otomatik karantinası** ve kullanımdan kaldırma / üretici danışma kaydı.
- Elektrik kesintisi prosedürü kaydı, jeneratör/UPS kontrolü.

## 4. Narkotik ve Psikotrop İlaçlar
- Ayrı kilitli kasa lokasyonu; açılış/kapanış kaydı.
- Her hareket: giriş, hastaya uygulama (hasta, hekim istemi, uygulayan, şahit), kalan miktarın imhası (ampulün kalanı — şahitli), iade.
- Vardiya sonu sayım ve devir teslim (iki imza).
- Uyuşmazlık → Mesul Müdür alarmı; mevzuata uygun defter/rapor çıktıları.

## 5. Resmî Takip Sistemleri
- **İTS (İlaç Takip Sistemi):** Beşeri ilaç karekodlarının kurum girişi / hastaya uygulama / iade bildirimleri (kurumun İTS yükümlülüğü kapsamına göre).
- **ÜTS (Ürün Takip Sistemi):** Tıbbi cihaz ve kozmetik ürünlerin (implant, dolgu, kontakt lens vb.) alma/verme/tüketim bildirimleri; hastaya implant kartı.
- **Veteriner ürünleri:** Tarım ve Orman Bakanlığı’nın veteriner ilaç takip/reçete sistemleriyle uyumlu kayıt ve bildirim.
- Bildirim başarısızlıkları iş kuyruğunda bekler, yeniden denenir ve raporlanır.

## 6. Tıbbi Cihaz ve Demirbaş Yönetimi

### 6.1. Cihaz Kartı
Marka, model, seri no, ÜTS kaydı, alım tarihi/bedeli, garanti bitişi, tedarikçi/servis firması, lokasyon, sorumlu kişi, kullanım kılavuzu, CE belgesi, fotoğraf, QR etiket.

### 6.2. Bakım ve Kalibrasyon
- Periyodik bakım planı (üretici önerisi), kalibrasyon ve ölçüm doğrulama (tansiyon aleti, terazi, termometre, pipet, otoklav validasyonu, lazer cihaz güç ölçümü, röntgen kalite kontrol testleri).
- Bakım yapan firma, rapor, sonraki tarih; gecikmede alarm; kalibrasyonu geçmiş cihaz “kullanım dışı” işaretlenebilir.
- **Günlük kontrol listeleri:** defibrilatör, acil arabası (ilaç SKT + ekipman), oksijen tüpü doluluğu, aspiratör.

### 6.3. Arıza Yönetimi
QR okut → arıza bildir (fotoğraf) → servis çağrısı → çözüm → maliyet. Cihaz arızalıyken ilgili randevu kaynakları otomatik bloke edilir.

### 6.4. Cihaz Kullanım Kaydı
Lazer, röntgen, otoklav gibi cihazlarda sayaç/atış/çevrim kaydı; işlem kaydına bağlanır → cihaz başına gelir ve kullanım yoğunluğu analizi.

## 7. Sterilizasyon Takibi
- Alet setleri (QR/barkod etiketli), set içeriği listesi.
- Süreç: kullanım → ön temizlik → yıkama/dezenfeksiyon → paketleme → sterilizasyon (cihaz, çevrim no, program, sıcaklık/basınç/süre) → **kimyasal ve biyolojik indikatör sonucu** → depolama → son kullanma (paket raf ömrü) → hastada kullanım.
- **Set ↔ hasta eşleşmesi:** hangi set hangi hastada kullanıldı (enfeksiyon izlenebilirliği).
- Başarısız çevrim → o çevrimdeki tüm setler geri çağrılır, kullanıldıysa ilgili hastalar listelenir.
- Bowie-Dick testi, otoklav günlük/haftalık test kayıtları.
