# 06 — Hukuki Metin ve Form Kütüphanesi

Sistem, aşağıdaki metinleri **sürümlü şablonlar** olarak içerir. Her şablonun: kodu, sürümü, yürürlük tarihi, dili, hangi kurum tipi/işlem için zorunlu olduğu, onaylayan hukukçu ve son gözden geçirme tarihi tutulur. Hastanın imzaladığı metin, imzaladığı andaki **sürümüyle birlikte** (hash’lenmiş PDF olarak) saklanır; şablon sonradan değişse de kanıt değişmez.

> Metinlerin nihai hukuki içeriği, bir sağlık hukuku avukatı tarafından kurumun faaliyet alanına göre onaylanmalıdır. Aşağıda her metnin **zorunlu içerik başlıkları** tanımlanmıştır.

## 1. KVKK Metinleri

### 1.1. Hasta Aydınlatma Metni
İçerik başlıkları:
- Veri sorumlusunun kimliği (unvan, adres, iletişim, varsa temsilci)
- İşlenen kişisel veri kategorileri (kimlik, iletişim, sağlık, finans, görsel, güvenlik kamerası…)
- İşleme amaçları (teşhis-tedavi, tıbbi hizmetlerin yürütülmesi, finansmanı, yasal yükümlülükler, hasta güvenliği, randevu ve bilgilendirme…)
- Hukuki sebepler (kanunda öngörülme, sözleşmenin ifası, hukuki yükümlülük, sağlık verisi için KVKK md. 6’daki şartlar — tıbbi teşhis, tedavi ve bakım hizmetleri, sağlık hizmetlerinin planlanması, yönetimi ve finansmanı amaçlarıyla sır saklama yükümlülüğü altındaki kişilerce işleme vb.)
- Toplama yöntemi (yüz yüze, web, telefon, cihazlar…)
- Aktarılan alıcı grupları (Sağlık Bakanlığı ve bağlı sistemler, SGK, özel sigorta şirketleri, dış laboratuvarlar, yasal merciler, hizmet sağlayıcılar)
- Yurt dışı aktarım varsa dayanağı
- İlgili kişinin hakları (KVKK md. 11) ve başvuru yöntemi

### 1.2. Açık Rıza Metinleri (her biri ayrı, “hizmet şartı” olmadan)
- Ticari elektronik ileti / kampanya bilgilendirmesi
- Fotoğraf/görüntünün tanıtım, eğitim veya bilimsel yayında kullanımı (anonim/anonim olmayan ayrımı)
- Tedavi görüntülerinin sosyal medyada kullanılması
- Yurt dışı aktarım (hukuki sebep gerektiriyorsa)
- Tele-tıp görüşmesinin kaydedilmesi
- Hasta yakınlarına bilgi verilmesi (kime, hangi kapsamda)
- Biyometrik verinin kullanımı (varsa — personel için ayrı metin)
- Bilimsel araştırma / klinik çalışma katılımı (etik kurul süreçleriyle birlikte)

### 1.3. Diğer KVKK Metinleri
- Çalışan aydınlatma metni + gerekiyorsa çalışan açık rıza metinleri
- Çalışan adayı (CV) aydınlatma metni
- Tedarikçi / iş ortağı aydınlatma metni
- Web sitesi ve mobil uygulama aydınlatma metni + çerez politikası + çerez tercih paneli
- Kamera (CCTV) aydınlatma levhası metni
- Aday hasta (lead) aydınlatma metni
- Ziyaretçi / refakatçi aydınlatma metni
- Kişisel veri saklama ve imha politikası
- Özel nitelikli kişisel verilerin korunması politikası
- Bilgi güvenliği politikası
- Veri ihlali müdahale planı
- İlgili kişi başvuru formu ve cevap şablonları
- Veri işleyen sözleşmesi (dış hizmet sağlayıcılar için)
- Personel gizlilik ve KVKK taahhütnamesi

## 2. Hasta Hakları ve Onam Metinleri

### 2.1. Genel Onam (Kurum Kabul Formu)
Kurum kuralları, genel muayene ve rutin tetkiklere onam, ödeme koşulları, kişisel eşyalar, hasta hakları ve sorumlulukları, şikâyet kanalları.

### 2.2. İşleme Özel Aydınlatılmış Onam Formları — Zorunlu İçerik
1. Hastanın/temsilcinin kimliği
2. Tanı / ön tanı
3. Önerilen işlemin adı ve açıklaması (hastanın anlayacağı dilde)
4. İşlemin amacı ve beklenen fayda
5. Başarı olasılığı (varsa)
6. **Olası riskler ve komplikasyonlar** (sık görülen + nadir ama ciddi)
7. Alternatif tedaviler ve bunların riskleri
8. İşlemin yapılmamasının olası sonuçları
9. Anestezi/sedasyon türü ve riskleri (varsa ayrı form)
10. Tahmini süre, iyileşme süreci, işlem sonrası dikkat edilecekler
11. İşlemi yapacak hekimin adı (ve varsa asistan/eğitim durumu)
12. Kullanılacak ürün/implant bilgisi (marka/tip — estetik ve diş)
13. Ücret bilgisi ve ek ücret gerektirebilecek durumlar
14. Fotoğraf çekimi (tıbbi kayıt amaçlı) bilgilendirmesi
15. Hastanın soru sorma imkânı bulduğu ve yanıt aldığı beyanı
16. Onamın her zaman geri alınabileceği bilgisi
17. Tarih, saat, imzalar (hasta/temsilci, hekim, gerekirse tercüman ve şahit)

