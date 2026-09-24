# 04.6 — Finans ve Muhasebe

## 1. Hizmet ve Fiyat Yönetimi
- **Hizmet kataloğu:** muayene, işlem, tetkik, seans, paket, malzeme, ilaç, pansiyon günü, ev ziyareti, km ücreti.
- Kod eşlemeleri: kurum kodu ↔ SUT kodu ↔ meslek birliği tarife kodu (TTB asgari ücret tarifesi, TDB tarifesi, veteriner hekimler asgari ücret tarifesi — ilgili yıl sürümü).
- **Birden fazla fiyat listesi:** ücretli hasta, anlaşmalı kurum A/B, özel sigorta X, sağlık turizmi (döviz), personel/yakını indirimi, kampanya.
- **Asgari tarife kontrolü:** Meslek birliği tarifesinin altında fiyat girişinde uyarı (meslek kuralları açısından).
- Fiyat listesi sürümlüdür (geçerlilik tarihi); geçmiş faturalar eski fiyatla kalır.
- Fiyat değişikliği → çift onay (Genel Müdür + Sahip).
- Sağlık hizmetlerinde KDV oranları ve istisnalar parametrik tutulur (hizmet türüne göre değişebilir).

## 2. Hasta Hesabı ve Tahsilat
- Her vizit/tedavi planı bir **hasta hesabı** açar: hizmet kalemleri + malzeme + ilaç.
- Ödeme türleri: nakit, kredi kartı (POS entegrasyonu — tutar otomatik POS’a gider), taksit, havale/EFT, sanal POS (online), çek/senet (nadir), kurum/sigorta payı, hasta katılım payı / fark ücreti, hediye çeki, paket bakiyesi, avans/kapora.
- **Kısmi ödeme ve açık hesap:** kalan borç, vade, otomatik hatırlatma, gecikme raporu.
- İndirim: sebep kodu zorunlu (kampanya, personel, sosyal, hekim takdiri…), eşik üstü onaya düşer.
- İade: sebep + onay; kart iadesi POS üzerinden.
- **Ödeme planı / senetli taksit** (diş/estetik): plan, vade, hatırlatma, protesto süreci kaydı.

## 3. Faturalama
- **e-Fatura / e-Arşiv Fatura** (GİB özel entegratör üzerinden), **e-SMM** (serbest meslek makbuzu — muayenehane/serbest hekim).
- Kurumlara toplu fatura (dönem sonu), sigorta şirketlerine fatura, yurt dışı hasta için dövizli fatura.
- Fatura iptali/iade faturası → onaylı.
- Fatura üzerinde tanı bilgisi yer almaz (KVKK); sigorta/SGK için gerekli tıbbi kodlar ayrı ve güvenli kanaldan (MEDULA/provizyon sistemi) iletilir.

## 4. SGK / MEDULA (SGK ile anlaşmalı kurumlar için)
- Müstahaklık sorgusu, **provizyon alma** (takip no), işlem/ilaç/malzeme girişleri, katılım payı hesabı.
- Dönem sonu fatura hazırlama, **fatura öncesi kontrol** (SUT kurallarına göre kural motoru: tanı–işlem uyumu, adet sınırları, rapor gereklilikleri, hekim branş yetkisi).
- İade/kesinti takibi: MEDULA’dan dönen kesintilerin sebebe göre analizi, itiraz süreci ve sorumlu kişi.
- Fark ücreti hesaplama (mevzuatın izin verdiği sınırlar içinde) ve hastaya bilgilendirme belgesi.

## 5. Özel Sağlık Sigortaları ve Kurumsal Anlaşmalar
- Anlaşma sözleşmesi, indirim oranları, teminat limitleri, provizyon kanalı (web servis/portal).
- Provizyon talebi → onay/ret → hasta payı hesaplama.
- Evrak eksikliği takibi (epikriz, rapor, reçete fotokopisi).
- Tahsilat vadesi ve mutabakat.
- Tamamlayıcı sağlık sigortası (TSS) süreçleri.

## 6. Kasa ve Banka
- Şube/kasa bazlı: açılış bakiyesi, gün içi hareketler, **gün sonu kapanış** (sayım vs. sistem), fark tutanağı.
- POS gün sonu mutabakatı, banka hesap hareketleri (açık bankacılık/ekstre aktarım) ile eşleştirme.
- Kasadan kasaya/bankaya transfer.

## 7. Giderler
- Gider kategorileri: kira, personel, SGK primi, hekim hakedişleri, malzeme, lab (dış), protez lab, enerji, bakım-onarım, sigorta, pazarlama, yazılım, tıbbi atık, danışmanlık (İSG, hukuk, mali müşavir), vergi.
- Tedarikçi faturaları (gelen e-Fatura), ödeme planı, vade takibi.
- Düzenli gider tanımı (her ay kira) → otomatik kayıt ve ödeme hatırlatması.
- Bütçe ve bütçe/gerçekleşen karşılaştırması.

## 8. Maliyet ve Kârlılık Analizi
- **İşlem bazında maliyet:** malzeme (stoktan gerçek maliyet) + lab maliyeti + hekim hakedişi + oda/cihaz zaman maliyeti (dağıtım anahtarı) → işlem kâr marjı.
- Hekim bazında, birim bazında, şube bazında gelir/gider/kâr.
- Hasta edinme maliyeti (pazarlama kanalı bazında).
- Nakit akış tahmini (planlı tahsilatlar, taksitler, sigorta vadeleri vs. planlı ödemeler).

## 9. Muhasebe Entegrasyonu
- Ön muhasebe kayıtlarının genel muhasebe yazılımına (Logo, Mikro, Luca, Netsis, Paraşüt vb.) aktarımı; hesap planı eşlemesi.
- Mali müşavir için süreli salt-okunur erişim.
- Bordro: puantaj ve hakedişlerin bordro programına aktarımı.

## 10. Finansal Kontroller (Suistimal Önleme)
- Tahsil edilmeden kapatılan vizit raporu.
- İndirim/iptal/iade yoğunluğu kullanıcı bazında (anormallik tespiti).
- Stoktan düşülen malzeme vs. faturalanan malzeme uyumsuzluğu.
- Randevusu olup kaydı/faturası olmayan hasta (kayıt dışı işlem şüphesi).
- Kasa farkı geçmişi.
