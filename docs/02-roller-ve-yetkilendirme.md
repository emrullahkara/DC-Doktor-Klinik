# 02 — Organizasyon, Roller ve Yetkilendirme

Bu bölüm, “kliniğin sahibi uğramıyor, belki hekim bile değil; başhekim, genel müdür, mesul müdür kim, kim neye dokunabilir?” sorusunun cevabıdır.

## 1. Üç Farklı Otorite: İşletme, Hukuk, Tıp

Sağlık kuruluşunda üç ayrı otorite hattı vardır ve yazılım bunları **birbirine karıştırmamalıdır**:

| Otorite Hattı | Kim | Sorumlu Olduğu | Dokunamadığı |
|---|---|---|---|
| **İşletme (Mülkiyet/Yönetim)** | Kurum Sahibi, Ortaklar, Genel Müdür / İşletme Müdürü | Para, yatırım, personel istihdamı, fiyat politikası, tedarik, strateji | Hastanın tıbbi kaydı, tıbbi karar, reçete, rapor |
| **Hukuki (Bakanlığa karşı sorumlu)** | **Mesul Müdür** (ve yardımcısı) | Kuruluşun mevzuata uygun çalışması, ruhsat, personel bildirimleri (ÇKYS), tıbbi kayıtların güvenliği, Bakanlık denetimleri, tıbbi atık, olay bildirimleri | Hekimin bireysel tıbbi kararını değiştirmek (denetler ama yerine karar vermez) |
| **Tıbbi (Klinik)** | Başhekim / Tıbbi Direktör, Branş Sorumluları, Hekimler, Başhemşire | Tıbbi protokoller, klinik kalite, hekim/hemşire görev dağılımı, tıbbi kayıt kalitesi | Finans kararları (görür ama yönetmez — yetki verilmedikçe) |

> **Pratik not:** Küçük kurumda bu roller aynı kişide birleşebilir (ör. muayenehane hekimi = sahip = mesul müdür). Sistem bir kişiye birden fazla rol atamayı destekler; yetkiler birleşir, ancak **denetim izinde her işlemin hangi rol sıfatıyla yapıldığı** kaydedilir.

> **Yasal not:** Poliklinik/tıp merkezi/diş merkezi gibi kuruluşlarda mesul müdürün hekim/diş hekimi olması ve Bakanlığa bildirilmesi zorunludur. Veteriner kuruluşlarda da sorumlu veteriner hekim bulunur. Sistem, mesul müdür atanmamış veya belgesi süresi geçmiş bir kurumda kırmızı alarm üretir.

## 2. Organizasyon Hiyerarşisi (Veri Yapısı)

```
İşletme (Tüzel/Gerçek kişi, vergi no)
 └── Kurum / Şube (her birinin ayrı ruhsatı, mesul müdürü, adresi)
      ├── Birim / Bölüm (Dahiliye, Diş, Estetik, Lab, Röntgen, Evde Sağlık Ekibi 1, Veteriner Yatılı Ünite…)
      │    └── Oda / Ünit / Kafes (Muayene Odası 1, Diş Ünit 3, Kafes K-12…)
      └── Depolar (Ana depo, ilaç dolabı, narkotik kasası, buzdolabı…)
```

- Kullanıcı yetkileri **İşletme → Şube → Birim** kapsamında verilir. Örn. “Hemşire — yalnızca Kadıköy şubesi, Diş birimi”.
- Bir kullanıcı birden fazla şubede farklı rollerle çalışabilir (ör. A şubesinde hekim, B şubesinde mesul müdür).

## 3. Rol Kataloğu

