# 01 — Vizyon, Kapsam ve Temel İlkeler

## 1. Vizyon

Bir sağlık kuruluşunu yönetmek üç ayrı işi aynı anda yapmaktır:

1. **Tıp** — hastayı doğru teşhis etmek, doğru tedavi etmek, bunu kayıt altına almak.
2. **İşletme** — personeli, stoku, cihazı, parayı, zamanı yönetmek.
3. **Hukuk** — Bakanlık, SGK, KVKK, vergi, iş hukuku ve malpraktis riskine karşı her adımı belgelemek.

Sahada gördüğümüz klinik yazılımlarının çoğu bu üçünden yalnızca birini iyi yapar (genelde randevu + fatura). DC Doktor Klinik bu üç işi **tek veri kaynağında** birleştirir ve kurum yöneticisine “kliniğim şu an sağlıklı mı?” sorusunun cevabını **tek ekranda** verir.

## 2. Desteklenen Kurum Tipleri

Sistem, kurum oluşturulurken **kurum tipi** seçilir; tip, açılacak modülleri, zorunlu kadroları, zorunlu formları ve resmî entegrasyonları belirler. Bir kurum birden fazla tipi birleştirebilir (ör. tıp merkezi + medikal estetik ünitesi).

| Kurum Tipi | Yasal Çerçeve (özet) | Öne Çıkan İhtiyaçlar |
|---|---|---|
| **Muayenehane** (tek hekim) | Ayakta Teşhis ve Tedavi Yapılan Özel Sağlık Kuruluşları Hakkında Yönetmelik (muayenehane hükümleri) | Basit randevu, e-Reçete, e-SMM (serbest meslek makbuzu), hasta kaydı, KVKK |
| **Poliklinik** | Aynı yönetmelik | Mesul müdür, birden fazla hekim, ÇKYS personel bildirimi, hekim hakedişi |
| **Tıp Merkezi / Dal Merkezi** | Aynı yönetmelik | Branş bazlı birimler, lab/görüntüleme, SGK anlaşması → MEDULA, SKS |
| **Ağız ve Diş Sağlığı Merkezi / Diş Muayenehanesi** | Ağız ve Diş Sağlığı Hizmeti Sunulan Özel Sağlık Kuruluşları Hakkında Yönetmelik | Odontogram, tedavi planı, taksit, laboratuvar (protez) takibi, implant ÜTS, röntgen (NDK lisansı, dozimetri) |
| **Estetik / Medikal Estetik Merkezi** | Ayakta teşhis tedavi yönetmeliği + ilgili estetik uygulama düzenlemeleri, tanıtım/reklam mevzuatı | Seans paketleri, önce/sonra fotoğraf (onaylı), dolgu/botoks lot takibi (ÜTS), lazer cihaz kayıtları, reklam uyumu |
| **Fizik Tedavi / Diyet / Psikoloji / Ergoterapi danışmanlık** | İlgili meslek düzenlemeleri | Seans takibi, program/ölçek takibi, paket satış |
| **Evde Sağlık Hizmeti** | Evde Sağlık Hizmetlerinin Sunulmasına Dair Yönetmelik (özel kuruluşlar için ilgili hükümler) | Saha ekip rotası, GPS ile ziyaret doğrulama, mobil uygulama, çevrimdışı çalışma, hasta yakını iletişimi |
| **Veteriner Muayenehane / Poliklinik / Hayvan Hastanesi** | 6343 sayılı Veteriner Hekimliği Kanunu, Tarım ve Orman Bakanlığı veteriner sağlık kuruluşları mevzuatı | Hayvan + sahip modeli, tür/ırk, aşı karnesi, mikroçip/pasaport, hayvan kayıt sistemleri, yatılı bakım, pansiyon, pet-shop satış |
| **Sağlık Turizmi yetkili kuruluş** | Uluslararası Sağlık Turizmi ve Turistin Sağlığı Hakkında Yönetmelik | Yabancı hasta, çok dil, tercüman, aracı kuruluş komisyonu, döviz, transfer/konaklama |

## 3. Tasarımın Temel İlkeleri

