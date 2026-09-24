# 10 — Karar Bekleyen Konular

> **Güncelleme:** A3 (pilot kurum — şimdilik yok) dışındaki tüm sorular cevaplandı — bkz. [Alınan Kararlar](11-alinan-kararlar.md).

Bir sonraki görüşmede netleştirmemiz gereken sorular. Cevaplar tasarımı ve yol haritasını doğrudan etkiler.

## A. İş Modeli ve Hedef Pazar
1. **Kim için yapıyoruz?** (a) Tek bir kurumun (kendi kliniğiniz / tanıdık bir klinik) iç sistemi mi, (b) birçok kliniğe satılacak bir SaaS ürünü mü? — SaaS ise abonelik, kiracı yönetimi, satış/destek süreçleri de tasarıma girer.
2. **İlk hedef kurum tipi hangisi?** Öneri: Poliklinik + diş kliniği ile başlamak (en büyük pazar, en net ihtiyaç); veteriner ve evde sağlık Faz 2–3.
3. Pilot olarak çalışabileceğimiz gerçek bir kurum var mı? (Saha geri bildirimi kritik.)
4. Fiyatlandırma modeli fikriniz: şube başı, kullanıcı başı, hekim başı, modül bazlı?

## B. Resmî Entegrasyonlar
5. e-Nabız/USS, MEDULA, e-Reçete gibi entegrasyonlar için **yazılım firması tescil süreçlerine** kendimiz mi gireceğiz, yoksa başlangıçta bu entegrasyonları sağlayan bir aracı servis mi kullanalım? (Zaman ve maliyet açısından büyük fark yaratır.)
6. Hedef kurumlar SGK anlaşmalı mı olacak? (Değilse MEDULA Faz 3’e kayabilir.)
7. e-Fatura için tercih ettiğiniz/anlaştığınız özel entegratör var mı?

## C. Teknik Tercihler
8. Web + mobil ikisi birden ilk günden mi, yoksa önce web (tablet uyumlu) mi?
9. Barındırma: Türkiye’de hangi bulut/veri merkezi? (Tercih veya mevcut anlaşma var mı?)
10. Teknoloji önerisine (TypeScript/NestJS + PostgreSQL + React/React Native) itirazınız veya ekibinizin bildiği başka bir teknoloji var mı?
11. Geliştirme ekibi: yalnızca Claude ile mi ilerliyoruz, yoksa yazılım ekibi de olacak mı?

## D. Ürün Kapsamı
12. Muhasebe: yalnızca ön muhasebe + entegrasyon mu, tam muhasebe mi?
13. Bordro hesaplama sistemde mi olsun, yoksa bordro programına aktarım yeterli mi?
14. Sağlık turizmi ve estetik reklam/tanıtım modülleri önceliğiniz mi?
15. Yapay zekâ özellikleri (sesli dikte, not özeti, tahminler) ilk sürümde isteniyor mu?
16. Çok dil desteği ilk sürümde gerekli mi (İngilizce, Arapça, Rusça, Almanca — sağlık turizmi)?

## E. Marka ve Tasarım
17. “DC Doktor Klinik” ürün adı mı, yoksa şirket adı mı? Logo/renk kimliği var mı?
18. Ekran taslaklarını (wireframe) bir sonraki adımda görmek ister misiniz? Hangi ekrandan başlayalım? (Öneri: Komuta Merkezi + Randevu + Muayene.)

## F. Hukuki
19. Hukuki metinlerin son onayını verecek bir sağlık hukuku avukatı / KVKK danışmanı ile çalışıyor musunuz? (Metin taslaklarını ben hazırlayabilirim; son onay mutlaka bir hukukçudan geçmeli.)

---

**Önerilen sonraki adım:** Bu soruların cevaplarıyla birlikte (1) Faz 1 kapsamını kesinleştirmek, (2) ana ekranların taslaklarını çizmek, (3) proje iskeletini kurup geliştirmeye başlamak.