### 3.1. Yönetim Rolleri
| Rol | Açıklama |
|---|---|
| **Kurum Sahibi / Ortak** | Tüm işletme verisini görür (finans, performans, stok, personel). Tıbbi veriyi yalnızca anonim/toplu görür (hekim ise ve ayrıca “Hekim” rolü atanmışsa kendi hastalarını görür). Kritik ayarları (fiyat listesi, kullanıcı açma, yetki verme) onaylar. |
| **Genel Müdür / İşletme Müdürü** | Günlük operasyonun sahibi. Personel, vardiya onayı, satın alma, fiyat önerisi, kampanya, raporlar. Tıbbi veri: anonim/toplu. |
| **Mesul Müdür (+ Yardımcısı)** | Hukuki sorumlu. Personel belgeleri, ÇKYS bildirimleri, olay bildirimleri, tıbbi atık, denetim dosyası, tıbbi kayıt erişim denetimi (log inceleme). Hekim olduğu için gerektiğinde tıbbi kayda **gerekçeli** erişebilir. |
| **Başhekim / Tıbbi Direktör** | Klinik protokoller, hekim görevlendirme, tıbbi kayıt kalite denetimi, konsültasyon, tıbbi şikâyet değerlendirmesi. Tüm hastaların tıbbi kaydını kurumsal denetim amacıyla görebilir (loglanır). |
| **Branş / Birim Sorumlusu** | Kendi biriminin randevu takvimi, hekim/hemşire planı, birim stoku. |
| **Başhemşire / Sorumlu Hemşire** | Hemşire, ebe, sağlık teknisyeni, hasta bakıcı nöbet/vardiya planı; ilaç uygulama denetimi; sterilizasyon ve enfeksiyon kontrol takibi. |

### 3.2. Sağlık Meslek Mensupları
| Rol | Yetki Özeti |
|---|---|
| **Uzman Hekim / Pratisyen Hekim** | Kendi hastaları (randevulu/atanmış/konsülte) için tam tıbbi kayıt; tanı, reçete, rapor, istem, onam. |
| **Diş Hekimi / Uzman Diş Hekimi** | Hekimle aynı + odontogram, tedavi planı, protez lab iş emri. |
| **Veteriner Hekim** | Hayvan tıbbi kaydı, aşı, reçete (veteriner), ötanazi kararı + onam, cerrahi. |
| **Veteriner Sağlık Teknikeri / Teknisyeni** | Hekim istemi doğrultusunda uygulama, bakım kaydı, yatılı hayvan takip çizelgesi. |
| **Hemşire / Ebe** | Hekim istemli ilaç uygulama, vital bulgu, pansuman, aşı uygulama (istemle), hemşirelik notu. Reçete yazamaz, tanı koyamaz. |
| **Sağlık Teknikeri / Teknisyeni** (Röntgen, Lab, Anestezi, Ağız-Diş Asistanı) | Kendi alanındaki uygulama kaydı (çekim, numune alma, sonuç girişi – onay hekimde). |
| **Psikolog / Diyetisyen / Fizyoterapist / Odyolog / Dil-Konuşma Terapisti** | Kendi danışanlarının kendi alan kayıtları; hekim kayıtlarını hekim paylaşırsa görür. |
| **Estetisyen / Güzellik Uzmanı** (medikal estetik kurumunda, mevzuatın izin verdiği işlemlerde) | Yalnızca kendisine atanan seans kaydı; tıbbi anamnezin sadece “kontrendikasyon uyarıları” özetini görür. |
| **Eczacı** (depolu büyük kurumlarda) | İlaç deposu, narkotik/psikotrop defteri, ilaç iade/imha. |