### 2.3. Önerilen Başlangıç Onam Seti
**Genel tıp:** küçük cerrahi girişim, lokal anestezi, sedasyon, enjeksiyon/infüzyon tedavisi, aşı uygulaması, kan alma (pediatrik), biyopsi, endoskopik işlemler (varsa), ortopedik enjeksiyonlar, kontrast madde uygulaması.
**Diş:** genel diş tedavisi, diş çekimi, gömülü diş cerrahisi, kanal tedavisi, implant cerrahisi, kemik grefti/sinüs lifting, periodontal cerrahi, protez, ortodontik tedavi, şeffaf plak, beyazlatma, lamina/porselen veneer, pedodonti (çocuk — veli), genel anestezi/sedasyon altında diş tedavisi.
**Estetik:** botulinum toksin, dolgu (HA), iplik askı, mezoterapi, PRP, kimyasal peeling, lazer epilasyon, lazer cilt yenileme, radyofrekans/HIFU, leke tedavisi, dövme silme, saç ekimi (cerrahi yetki dahilinde), kilo verme uygulamaları.
**Veteriner:** genel muayene ve tedavi onayı, anestezi/sedasyon, cerrahi operasyon, kısırlaştırma, diş işlemleri, yatılı tedavi ve pansiyon sözleşmesi, **ötanazi onam formu**, nekropsi onayı, kan transfüzyonu, deneysel/alternatif tedavi, kadavra işlemleri (kremasyon/defin) talimatı.
**Evde sağlık:** evde sağlık hizmet sözleşmesi, ev ortamında invaziv uygulama onamı, cihaz zimmet/kira sözleşmesi, hasta yakını bakım sorumluluğu beyanı.
**Diğer:** tedaviyi ret beyanı (kendi isteğiyle ayrılma / tedaviyi reddetme formu), tele-tıp onamı, fotoğraf/video çekimi onamı, klinik araştırma onamı (etik kurul formatı), refakatçi taahhüdü.

### 2.4. Özel Durumlar
- **18 yaş altı / kısıtlı:** Veli/vasi imzası + mümkünse çocuğun görüşü; acil durum istisnası kaydı.
- **Acil durumda onam alınamaması:** Hekimin gerekçeli acil müdahale tutanağı.
- **Türkçe bilmeyen hasta:** Hastanın dilinde metin veya tercüman beyanı ve imzası.
- **Okuma-yazma bilmeyen:** Şahitli okuma tutanağı ve parmak izi seçeneği.

## 3. Sözleşmeler
- Paket/seans hizmet sözleşmesi (iptal-iade koşulları, süre, devir)
- Tedavi planı ve ödeme planı sözleşmesi (taksit, senet)
- Mesafeli satış sözleşmesi ve ön bilgilendirme (online ödeme alınıyorsa, uygulanabildiği ölçüde)
- Sağlık turizmi hizmet sözleşmesi (çok dilli; tedavi, konaklama, transfer, komplikasyon halinde sorumluluk)
- Anlaşmalı kurum sözleşmesi
- Hekim hizmet sözleşmesi (serbest çalışan hekim: hakediş, çalışma günleri, hasta devri, gizlilik, sigorta, ayrılma)
- Personel iş sözleşmesi
- Dış lab / protez lab sözleşmesi (+ veri işleyen hükümleri)
- Tıbbi atık firması sözleşmesi, OSGB sözleşmesi, cihaz bakım sözleşmesi
- Veteriner pansiyon sözleşmesi (aşı koşulu, sorumluluk sınırları, terk edilen hayvan hükmü)

## 4. Kurum İçi Politika ve Prosedürler (Doküman Yönetimi ile)
Hasta kimlik doğrulama, güvenli cerrahi, ilaç yönetimi ve yüksek riskli ilaçlar, narkotik ilaç yönetimi, soğuk zincir, enfeksiyon kontrol ve el hijyeni, sterilizasyon, tıbbi atık, acil durum ve afet, mavi kod / beyaz kod, hasta hakları ve şikâyet, tıbbi kayıt ve arşiv, bilgi güvenliği, kişisel veri saklama-imha, cihaz yönetimi, eğitim, personel oryantasyonu, radyasyon güvenliği, düşme önleme, iletişim (kritik değer bildirimi), sosyal medya ve tanıtım politikası.

## 5. Tutanak ve Formlar
Kasa farkı tutanağı, sayım tutanağı, imha tutanağı (ilaç/malzeme), narkotik devir teslim, mal kabul/hasarlı ürün tutanağı, olay bildirim formu, şikâyet formu, kesici-delici yaralanma formu, iş kazası tutanağı, zimmet tutanağı, cihaz arıza formu, eğitim katılım formu, tatbikat raporu, hasta eşyası teslim tutanağı, kendi isteğiyle ayrılma formu, evde sağlık ziyaret formu, sevk formu.
