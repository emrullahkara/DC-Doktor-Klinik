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
| K9 | Fiyatlandırma | **Şube başına temel ücret + aktif hekim sayısı + isteğe bağlı ek modüller** (SGK/MEDULA, evde sağlık, turizm, SMS paketi) | Abonelik motoru bu üç bileşeni ölçer ve faturalar |
| K10 | Barındırma | **Türkiye’de bulut**; somut sağlayıcı canlıya yakın karşılaştırılıp seçilecek | Altyapı sağlayıcıdan bağımsız (konteyner + IaC) kurulur |
| K11 | Teknoloji | Claude’a bırakıldı → **TypeScript + NestJS (modüler monolit), PostgreSQL, React + Next.js**; mobil için ileride React Native | Tek dil (TypeScript) ile arka uç, ön uç ve mobil arasında kod/tip paylaşımı |
| K12 | e-Fatura ve SGK | **Esnek yapı:** e-Fatura birden fazla entegratöre bağlanabilir adaptörle; **MEDULA açılıp kapatılabilen ek modül** (SGK anlaşması olmayan kurumda görünmez) | Entegratör seçimi sonraya; MEDULA Faz 2’de kalır |
| K13 | Sonraki adım | **Logo/renk önerisi + ekran taslakları** (Komuta Merkezi, randevu, muayene, kurum kayıt sihirbazı), onaydan sonra kodlama | Faz 0 sırası belirlendi |
| K14 | Veteriner önceliği | **Veteriner çekirdekte kalır, öncelik insan sağlığı kliniklerindedir.** Ortak altyapı (hasta/sahip–hayvan, randevu, stok, kasa, yetki) her iki tarafa hizmet eder; veterinere özgü modüller (yatılı tedavi, pansiyon, pet-shop, aşı hatırlatma, TOB kayıt sistemleri) insan sağlığı ürünü satışa hazır olduktan sonra, ayrı bir “Vet” sürümü/tanıtımıyla | Faz 1–2 poliklinik, diş, estetik odaklı; veteriner özel modülleri Faz 3 |
| K15 | Belge süresi dolunca | **Yalnızca süresi geçmiş belge işlem askıya alır; hiç yüklenmemiş belge uyarı üretir.** Şimdilik askıya alan tek belge malpraktis sigortasıdır (tanı, reçete, rapor, onam, tıbbi kayda giriş kapanır; görüntüleme açık kalır). Personel yöneticisi kendi belgesini de ekleyebilir; bu kayıt “kişinin kendisi ekledi” olarak işaretlenir ve denetim izine dosya özetiyle yazılır | Yeni açılan kurum ilk gün kilitlenmez; tek hekimli muayenehanede sahip-hekim kendi poliçesini yenileyebilir. Kurum bazında “yalnızca uyar” politikası ileride ayar olarak eklenecek |
| K16 | Nöbet kuralları | **Yasal varsayılanlar:** haftada en çok 45 saat, nöbet sonrası en az 24 saat dinlenme, en çok 2 gece üst üste; kurum ayarlardan değiştirebilir. Çakışan görev ve izinli güne görev veritabanında engellenir; süre kuralı ihlali engellemez, onaylayanın gerekçesiyle yayınlanabilir. Çizelgeyi onaya gönderen onaylayamaz | İhlalle onay ve gerekçe denetim izine yazılır; icap çalışma süresine sayılmaz |
| K17 | Olay bildirimi | **İsimsiz bildirim seçeneği olacak.** Bildiren isterse adı kalite ekibinden gizlenir; sistem kaydı denetim izinde kalır (suçlamasız bildirim kültürü, SKS) | Kalite modülünde bildiren kimliği ayrı ve erişimi kısıtlı tutulur |
| K18 | Sürüm yönetimi | **Bir `main` dalı açılıp çalışma PR ile birleştirilecek** | Çalışma dalı → PR → main |
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