### 3.3. İdari ve Destek Roller
| Rol | Yetki Özeti |
|---|---|
| **Hasta Kabul / Sekreter / Resepsiyon** | Hasta demografik kaydı, randevu, kabul, provizyon (MEDULA), tahsilat (kasa yetkisi varsa), onam formunu imzaya sunma. **Tanı ve muayene notlarını göremez.** |
| **Çağrı Merkezi** | Randevu, hatırlatma, anket; hasta telefonu/adı; tıbbi veri yok. |
| **Vezne / Kasa** | Tahsilat, iade talebi (onaya düşer), gün sonu kasa kapanışı. |
| **Muhasebe / Finans** | Fatura, cari, tahsilat, gider, hakediş, SGK fatura dönemi, banka mutabakatı. Tanı görmez; **SGK faturası için gereken asgari kodları** (işlem kodu, ICD kodu) sistem otomatik iletir, muhasebeci tıbbi notu görmez. |
| **Satın Alma / Depo Sorumlusu** | Tedarikçi, sipariş, mal kabul, stok sayım, SKT. |
| **İnsan Kaynakları** | Özlük dosyası, sözleşme, izin, puantaj, bordro çıktısı, belge takibi. Personelin sağlık raporu gibi hassas özlük verisi ayrı yetkiyle. |
| **Kalite Sorumlusu** | SKS göstergeleri, olay bildirimleri, DÖF (düzeltici önleyici faaliyet), iç denetim, anket analizleri. |
| **Enfeksiyon Kontrol Hemşiresi** | Sterilizasyon kayıtları, el hijyeni gözlemi, enfeksiyon sürveyansı. |
| **İSG Uzmanı / İşyeri Hekimi** (genelde dış hizmet) | Risk değerlendirmesi, personel periyodik muayene, kaza/ramak kala kaydı, eğitim kayıtları. |
| **Radyasyon Güvenliği Sorumlusu** | Dozimetre sonuçları, cihaz lisansları, NDK yazışmaları. |
| **Hasta Bakıcı / Hasta Kabul Görevlisi** | Görev listesi, evde sağlıkta ziyaret check-in, hasta transfer kaydı. Tıbbi kayıt yok (yalnızca görev için gereken bakım notu). |
| **Temizlik Personeli** | Temizlik görev çizelgesi (QR ile oda temizlik onayı), vardiya, sarf talep. Hasta verisi yok. |
| **Güvenlik / Şoför** | Vardiya, araç ve rota (evde sağlık), ziyaret check-in. |
| **Bilgi İşlem / Sistem Yöneticisi** | Kullanıcı hesabı teknik yönetimi, cihaz/entegrasyon ayarı. **Tıbbi veriye erişemez.** Yetki verme işlemi yöneticinin onayıyla yapılır. |

### 3.4. Dış Kullanıcılar
| Rol | Yetki Özeti |
|---|---|
| **Hasta / Hasta Yakını (Portal & Mobil)** | Kendi randevusu, reçete/tahlil sonucu (hekim yayınladıysa), fatura, onam imzası, anket, KVKK başvurusu. Vasi/veli yetkisi ayrıca tanımlanır. |
| **Hayvan Sahibi (Veteriner Portalı)** | Hayvanlarının aşı karnesi, randevu, fatura, yatılı hayvan günlük durum güncellemesi/fotoğrafı. |
| **Dış Laboratuvar / Protez Laboratuvarı** | Yalnızca kendine gönderilen iş emri ve sonuç/iş teslim girişi. |
| **Anlaşmalı Kurum / Sigorta** | Yalnızca yetkilendirilmiş provizyon/fatura ekranları (API). |
| **Dış Denetçi / Mali Müşavir** | Süreli, salt-okunur, kapsamı sınırlı erişim (ör. yalnızca finans, 30 gün). |
| **Sağlık Turizmi Aracı Kuruluşu** | Yönlendirdiği hastaların randevu/durum bilgisi, komisyon ekstresi. |

## 4. Yetkilendirme Modeli

Sadece “rol = yetki listesi” yeterli değildir. Sağlıkta **bağlam** önemlidir. Model üç katmanlıdır:

1. **RBAC (Rol Bazlı):** Rol → izin seti (ör. `recete.yaz`, `fatura.iptal`, `stok.sayim`).
2. **Kapsam (Scope):** İzin hangi şube/birim için geçerli.
3. **ABAC (Nitelik Bazlı) Kurallar:**
   - **Tedavi ilişkisi kuralı:** Hekim/hemşire tıbbi kaydı yalnızca: randevusu olan, kendisine atanmış, konsültasyon istenmiş, aynı birimde aktif yatışta olan hasta için açabilir.
   - **Zaman kuralı:** Hemşire bir hastanın kaydını ziyaretin/yatışın bitiminden sonra X saat daha görebilir, sonra erişim kapanır.
   - **Hassas kayıt kuralı:** Psikiyatri, HIV/cinsel yolla bulaşan hastalık, gebelik sonlandırma, madde bağımlılığı, genetik test gibi kayıtlar “**Çok Gizli**” işaretlenir; yalnızca kaydı oluşturan hekim ve hastanın açıkça izin verdiği hekimler görür.
   - **Ünlü/VIP/personel hasta kuralı:** Kurum personeli veya kamuya mal olmuş kişi hasta olduğunda kayıt “Kısıtlı” olur; her açılış gerekçe ister ve mesul müdüre bildirim gider.
   - **Mesai/cihaz kuralı:** Belirli roller yalnızca kurum ağından veya kayıtlı cihazdan giriş yapabilir (ör. vezne).