### 3.1. Tek Veri, Tek Doğru
Bir hasta bir kez kaydedilir; randevu, muayene, reçete, fatura, anket, şikâyet hep aynı hasta kartına bağlanır. Bir ilaç bir kez stoka girer; hastaya uygulandığında stoktan düşer, maliyete yazılır, faturaya yansır.

### 3.2. Tıbbi Sır ile İşletme Verisinin Ayrılması
- **Tıbbi veri** (tanı, anamnez, muayene notu, tetkik sonucu, fotoğraf) yalnızca **tedavi ilişkisi olan** ve **mesleki sır saklama yükümlülüğü altındaki** kişilerce görülür.
- **İşletme verisi** (randevu sayısı, ciro, doluluk, stok, personel) yöneticilerce görülür.
- Hekim olmayan sahip/genel müdür, hastalara ait tıbbi bilgiyi görmez; yalnızca **anonim/toplulaştırılmış** istatistik görür (ör. “bu ay 312 muayene, en sık 5 işlem”).
- Bu ayrım KVKK’nın özel nitelikli veri hükümleri ve Kişisel Sağlık Verileri Hakkında Yönetmelik ile uyumlu olacak şekilde **veri seviyesinde** (sadece ekranda gizleme değil) uygulanır.

### 3.3. “Kayıtta Yoksa Yapılmamıştır”
Malpraktis davalarında hekimi koruyan tek şey kayıttır. Bu yüzden:
- Onam alınmadan işlem başlatılamaz (kurala bağlı engel).
- Her kayıt kim/ne zaman/hangi cihazdan bilgisiyle tutulur; **silme yoktur**, yalnızca gerekçeli düzeltme (eski sürüm saklanır).
- Kritik kayıtlar (reçete, rapor, onam, epikriz) elektronik imza ile kilitlenir.

### 3.4. Hatırlatan, Uyaran, Eskale Eden Sistem
Sistem pasif bir kayıt defteri değildir. Süresi dolacak bir sertifikayı, SKT’si yaklaşan ilacı, boş kalan nöbeti, imzalanmamış raporu, onamı eksik işlemi, geciken ödemeyi **kendisi bulur**, ilgili kişiye bildirir, çözülmezse bir üst yetkiliye taşır.

### 3.5. Kurum Tipine Göre Uyarlanabilirlik
Tek hekimli muayenehane ile 80 personelli tıp merkezi aynı karmaşıklığı görmemelidir. Modüller, alanlar, formlar ve roller kurum tipine göre açılır/kapanır. Küçük kurum 10 dakikada kullanıma başlayabilmelidir.

### 3.6. Çok Şubeli Yapı
Bir işletme birden fazla şube açabilir. Hasta kaydı işletme genelinde tektir (hasta hangi şubeye giderse gitsin geçmişi görülür — yetkiye bağlı); stok, kasa, personel, nöbet şube bazlıdır; raporlar hem şube hem konsolide görülebilir.

### 3.7. Mevzuat Parametrik Olmalı
Saklama süreleri, zorunlu form listeleri, fiyat tarifeleri, SUT kodları, reçete kuralları, KDV oranları **kod içine gömülmez**; yönetilebilir parametre ve sürümlü şablon olarak tutulur.

### 3.8. Mobil ve Çevrimdışı
Evde sağlık ekipleri, veteriner saha hekimleri ve kliniğe uğramayan sahip için mobil uygulama birinci sınıf vatandaştır. Saha uygulaması internet olmadan veri toplayıp bağlantı gelince senkronize eder.

## 4. Kapsam Dışı (Bilinçli Olarak)

- Yataklı **özel hastane** HBYS’si (yoğun bakım, ameliyathane planlaması, kan bankası vb.) ilk sürümde hedef değildir; ancak mimari bunlara genişleyebilecek şekilde kurulur. Günübirlik müdahale / küçük cerrahi ve veteriner yatılı tedavi kapsam içindedir.
- Tam kapsamlı genel muhasebe (defter-i kebir) yerine, muhasebe yazılımlarına (Logo, Mikro, Luca, Paraşüt vb.) entegrasyon ve ön muhasebe hedeflenir.
- Laboratuvar cihazlarının doğrudan sürücü entegrasyonu ilk sürümde değil; LIS/HL7 üzerinden sonraki fazda.
