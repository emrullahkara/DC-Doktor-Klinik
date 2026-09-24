# 09 — Yol Haritası

Bu kapsamdaki bir sistem tek seferde yapılmaz. Öneri: **önce gelir getiren ve günlük operasyonu çözen çekirdek**, sonra uyum ve derinlik. Her faz sonunda pilot kurumda (tercihen bir poliklinik + bir diş kliniği + bir veteriner) sahada doğrulama.

> **Kararlarla güncellendi ([11](11-alinan-kararlar.md)):** SaaS ürünü; tüm kurum tipleri tek uygulamada, kurum tipi profili ile; resmî entegrasyonlar aracı servis üzerinden; önce web; çok dil (TR, EN, AR, RU, DE) ilk sürümde. Kurum tipi profilleri Faz 1’de **tüm tipler için temel düzeyde** gelir (hasta modeli, randevu, muayene şablonları, onamlar, fiyat kataloğu); tipe özgü derin özellikler fazlara yayılır.

## Faz 0 — Temel (Altyapı ve Tasarım Detayı)
- Tasarımın onaylanması, açık soruların kapatılması ([10](10-karar-bekleyen-konular.md))
- Ekran taslakları (wireframe) — Komuta Merkezi, randevu, muayene, kasa
- Proje iskeleti, CI/CD, kimlik yönetimi, çok kiracılık, yetki motoru, denetim izi
- **Kurum Tipi Profili motoru** ve kayıt sihirbazı
- **Çok dil altyapısı** (i18n, Arapça için sağdan sola düzen)
- Aracı entegrasyon servisi seçimi ve sağlayıcı bağımsız adaptör katmanı
- Tasarım sistemi (UI bileşenleri), logo ve renk kimliği önerisi

## Faz 1 — Çekirdek Operasyon (MVP)
**Hedef:** Her kurum tipi (tıp merkezi/poliklinik/muayenehane, diş, estetik, veteriner, evde sağlık) temel günlük işini sistemde yapabilsin; SaaS olarak satışa hazır olsun.
- Platform yönetim paneli, abonelik ve deneme süreci
- İşletme/şube/birim tanımları, kullanıcılar, roller, yetki matrisi
- Hasta kaydı, KVKK aydınlatma ve rıza, uyarı bayrakları
- Randevu (kaynak bazlı), kabul, bekleme ekranı, SMS hatırlatma
- Muayene kaydı (şablonlu), ICD-10 tanı, işlem, e-Reçete
- Onam şablonları ve tablet imza
- Fiyat listesi, hasta hesabı, tahsilat, kasa, gün sonu, e-Arşiv/e-Fatura/e-SMM
- e-Nabız/USS gönderimi
- Basit stok (ürün, giriş, işlemle tüketim, SKT alarmı)
- Personel kartı + belge takibi + alarm
- Komuta Merkezi v1 (sahip, hekim, sekreter panoları)
- Diş modülü v1 (odontogram, tedavi planı, teklif, taksit)
- Estetik v1 (seans/paket, ürün-lot kaydı), Veteriner v1 (sahip–hayvan, aşı karnesi + hatırlatma), Evde sağlık v1 (ziyaret planı, web üzerinden ziyaret kaydı)
- Hukuki metin taslakları (TR + çeviriler) — “hukuki onay bekliyor” durumunda

## Faz 2 — Derinlik ve Resmî Entegrasyonlar
- Nöbet/vardiya planlama, puantaj, izin, takas
- Hekim hakediş motoru
- MEDULA (SGK), özel sigorta provizyonları, e-Rapor
- İTS/ÜTS bildirimleri, lot izlenebilirlik, soğuk zincir sensörleri, narkotik defteri
- Cihaz bakım/kalibrasyon, sterilizasyon takibi
- Estetik modülü derinleşme (yüz haritası, foto karşılaştırma, kontrendikasyon kontrolleri)
- Hasta portalı (web), online ödeme
- **Mobil uygulamalar** (personel, yönetici, hasta) — K4 gereği bu fazda
- Yönetici mobil uygulaması, periyodik özetler
- Muhasebe entegrasyonu

## Faz 3 — Kalite, Uyum ve Ölçek
- Kalite/SKS modülü, olay bildirimi, DÖF, doküman yönetimi, komiteler
- Enfeksiyon kontrol, İSG, tıbbi atık, radyasyon güvenliği
- KVKK başvuru/ihlal/imha yönetimi, veri envanteri
- Denetim modu
- Evde sağlık derinleşme (rota, GPS, çevrimdışı mobil, cihaz zimmet, araç)
- Veteriner özel modülleri ve “Vet” sürümü (yatılı, pansiyon, pet-shop, aşı hatırlatma, resmî kayıtlar) — K14
- Sağlık turizmi modülü
- CRM, lead yönetimi, anket, kampanya uyum kontrolü
- Lab (HL7) / PACS entegrasyonları, tele-tıp

## Faz 4 — Akıllı Özellikler
- No-show tahmini, talep tahmini, stok tahmini, nakit akış tahmini
- Otomatik nöbet optimizasyonu (gelişmiş)
- Yapay zekâ destekli klinik not özeti / sesli dikte (hekim onaylı, yurt içi işleme)
- Sektör kıyaslama (anonim benchmark)

## Başarı Ölçütleri
- Kurum kurulumundan ilk randevuya: < 1 gün (küçük kurum)
- Hekim başına muayene kaydı süresi: kâğıttan hızlı (hedef < 3 dk ek yük)
- Kaçan/unutulan belge-sertifika süresi: 0
- SKT geçmiş ürün kullanımı: 0
- Onamsız işlem: 0
- Sahip memnuniyeti: “Kliniğe gitmeden durumunu biliyorum”
