# 04.9 — Raporlama ve Analitik

Tüm raporlar yetkiye tabidir; tıbbi içerik barındıran raporlar yalnızca klinik yöneticilere, diğerlerine anonim/toplu olarak sunulur. Her rapor Excel/PDF alınabilir (dışa aktarma loglanır, tıbbi veri içeren dışa aktarımlar onaya tabidir). Zamanlanmış rapor: e-posta ile periyodik gönderim.

## 1. Yönetim Raporları
- Günlük/haftalık/aylık yönetim özeti (bkz. Komuta Merkezi)
- Hasta sayıları: yeni/tekrar, branş, hekim, şube, kanal, güvence türü
- Randevu analizleri: doluluk, no-show, iptal, son dakika, bekleme süreleri, randevu verme süresi (ilk uygun slot)
- Kapasite: hekim/oda/cihaz kullanım oranları, en yoğun saatler (ısı haritası)
- Hasta sadakati: geri dönüş oranı, kohort analizi, kaybedilen hasta listesi (6 ay+ gelmeyen — CRM kampanyasına aktarılabilir, rızaya bağlı)

## 2. Finans Raporları
- Gelir tablosu (şube/birim/hekim), tahsilat raporu, ödeme türü dağılımı
- Alacak yaşlandırma (hasta, kurum, sigorta, SGK)
- Kasa raporları, POS mutabakatı
- Hekim hakediş raporları
- İşlem kârlılığı, paket/tedavi planı kârlılığı
- İndirim/iade/iptal analizi (kullanıcı bazında)
- SGK kesinti analizi, sigorta ret analizi
- Bütçe vs. gerçekleşen, nakit akış tahmini

## 3. Klinik Raporlar
- Tanı dağılımı (ICD-10), en sık işlemler
- Reçete analizleri (antibiyotik oranı, reçete başı ilaç sayısı, maliyet)
- Tetkik istem oranları, kritik değer bildirim süreleri
- Komplikasyon/yan etki oranları, tekrar işlem oranı
- Tıbbi kayıt eksiksizlik (imzasız, tanısız, onamsız)
- Diş: tedavi planı kabul oranı, tamamlanma oranı, implant başarı takibi
- Estetik: seans tamamlanma, paket kullanım oranı, ürün tüketimi
- Veteriner: tür dağılımı, aşı uyum oranı, yatılı hasta süresi, mortalite
- Evde sağlık: ziyaret sayısı, planlanan/gerçekleşen, ortalama ziyaret süresi, bası yarası iyileşme takibi

## 4. Personel Raporları
- Kadro dağılımı, devir hızı (turnover), devamsızlık, fazla mesai
- Nöbet dağılım adaleti raporu
- Belge durumu (geçerli / yaklaşan / süresi dolmuş)
- Eğitim tamamlama oranları
- Performans karnesi

## 5. Stok Raporları
- Stok değeri, hareket raporu, tüketim analizi (birim/hekim/işlem bazında)
- SKT raporu, fire/imha, sayım farkları
- ABC analizi, tedarikçi performansı (teslim süresi, fiyat değişimi)
- Lot izlenebilirlik (geri çağırma raporu)
- Narkotik/psikotrop defter raporları

## 6. Kalite ve Uyum Raporları
- SKS gösterge karnesi, DÖF durum raporu
- Olay bildirimleri istatistikleri
- Şikâyet analizi, memnuniyet trendleri
- Tıbbi atık miktarları (dönemsel)
- KVKK: başvuru listesi ve cevap süreleri, rıza istatistikleri, erişim logu raporları, olağan dışı erişim raporu

## 7. Resmî ve Yasal Çıktılar
- e-Nabız/USS gönderim durum raporu (gönderilemeyen kayıtlar)
- MEDULA fatura dönemi raporları
- İTS/ÜTS bildirim durum raporları
- Tıbbi atık beyan verileri
- Personel listesi (denetim formatında)
- Bulaşıcı hastalık bildirimleri (bildirimi zorunlu hastalıklar listesi — beşeri ve veteriner)
- Sağlık turizmi istatistikleri

## 8. Analitik Altyapı
- Operasyonel veritabanından ayrılmış raporlama katmanı (veri ambarı) — büyük raporlar sistemi yavaşlatmaz.
- Kendi raporunu tasarla (sürükle-bırak, yöneticiler için) — yalnızca yetkili veri setleri üzerinde.
- Kıyaslama (benchmark): çok şubeli yapıda şubeler arası; opsiyonel olarak platform genelinde anonim sektör ortalamaları (kurumun izniyle, tamamen anonim).
- Tahminleme: randevu talebi, no-show olasılığı (yüksek riskli randevulara ekstra hatırlatma), stok ihtiyacı, nakit akışı.