### 4.1. Acil Erişim (Break-the-Glass)
Hekim, tedavi ilişkisi olmayan bir hastanın kaydını acil durumda açabilir:
- Gerekçe seçimi zorunlu (acil müdahale / konsültasyon / nöbet devri) + serbest metin.
- Erişim süreli (ör. 4 saat).
- Anında mesul müdür ve başhekime bildirim; haftalık “olağan dışı erişim raporu”.

### 4.2. Dört Göz (Çift Onay) Gerektiren İşlemler
| İşlem | Talep Eden | Onaylayan |
|---|---|---|
| Belirlenen oranın üzerinde indirim | Sekreter / Hekim | Genel Müdür (eşik ayarlanabilir) |
| Tahsil edilmiş ödemenin iadesi | Vezne | Genel Müdür / Muhasebe Müdürü |
| Kesilmiş faturanın iptali | Muhasebe | Genel Müdür |
| Fiyat listesinin değiştirilmesi | Genel Müdür | Sahip |
| Narkotik/psikotrop ilaç imha / sayım farkı | Eczacı / Başhemşire | Mesul Müdür |
| Stok sayım farkı kaydı (tutar eşiği üstü) | Depo | Genel Müdür |
| Tıbbi kaydın düzeltilmesi (imzalanmış kayıt) | Hekim | Otomatik: eski sürüm saklanır + başhekime bilgi |
| Yeni kullanıcıya yetki verilmesi / yetki yükseltme | İK / Bilgi İşlem | Genel Müdür (idari rol) veya Mesul Müdür (sağlık rolü) |
| Nöbet listesinin yayınlanması | Başhemşire / Birim Sorumlusu | Başhekim / Mesul Müdür |
| Hasta kaydının birleştirilmesi (mükerrer) | Sekreter | Mesul Müdür / Başhekim |
| KVKK kapsamında veri silme/anonimleştirme | Veri Sorumlusu Temsilcisi | Mesul Müdür + Hukuk |
| Toplu veri dışa aktarma (Excel/CSV) | Herkes | Genel Müdür (idari veri), Mesul Müdür (tıbbi veri) |

### 4.3. Görevler Ayrılığı (Segregation of Duties)
Aynı kişi aynı işlem zincirinin iki ucunda olamaz:
- Satın alma siparişini veren, mal kabulü onaylayamaz.
- Tahsilatı alan kişi, aynı tahsilatın iadesini onaylayamaz.
- Yetkiyi talep eden kişi kendi yetkisini onaylayamaz.

## 5. Yetki Matrisi (Özet)

Gösterim: **T** = Tam yetki, **G** = Görüntüleme, **K** = Kendi kaydı/ilişkili hastalar, **A** = Anonim/toplu, **O** = Onaylama, **—** = Erişim yok

