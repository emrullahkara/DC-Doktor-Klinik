# 08 — Teknik Mimari ve Güvenlik

## 1. Dağıtım Modeli
- **Birincil:** Bulut tabanlı SaaS (çok kiracılı), **Türkiye’de bulunan veri merkezinde** barındırma (sağlık verisinin yurt içinde kalması; KVKK yurt dışı aktarım riskinin ortadan kaldırılması).
- **Alternatif:** Büyük kurumlar için özel (dedicated) kurulum veya kurum içi (on-premise) paket — aynı kod tabanı.
- Kurum içinde yerel ağ kesintisine karşı: resepsiyon ve hekim ekranları için **sınırlı çevrimdışı mod** (günün randevu listesi + yeni kayıt kuyruğu), saha mobil uygulaması için tam çevrimdışı mod.

## 2. Uygulama Bileşenleri
| Bileşen | Açıklama |
|---|---|
| Web Uygulaması | Yönetim, klinik, resepsiyon, finans — duyarlı tasarım, tablet uyumlu |
| Mobil Uygulama – Personel | Hekim/hemşire/saha ekibi: takvim, hasta kaydı, nöbet, onay kutusu, bildirimler, çevrimdışı |
| Mobil Uygulama – Yönetici | Komuta Merkezi, onaylar, raporlar (kliniğe uğramayan sahip için) |
| Hasta / Hayvan Sahibi Portalı + Mobil | Randevu, sonuç, ödeme, onam, anket, KVKK başvurusu |
| Kiosk ve Bekleme Ekranı | Kendi kendine kabul, sıra çağrı ekranı |
| Tablet İmza Uygulaması | Onam ve aydınlatma imzası |
| Entegrasyon Katmanı | Resmî sistemler, ödeme, iletişim, lab/PACS, muhasebe — kuyruklu, yeniden denemeli |
| Raporlama / Veri Ambarı | Analitik, gösterge hesaplama |
| Kural ve Alarm Motoru | Alarm, eskalasyon, planlı işler |
| Doküman/Şablon Motoru | Sürümlü şablonlardan PDF üretimi, e-imza |

## 3. Teknoloji Önerisi (tartışmaya açık)
| Katman | Öneri | Gerekçe |
|---|---|---|
| Backend | **TypeScript + NestJS** (modüler monolit) veya .NET 8 | Güçlü tip sistemi, modüler yapı, geniş ekosistem; ilk aşamada mikroservis karmaşıklığı yerine iyi ayrılmış modüler monolit |
| Veritabanı | **PostgreSQL** (Row Level Security, JSONB şablonlu klinik notlar, bölümleme) | Güvenilir, açık kaynak, çok kiracılık desteği |
| Önbellek / Kuyruk | Redis + BullMQ (veya RabbitMQ) | Entegrasyon kuyrukları, alarm zamanlayıcı |
| Arama | PostgreSQL tam metin / OpenSearch (ölçek büyüdüğünde) | Hasta, ilaç, ICD arama |
| Dosya Deposu | S3 uyumlu nesne deposu (yurt içi), şifreli | Onam PDF, fotoğraf, belge |
| Web Frontend | **React + TypeScript** (Next.js), bileşen kütüphanesi | Zengin ekranlar (takvim, odontogram, planlama) |
| Mobil | **React Native** (veya Flutter) | Tek kod tabanı iOS/Android, çevrimdışı veri (SQLite şifreli) |
| Kimlik Yönetimi | Keycloak (veya eşdeğeri) — OIDC, 2FA | Merkezi kimlik, SSO, oturum politikaları |
| Raporlama | Ayrı okuma replikası + analitik şema; gömülü BI | Operasyonu yavaşlatmadan rapor |
| Görüntü | DICOM için Orthanc tabanlı hafif PACS veya dış PACS entegrasyonu | Diş/röntgen görüntüleri |
| Altyapı | Konteyner (Docker/Kubernetes), IaC, CI/CD | Tekrarlanabilir kurulum |
| İzleme | Merkezi log, metrik, uyarı (OpenTelemetry) | Operasyonel görünürlük |

## 4. Güvenlik Mimarisi
- **Şifreleme:** Aktarımda TLS 1.2+; depolamada disk şifreleme + hassas alanlarda (TC kimlik, tanı, çok gizli notlar) uygulama seviyesinde alan şifreleme; anahtar yönetimi (KMS/HSM), anahtar rotasyonu.
- **Kimlik doğrulama:** 2FA, parola politikası, cihaz kaydı, oturum süresi, eşzamanlı oturum sınırı, başarısız giriş kilidi.
- **Yetkilendirme:** Merkezi politika motoru (RBAC + ABAC), tüm API uçlarında zorunlu; veritabanında RLS ikinci savunma hattı.
- **Denetim izi:** Değiştirilemez log (hash zinciri), ayrı depolama, okuma erişimi de loglanır.
- **Uygulama güvenliği:** OWASP ASVS esaslı geliştirme, bağımlılık taraması, statik analiz, yıllık bağımsız sızma testi.
- **Ağ:** WAF, DDoS koruması, yönetim arayüzlerine IP kısıtı.
- **Veri minimizasyonu:** Loglarda, bildirimlerde, SMS’te tıbbi içerik yok; test ortamında gerçek hasta verisi yok (maskeleme).
- **Yapay zekâ bileşenleri (opsiyonel):** Veri yurt içinde işlenmeli veya açık hukuki dayanakla; hekim onayı olmadan kayda yazılmaz; hangi çıktının yapay zekâ destekli üretildiği işaretlenir.
- Hedef standartlar: ISO 27001 uyumlu süreçler, ISO 27799 (sağlıkta bilgi güvenliği) rehberliği.

## 5. Süreklilik ve Yedekleme
- Sürekli veritabanı yedeklemesi (nokta-zamana geri dönüş), günlük tam yedek, **coğrafi olarak ayrı ikinci yurt içi lokasyon**.
- Hedefler (öneri): RPO ≤ 15 dk, RTO ≤ 4 saat; düzenli geri yükleme tatbikatı.
- Kurum bazında veri dışa aktarma (hasta bazlı ve toplu, standart format) — kurum sistemden ayrılırsa verisi teslim edilir.
- Durum sayfası ve kesinti bildirim prosedürü.

## 6. Performans ve Ölçek Hedefleri (başlangıç)
- Hasta arama < 300 ms, randevu takvimi yükleme < 1 sn.
- Tek kiracıda 500 eşzamanlı kullanıcı; platform genelinde yatay ölçeklenebilir.
- Entegrasyon kuyruğu: resmî sistem kesintisinde veri kaybı olmadan bekletme ve otomatik yeniden gönderim.

## 7. Konfigürasyon ve Çok Kiracılık
- Kurum bazında: modül açma/kapama, rol şablonları, form şablonları, alarm eşikleri, fiyat listeleri, bildirim şablonları, marka (logo/renk), dil.
- Platform yönetimi (bizim tarafımız): kiracı açma, abonelik/paket, mevzuat kütüphanesi güncellemeleri, global şablonlar, destek erişimi (destek personelinin kiracı verisine erişimi **kurumun süreli izniyle** ve loglanarak).

## 8. Kalite Güvence
- Otomatik testler (birim, entegrasyon, uçtan uca), özellikle yetki kuralları için kapsamlı test seti (“hekim olmayan kullanıcı tanıyı göremez” gibi kurallar test ile güvence altında).
- Kurumsal hesaplamalar (hakediş, SGK katılım payı, izin hakkı) için referans senaryolu testler.
- Sürüm notları ve değişiklik yönetimi; kritik değişikliklerde kurumlara önceden bildirim.
