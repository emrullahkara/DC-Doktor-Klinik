# 11 — Alınan Kararlar

| # | Konu | Karar | Tasarıma Etkisi |
|---|---|---|---|
| K1 | İş modeli | **Çok kliniğe satılacak SaaS ürünü** | Çok kiracılı mimari, abonelik/paket yönetimi, self-servis kayıt sihirbazı, platform yönetim paneli, destek erişim modeli |
| K2 | Kurum tipleri | **Tüm kurum tipleri tek uygulamada.** Kayıtta seçilen kurum tipi (tıp merkezi, diş, estetik, veteriner, evde sağlık…) o tipe ait modülleri, alanları, formları, rolleri ve mevzuat kurallarını otomatik getirir | “Kurum Tipi Profili” motoru çekirdeğin parçası (bkz. aşağıda) |
| K3 | Resmî entegrasyonlar | **Başlangıçta tescilli bir aracı entegrasyon servisi** kullanılacak; ileride kendi tescilimize geçiş opsiyonu açık tutulacak | Entegrasyon katmanı “sağlayıcı bağımsız” adaptör yapısında kurulur |
| K4 | Geliştirme ve platform | **Kodu Claude yazacak; önce web** (tablet uyumlu), mobil uygulamalar sonraki fazda | Duyarlı web arayüzü; mobil için API’ler baştan hazır |
| K5 | Muhasebe | **Ön muhasebe + aktarım.** Resmî defter ve bordro dış programlarda | Finans modülü kapsamı sabit (bkz. 04.6) |
| K6 | Ek özellik | **Çok dil ilk sürümde:** Türkçe, İngilizce, Arapça (sağdan sola), Rusça, Almanca | Arayüz, şablon ve belgelerde i18n baştan; Arapça için RTL düzen |
| K7 | Marka | **“DC Doktor Klinik” ürün adıdır;** logo/renk kimliği tarafımızdan önerilecek | Tasarım sistemi taslağı Faz 0’da |
| K8 | Hukuk ve pilot | Şimdilik avukat ve pilot kurum yok. **Hukuki metin taslakları Claude tarafından hazırlanacak**, canlıya çıkmadan önce hukukçu onayı alınacak | Tüm metinlerde “taslak – hukuki onay bekliyor” durumu; onaysız şablon canlı kiracıda kullanılamaz |

## Kurum Tipi Profili Motoru (K2’nin Tasarımı)

Kurum kaydında (veya sonradan şube eklerken) bir ya da birden fazla **kurum tipi** seçilir. Her tip bir **profil paketidir**:

| Profil İçeriği | Örnek: Diş Kliniği | Örnek: Veteriner Klinik |
|---|---|---|
| Açılan modüller | Diş modülü, radyasyon, sterilizasyon, protez lab | Veteriner modülü, yatılı/pansiyon, pet-shop |
| Hasta modeli | Kişi | Sahip + Hayvan |
| Kaynak tipleri | Ünit, röntgen cihazı | Muayene masası, kafes, ameliyathane |
| Roller ve varsayılan yetkiler | Diş hekimi, ağız-diş asistanı | Veteriner hekim, veteriner teknikeri |
| Form ve muayene şablonları | Diş muayene, periodontal şema | Türe göre muayene şablonları |
| Onam şablonları | İmplant, kanal, çekim… | Anestezi, cerrahi, ötanazi… |
| Hizmet kataloğu ve tarife | TDB tarifesi kodları | Veteriner hekimler tarifesi |
| Zorunlu belgeler | Mesul müdür, NDK lisansı, dozimetre | Sorumlu veteriner hekim, ruhsat |
| Mevzuat kuralları ve resmî entegrasyonlar | e-Nabız, ÜTS (implant) | Hayvan kayıt sistemleri, veteriner reçete |
| Komuta Merkezi kartları | Tedavi planı kabul oranı, lab gecikmeleri | Yatılı hayvanlar, aşı hatırlatmaları |

Kurallar:
- Birden fazla tip seçilebilir (ör. tıp merkezi + medikal estetik ünitesi); profiller birleşir.
- Tip, **şube bazındadır** (bir işletmenin bir şubesi diş, diğeri veteriner olabilir).
- Profiller kod değil **veri/konfigürasyon** olarak tutulur; yeni kurum tipi (ör. fizik tedavi merkezi) kod değişikliği olmadan eklenebilir.
- Kayıt sihirbazı: kurum tipi → şube bilgileri → mesul müdür → personel davet → hizmet/fiyat listesi (profil varsayılanlarından) → ilk randevu. Hedef: küçük kurumda 30 dakikada kullanıma başlama.

## SaaS Katmanı (K1’in Tasarımı)
- **Platform yönetim paneli** (bizim ekibimiz için): kiracılar, abonelik, kullanım, profil/şablon/mevzuat kütüphanesi yönetimi, duyuru, destek talepleri.
- **Abonelik paketleri** (öneri): şube başına temel ücret + aktif sağlık profesyoneli (hekim) sayısı + ek modüller (SGK/MEDULA, evde sağlık, turizm, SMS paketi).
- Deneme süresi, online ödeme ile abonelik, fatura.
- Destek personelinin kiracı verisine erişimi yalnızca kurumun süreli izniyle ve loglanarak.
- Kiracı ayrılırsa tüm verinin standart formatta teslimi ve sonra kontrollü imha.