| İşlev | Sahip | Genel Md. | Mesul Md. | Başhekim | Hekim | Başhemşire | Hemşire | Sekreter | Muhasebe | Depo | İK | Kalite | Destek | Bilgi İşlem |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Hasta demografik bilgisi | G | G | T | T | K | G | K | T | G* | — | — | G | — | — |
| Tanı / muayene notu | A | A | G (gerekçeli) | T | K | K | K | — | — | — | — | A | — | — |
| Çok Gizli kayıtlar | — | — | Gerekçeli | Gerekçeli | Yalnız sahibi hekim | — | — | — | — | — | — | — | — | — |
| Reçete / rapor yazma | — | — | — | T | K | — | — | — | — | — | — | — | — | — |
| İlaç uygulama kaydı | — | — | G | G | K | T | K | — | — | — | — | G | — | — |
| Randevu yönetimi | G | T | G | T | K | G | G | T | — | — | — | — | — | — |
| Fiyat listesi | O | T | G | G | G | — | — | G | G | — | — | — | — | — |
| İndirim uygulama | O | O | — | — | Eşik içi | — | — | Eşik içi | — | — | — | — | — | — |
| Tahsilat | G | G | — | — | — | — | — | T (kasa) | T | — | — | — | — | — |
| İade / fatura iptal | O | O | — | — | — | — | — | Talep | Talep | — | — | — | — | — |
| Gelir-gider, kârlılık | T | T | A | A | Kendi hakedişi | — | — | — | T | — | — | — | — | — |
| Hekim hakedişi | T | T | — | G | K | — | — | — | T | — | — | — | — | — |
| Stok / satın alma | G | O | G | G | Talep | Talep/G | Talep | — | G | T | — | — | Talep | — |
| Narkotik defteri | — | — | O | G | K | T | K | — | — | — | — | G | — | — |
| Personel özlük | G | T | G | G (hekimler) | K | G (ekibi) | K | K | G (bordro) | K | T | — | K | — |
| Nöbet / vardiya planı | G | O | O | O | K | T (hemşire) | K | K | G | K | G | — | K | — |
| Personel belge takibi | G | T | T | G | K | G | K | K | — | K | T | G | K | — |
| Olay bildirimi | A | A | T | T | Bildir | Bildir/G | Bildir | Bildir | Bildir | Bildir | — | T | Bildir | Bildir |
| Kalite / SKS | G | G | T | T | G | G | G | — | — | — | — | T | — | — |
| Denetim izi (log) | Kısmi | Kısmi | T | G | K | — | — | — | — | — | — | G | — | Teknik |
| Kullanıcı / yetki | O | O | O (sağlık) | — | — | — | — | — | — | — | Talep | — | — | T (teknik) |
| Sistem ayarları | O | T | T (mevzuat) | T (klinik) | — | — | — | — | — | — | — | — | — | T (teknik) |

\* Muhasebe, fatura için gereken ad/kimlik/adres bilgisini görür; iletişim ve tıbbi bilgiyi görmez.

> Bu matris **varsayılandır**. Her kurum kendi rol şablonlarını oluşturabilir, ancak **yasal kısıtlar kilitlidir**: ör. hekim olmayan bir role “reçete yazma” veya “tanı görme” izni verilemez; sistem bunu engeller.

## 6. Giriş ve Oturum Güvenliği

- Tüm kullanıcılar için **iki aşamalı doğrulama** (SMS/Authenticator); hekim ve yöneticilerde zorunlu.
- e-İmza / Mobil İmza entegrasyonu (reçete, rapor, epikriz, onam kilitleme için).
- Ortak bilgisayarda hızlı kullanıcı değişimi (PIN/kart ile) — resepsiyonda ve hemşire istasyonunda kritik.
- Hareketsizlikte otomatik ekran kilidi (ayarlanabilir, varsayılan 5 dk klinik alanda).
- Personel ayrıldığında **tek tuşla** tüm erişimlerin kapatılması (İK “işten çıkış” kaydı ile otomatik tetiklenir).
- Personel izinliyken hesabın otomatik askıya alınması (opsiyonel).

## 7. Denetim İzi (Audit Log)

Her tıbbi kayıt **okuma** işlemi dahil loglanır: kim, ne zaman, hangi hasta, hangi ekran, hangi IP/cihaz, hangi gerekçe. Loglar değiştirilemez (append-only, hash zinciri) ve mevzuatın öngördüğü süre boyunca saklanır. Hasta, KVKK kapsamında “kaydıma kim baktı?” sorusunu sorduğunda bu rapor mesul müdür onayıyla verilebilir.
