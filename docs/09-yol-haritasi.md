# 09 — Yol Haritası

Bu kapsamdaki bir sistem tek seferde yapılmaz. Öneri: **önce gelir getiren ve günlük operasyonu çözen çekirdek**, sonra uyum ve derinlik. Her faz sonunda pilot kurumda (tercihen bir poliklinik + bir diş kliniği + bir veteriner) sahada doğrulama.

## Faz 0 — Temel (Altyapı ve Tasarım Detayı)
- Tasarımın onaylanması, açık soruların kapatılması ([10](10-karar-bekleyen-konular.md))
- Ekran taslakları (wireframe) — Komuta Merkezi, randevu, muayene, kasa
- Proje iskeleti, CI/CD, kimlik yönetimi, çok kiracılık, yetki motoru, denetim izi
- Tasarım sistemi (UI bileşenleri)

## Faz 1 — Çekirdek Operasyon (MVP)
**Hedef:** Bir poliklinik/muayenehane/diş kliniği tüm gününü sistemde geçirebilsin.
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

## Faz 2 — Derinlik ve Resmî Entegrasyonlar
- Nöbet/vardiya planlama, puantaj, izin, takas
- Hekim hakediş motoru
- MEDULA (SGK), özel sigorta provizyonları, e-Rapor
- İTS/ÜTS bildirimleri, lot izlenebilirlik, soğuk zincir sensörleri, narkotik defteri
- Cihaz bakım/kalibrasyon, sterilizasyon takibi
- Estetik modülü (paket/seans, lot, yüz haritası, foto)
- **Veteriner modülü** (sahip–hayvan, aşı, yatılı, pansiyon, pet-shop, resmî kayıtlar)
- Hasta portalı ve mobil uygulama, online ödeme
- Yönetici mobil uygulaması, periyodik özetler
- Muhasebe entegrasyonu

## Faz 3 — Kalite, Uyum ve Ölçek
- Kalite/SKS modülü, olay bildirimi, DÖF, doküman yönetimi, komiteler
- Enfeksiyon kontrol, İSG, tıbbi atık, radyasyon güvenliği
- KVKK başvuru/ihlal/imha yönetimi, veri envanteri
- Denetim modu
- **Evde sağlık modülü** (rota, GPS, çevrimdışı mobil, cihaz zimmet, araç)
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
