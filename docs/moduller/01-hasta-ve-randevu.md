# 04.1 — Hasta Yönetimi ve Randevu

## 1. Hasta Kaydı

### 1.1. Kimlik Bilgileri
- **T.C. Kimlik No** (MERNİS/KPS doğrulaması — yetkili kurumlar için), **Yabancı Kimlik No (99…)**, **pasaport** (turist), **kimliksiz/geçici kayıt** (acil, bilinmeyen hasta — sonra birleştirme).
- Ad, soyad, doğum tarihi, cinsiyet, uyruk, anne/baba adı (SGK ve e-Nabız için gerekli alanlar).
- İletişim: cep telefonu (doğrulamalı), e-posta, adres (UAVT adres kodu opsiyonel), tercih edilen dil, tercih edilen iletişim kanalı.
- **Acil durumda aranacak kişi**, yakınlık derecesi.
- **Vasi / veli / yasal temsilci** (18 yaş altı, kısıtlı): temsil belgesi yüklenir; onamları temsilci imzalar. 18 yaşını doldurunca sistem otomatik uyarır, temsil yetkisi sonlanır.
- Sosyal güvence: SGK (müstahaklık sorgusu MEDULA ile), özel sigorta (poliçe no, geçerlilik, teminat), kurumsal anlaşma (çalıştığı firma), ücretli.
- Kan grubu, **alerjiler** (ilaç/gıda/lateks — kodlu), kronik hastalıklar, sürekli kullanılan ilaçlar, gebelik/emzirme durumu, implant/pacemaker (MR ve bazı estetik işlemler için kritik), sigara/alkol.
- Engellilik durumu, özel ihtiyaçlar (tekerlekli sandalye, işaret dili, refakatçi).
- Nereden duydu (kampanya/referans/sosyal medya) — pazarlama analizi için, rızaya bağlı.

### 1.2. Uyarı Bayrakları (Hasta kartının en üstünde, kırmızı şerit)
Alerji, kan sulandırıcı kullanımı, bulaşıcı hastalık (izolasyon önlemi — yalnızca klinik personele), düşme riski, şiddet/agresyon geçmişi (personel güvenliği), ödeme sorunu (yalnızca idari personel görür), VIP/kısıtlı kayıt.

### 1.3. Mükerrer Kayıt Önleme
Kayıt sırasında ad-soyad-doğum tarihi-telefon benzerlik kontrolü; olası mükerrer kayıt listelenir. Birleştirme yalnızca yetkili onayıyla ve geri alınabilir şekilde yapılır.

### 1.4. Aile ve İlişki Bağlantıları
Aile üyeleri bağlanabilir (ortak fatura, aile paketi, çocuk aşı takibi). Veterinerde: bir sahip → birden fazla hayvan; bir hayvan → birden fazla sahip (aile).

### 1.5. KVKK Adımları (kayıt anında)
- Aydınlatma metni sunulur ve **sunulduğu kayıt altına alınır** (tablet imza, SMS onay kodu ya da ıslak imza taraması).
- Açık rıza gerektiren işlemler için **ayrı ayrı** rıza alınır (pazarlama iletişimi, fotoğraf kullanımı, yurt dışına aktarım, bilimsel yayın, vb.). Rıza reddi hizmet almayı engellemez.
- Rıza durumu hasta kartında görünür; geri çekme tarihi ve kanalı kaydedilir.

## 2. Randevu Sistemi

### 2.1. Takvim Kaynakları
Randevu yalnızca hekime değil, **kaynak kombinasyonuna** verilir: Hekim + Oda/Ünit + Cihaz (ör. lazer) + Asistan. Biri doluysa slot açılmaz.

### 2.2. Randevu Tipleri
İlk muayene, kontrol, işlem (süresi işleme göre), seans (paket), online görüşme (tele-tıp — mevzuatın izin verdiği kapsamda), ev ziyareti, grup seansı, veteriner aşı, pansiyon girişi.

### 2.3. Randevu Kanalları
- Resepsiyon / çağrı merkezi
- Kurumun web sitesi (gömülü widget) ve mobil uygulama
- WhatsApp Business bot (opsiyonel)
- Hekimin kendi takvimi (kontrol randevusu muayene sonunda)
- Sağlık turizmi aracı kurum portalı

### 2.4. Kurallar
- Hekim çalışma şablonu (haftalık), izin/nöbet/kongre blokajları nöbet modülünden otomatik gelir.
- İşlem bazlı süre + hazırlık/temizlik tamponu (ör. diş ünit dezenfeksiyonu 10 dk).
- Çift randevu (overbooking) izni hekim bazında.
- Bekleme listesi: iptal olunca listedeki hastaya otomatik SMS teklif.
- No-show takibi: X kez gelmeyen hastaya ön ödemeli randevu kuralı (ayarlanabilir).
- Randevu hatırlatma: 24 saat ve 2 saat önce SMS/WhatsApp, teyit linki ile (Evet/İptal/Değiştir).
- Online ön ödeme / kapora (estetik ve diş işlemlerinde yaygın) — sanal POS.

### 2.5. Kabul ve Bekleme
- Kabulde: kimlik doğrulama, güvence kontrolü (SGK müstahaklık/provizyon, özel sigorta onay), ön ödeme, onam formlarının imzaya sunulması.
- **Bekleme ekranı (TV):** Sıra numarası ile çağrı (hasta adı gösterilmez — KVKK), sesli anons.
- Kiosk ile kendi kendine kabul (opsiyonel, QR randevu kodu).
- Bekleme süresi ölçümü: geliş → muayeneye alınış → çıkış. Hedef süre aşımında sekretere uyarı.

## 3. Hasta Portalı / Mobil Uygulama
- Randevu al/iptal et, geçmiş randevular
- Hekimin yayınladığı sonuçlar, reçeteler, raporlar, epikriz (PDF)
- Onam formlarını önceden okuma ve imzalama
- Fatura, ödeme, taksit planı, online ödeme
- Anket ve şikâyet/öneri
- KVKK hakları başvurusu (bilgi talebi, düzeltme, silme, itiraz)
- Kronik hasta: ilaç hatırlatıcı, ölçüm girişi (tansiyon, şeker) → hekime eşik aşımı uyarısı
- Veteriner: hayvan profili, aşı takvimi, yatılı hayvanın günlük fotoğraf/durum bildirimi

## 4. Sevk ve Transfer
- Başka kuruma sevk: sevk formu, gerekçe, gönderilen belgeler, ambulans çağrısı kaydı.
- Kurum içi yönlendirme (branş → branş): konsültasyon isteği.
- Gelen sevk: dış kurumdan gelen hasta ve belgeleri.
