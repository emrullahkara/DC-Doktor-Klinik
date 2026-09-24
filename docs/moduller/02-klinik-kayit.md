# 04.2 — Klinik / Tıbbi Kayıt (Elektronik Sağlık Kaydı)

## 1. Muayene Kaydı (Yapılandırılmış)

Her başvuru (vizit) şu bölümleri içerir; branşa göre şablonlanır:

| Bölüm | İçerik | Kodlama |
|---|---|---|
| Başvuru bilgisi | Tarih/saat, başvuru tipi, hekim, birim, güvence, protokol no | — |
| Şikâyet | Hastanın ifadesiyle ana şikâyet, süre | — |
| Anamnez / Öykü | Hikâye, özgeçmiş, soygeçmiş, alışkanlıklar, ilaçlar, alerjiler | Alerjiler kodlu |
| Vital bulgular | Ateş, nabız, TA, SpO2, solunum, ağrı skoru, boy, kilo, VKİ | LOINC uyumlu |
| Fizik muayene | Sistem bazlı (şablon + serbest metin), çizim/işaretleme | — |
| Tanı | Ön tanı / kesin tanı, birincil / ikincil | **ICD-10** (e-Nabız ile uyumlu) |
| İstemler | Laboratuvar, görüntüleme, konsültasyon | SUT / kurum hizmet kodları |
| Uygulanan işlemler | İşlem, malzeme, ilaç, uygulayan kişi | SUT kodu + kurum kodu, ATC, barkod/lot |
| Tedavi planı | İlaç, öneri, diyet, egzersiz, kontrol tarihi | — |
| Reçete | e-Reçete (normal/kırmızı/yeşil/mor/turuncu) | ATC, e-Reçete sistemi |
| Rapor | İstirahat raporu, durum bildirir rapor, ilaç raporu, sağlık raporu (sürücü, iş vb. — yetki dahilinde) | e-Rapor |
| Hemşirelik notu | Uygulamalar, gözlemler, eğitim | — |
| Ekler | Fotoğraf, doküman, dış kurum raporu, görüntü | DICOM/PDF/JPG |

### 1.1. Kayıt Kuralları
- **Taslak → İmzalı** yaşam döngüsü. İmzalı kayıt değiştirilemez; “ek/düzeltme notu” ile güncellenir, eski sürüm saklanır.
- Hekim adına asistan/hemşire yazabilir (“dikte”), ancak **hekim onaylayıp imzalamadan** kesinleşmez.
- Muayene süresi, kaydın açılış-kapanış zamanlarından otomatik ölçülür.
- Tanı konmadan işlem/reçete kaydedilemez (e-Nabız ve SGK zorunluluğu).
- Klinik karar destek: ilaç-alerji, ilaç-ilaç etkileşimi, gebelikte kontrendike ilaç, böbrek/karaciğer doz uyarısı, pediatrik kilo bazlı doz hesaplama, mükerrer tetkik uyarısı.
- Hazır şablonlar ve kişisel kısayollar (sık kullanılan tanı/reçete setleri) — hekimin hızı için kritik.
- Sesli dikte / yapay zekâ destekli not özetleme (opsiyonel, hekim onayı zorunlu, veri yurt içinde işlenmeli).

## 2. Reçete
- **e-Reçete** entegrasyonu (Sağlık Bakanlığı e-Reçete sistemi) — e-imza/mobil imza ile.
- Renkli reçeteler (kırmızı/yeşil — kontrollü ilaçlar) için ek kontroller ve kayıtlar.
- Reçete şablonları, tekrar reçete (kronik).
- Reçete çıktısı / hastaya SMS ile reçete numarası.
- Veteriner reçete: ayrı modelde (bkz. Veteriner modülü) ve ilgili bakanlık sistemleri.

## 3. Raporlar ve Belgeler
- İstirahat raporu (SGK e-Rapor / iş göremezlik — kurumun yetkisi dahilinde)
- Durum bildirir rapor, sağlık kurulu gerektirmeyen raporlar
- Epikriz / taburcu özeti (günübirlik işlemlerde)
- Sevk belgesi, konsültasyon notu
- Kurumsal belgeler: “Muayene olmuştur” yazısı, fatura dökümü, yurt dışı sigorta için İngilizce özet
- Her belge **şablon + sürüm + imza** ile üretilir; hasta portalında yayınlanması hekim onayına bağlıdır.

## 4. Onam (Rıza) Yönetimi
- Her işlem tipine bir veya birden fazla **onam şablonu** bağlanır (bkz. [Hukuki Metinler](../06-hukuki-metinler.md)).
- Onam; işlemin adı, amacı, faydası, riskleri ve komplikasyonları, alternatifleri, reddin sonuçları, tahmini süre, işlemi yapacak hekim, ücret bilgisini içerir.
- İmza yöntemleri: tablet üzerinde biyometrik imza, SMS doğrulama kodlu elektronik onay, ıslak imza + tarama.
- **İmza zamanı işlemden önce olmalıdır**; sistem işlem kaydı açılırken onam varlığını ve geçerliliğini kontrol eder.
- Onamı açıklayan hekimin adı ve açıklama zamanı kayda geçer; hastanın soruları not edilebilir.
- Onamdan vazgeçme (geri çekme) kaydı.
- Estetik işlemlerde **düşünme süresi** (ör. onam ile işlem arasında asgari süre) parametre olarak tanımlanabilir.
- Okuma yazma bilmeyen / Türkçe bilmeyen hasta: tercüman / şahit bilgisi ve imzası.

## 5. Laboratuvar ve Görüntüleme
- İstem → numune barkodu → numune alma (kim/ne zaman) → iç lab veya dış lab gönderimi → sonuç (manuel/HL7/dış lab portalı) → hekim onayı → hastaya yayın.
- Referans aralıkları yaş/cinsiyete göre; **kritik değer** alarmı.
- Dış laboratuvar anlaşmaları: fiyat, gönderim listesi, sonuç eşleşme, maliyet.
- Görüntüleme: DICOM görüntü arşivi (PACS entegrasyonu veya hafif bulut PACS), rapor, diş röntgeni/panoramik/CBCT.
- Teleradyoloji (dış raportör) opsiyonel.

## 6. Günübirlik Müdahale / Küçük Cerrahi
- Pre-op kontrol listesi (açlık, onam, alerji, taraf işaretleme)
- **Güvenli cerrahi kontrol listesi** (WHO modeli: giriş – kesi öncesi – çıkış)
- Anestezi/sedasyon kaydı (lokal/sedasyon), monitörizasyon değerleri
- Kullanılan malzeme ve implant (ÜTS bildirimi), sayım (spanç/alet) kaydı
- Post-op gözlem ve taburculuk kriterleri, taburculuk eğitimi, kontrol planı
- Komplikasyon kaydı → kalite modülüne otomatik düşer

## 7. Kronik Hastalık ve Takip Programları
- Takip protokolleri: diyabet (HbA1c periyodu), hipertansiyon, gebelik takibi, çocuk aşı ve gelişim izlemi, obezite/diyet programları.
- Program, hastaya otomatik görev ve hatırlatma üretir; kaçan kontroller hekim panosunda listelenir.

## 8. Tele-Tıp (Uzaktan Sağlık Hizmeti)
Mevzuatın izin verdiği kapsamda ve yetki belgesi gerekiyorsa buna bağlı olarak: görüntülü görüşme, ön/son görüşme, kontrol. Görüşme kaydı yapılacaksa ayrı açık rıza alınır. Kimlik doğrulama zorunlu.
