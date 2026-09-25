// Çalıştırma: API (3000) ve web (3001) açıkken `node apps/web/e2e/kalite.e2e.js` (Playwright gerekir).
// Kalite akışı: hekim isimsiz olay bildirir (takip kodu) → sekreter CİMER şikâyeti kaydeder → kalite
// sorumlusu olayı inceler, DÖF açar, kök nedenle kapatır → mesul müdür tıbbi şikâyeti cevaplar ve
// DÖF'ü tamamlar → kalite sorumlusu etkinliği doğrular.
const { chromium } = require('playwright');
const path = require('path');

const TABAN = process.env.WEB_URL ?? 'http://localhost:3001';
const CIKTI = process.env.E2E_CIKTI ?? require('os').tmpdir();
const zaman = Date.now();
const PAROLA = 'guclu-parola-123';
const SAHIP = `kalite.sahip.${zaman}@ornek.test`;
const HEKIM = `kalite.hekim.${zaman}@ornek.test`;
const KALITE = `kalite.sorumlu.${zaman}@ornek.test`;
const SEKRETER = `kalite.sekreter.${zaman}@ornek.test`;
let sonSayfa;

const gunSonra = (n) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.now() + n * 86_400_000));

(async () => {
  const tarayici = await chromium.launch();
  const sayfa = await tarayici.newPage({ viewport: { width: 1440, height: 1000 } });
  sonSayfa = sayfa;
  const hatalar = [];
  sayfa.on('pageerror', (e) => { hatalar.push(e.message); console.error('pageerror:', e.message); });
  const foto = (ad) => sayfa.screenshot({ path: path.join(CIKTI, `${ad}.png`), fullPage: true });
  const adim = (m) => console.log('✓', m);

  async function girisYap(eposta, parola) {
    await sayfa.getByRole('button', { name: 'Çıkış yap' }).click();
    await sayfa.waitForURL('**/giris');
    await sayfa.getByLabel('E-posta').fill(eposta);
    await sayfa.getByLabel('Parola').fill(parola);
    await sayfa.getByRole('button', { name: 'Giriş yap' }).click();
    await sayfa.waitForURL('**/panel');
  }
  async function kullaniciEkle(ad, meslek, eposta, roller) {
    await sayfa.getByRole('button', { name: '+ Kullanıcı ekle' }).click();
    await sayfa.getByLabel('Ad soyad').fill(ad);
    await sayfa.getByLabel('E-posta').fill(eposta);
    await sayfa.getByLabel('Meslek').selectOption(meslek);
    await sayfa.getByLabel('Geçici parola').fill('gecici-parola-123');
    await sayfa.getByRole('button', { name: 'Kaydet' }).click();
    const satir = sayfa.getByRole('row').filter({ hasText: ad });
    for (const [i, rol] of roller.entries()) {
      if (i > 0) await satir.getByRole('button', { name: 'Rol ata' }).click();
      await satir.getByLabel('Rol').selectOption(rol);
      await satir.getByRole('button', { name: 'Rol ata' }).click();
      await sayfa.getByText('Rol atandı.').waitFor();
    }
  }
  const kaliteSayfasi = async () => {
    await sayfa.getByRole('navigation').getByRole('link', { name: 'Kalite ve Uyum' }).click();
    await sayfa.waitForURL('**/panel/kalite');
  };

  await sayfa.goto(TABAN + '/kayit');
  await sayfa.getByRole('button', { name: /Poliklinik \/ Tıp Merkezi/ }).click();
  await sayfa.getByRole('button', { name: /Devam: Kurum bilgileri/ }).click();
  await sayfa.getByLabel('Resmî unvan').fill('Kalite Deneme Tıp Merkezi');
  await sayfa.getByRole('button', { name: /Devam: Hesabınız/ }).click();
  await sayfa.getByLabel('Ad soyad').fill('Umut Sezer');
  await sayfa.getByLabel('E-posta').fill(SAHIP);
  await sayfa.getByLabel('Parola', { exact: true }).fill(PAROLA);
  await sayfa.getByLabel('Parola (tekrar)').fill(PAROLA);
  await sayfa.getByLabel('Mesleğiniz').selectOption('idari');
  await sayfa.getByRole('button', { name: /Devam: Onay/ }).click();
  await sayfa.getByRole('checkbox').check();
  await sayfa.getByRole('button', { name: 'Kurumu oluştur' }).click();
  await sayfa.waitForURL('**/panel');
  await sayfa.getByRole('link', { name: 'Kullanıcılar ve Yetkiler' }).click();
  await kullaniciEkle('Dr. Derya Koç', 'hekim', HEKIM, ['mesul_mudur', 'hekim']);
  await kullaniciEkle('Pelin Ay', 'idari', KALITE, ['kalite_sorumlusu']);
  await kullaniciEkle('Sena Işık', 'idari', SEKRETER, ['sekreter']);
  adim('mesul müdür, kalite sorumlusu ve sekreter eklendi');

  // Hekim isimsiz bildirir
  await girisYap(HEKIM, 'gecici-parola-123');
  await kaliteSayfasi();
  const bildir = sayfa.getByRole('form', { name: 'Olay bildir' });
  await bildir.getByLabel('Olay türü').selectOption('ilac_hatasi');
  await bildir.getByLabel('Sonuç / şiddet').selectOption('orta');
  await bildir.getByLabel('Yer').fill('Enjeksiyon odası');
  await bildir.getByLabel('Ne oldu?').fill('Benzer ambalajlı iki ampul karıştırıldı; uygulama öncesi fark edildi.');
  await bildir.getByLabel('İsimsiz bildir').check();
  await bildir.getByRole('button', { name: 'Bildirimi gönder' }).click();
  const onay = bildir.getByRole('status').filter({ hasText: 'Takip kodunuz' });
  const kod = (await onay.innerText()).match(/Takip kodunuz: ([A-Z2-9]{8})/)[1];
  await sayfa.getByRole('textbox', { name: 'Takip kodu' }).fill(kod);
  await sayfa.getByRole('button', { name: 'Sorgula' }).click();
  await sayfa.getByText('Durum: Yeni').waitFor();
  if ((await sayfa.getByRole('region', { name: 'İsimli bildirimlerim' }).getByRole('listitem').count()) !== 0) throw new Error('isimsiz bildirim isimlilerde görünüyor');
  await foto('27-olay-bildir');
  adim(`isimsiz bildirim gönderildi, takip kodu ${kod} ile sorgulandı`);

  // Sekreter CİMER şikâyeti kaydeder
  await girisYap(SEKRETER, 'gecici-parola-123');
  await kaliteSayfasi();
  await sayfa.getByRole('tab', { name: 'Şikâyetler' }).click();
  const sf = sayfa.getByRole('form', { name: 'Şikâyet kaydet' });
  await sf.getByLabel('Kanal').selectOption('cimer');
  await sf.getByLabel('Kategori').selectOption('tibbi');
  await sf.getByLabel('Resmî başvuru no').fill('CMR-2026-0457');
  await sf.getByLabel('Alınış tarihi').fill(gunSonra(-26));
  await sf.getByLabel('Başvuran').fill('Zeynep K.');
  await sf.getByLabel('Konu').fill('Tedavi sonrası şikâyet');
  await sf.getByRole('button', { name: 'Şikâyet kaydet' }).click();
  await sf.getByLabel('Başvuran').and(sayfa.locator('[value=""]')).waitFor();
  adim('sekreter CİMER şikâyetini kaydetti');

  // Kalite sorumlusu: olay incelemesi, DÖF, kapatma
  await girisYap(KALITE, 'gecici-parola-123');
  await kaliteSayfasi();
  await sayfa.getByRole('tab', { name: 'Olay bildirimleri' }).click();
  const olaylar = sayfa.getByRole('region', { name: 'Olay bildirimleri' });
  await olaylar.getByRole('button', { name: /İlaç hatası.*İsimsiz/ }).click();
  if (!(await olaylar.getByRole('button', { name: 'Olayı kapat' }).isDisabled())) throw new Error('kök nedensiz orta olay kapatılabiliyor');
  await olaylar.getByLabel('Kök neden').fill('Benzer ambalajlı ilaçlar aynı rafta');
  await olaylar.getByLabel('Alınan önlem').fill('Raflar ayrıldı, uyarı etiketi');
  await olaylar.getByLabel('Sorumlu').selectOption({ label: 'Pelin Ay' });
  await olaylar.getByRole('button', { name: 'DÖF aç' }).click();
  const dofFormu = sayfa.getByRole('form', { name: 'DÖF aç' });
  await dofFormu.getByLabel('Aksiyon').fill('Tüm benzer ambalajlı ilaçlar için ayrı raf ve kırmızı etiket');
  await dofFormu.getByLabel('Sorumlu').selectOption({ label: 'Dr. Derya Koç' });
  await dofFormu.getByLabel('Termin').fill(gunSonra(14));
  await dofFormu.getByRole('button', { name: 'DÖF aç' }).click();
  await sayfa.getByRole('region', { name: 'DÖF (düzeltici önleyici faaliyet)' }).getByText('14 gün kaldı').waitFor();
  await sayfa.getByRole('tab', { name: 'Olay bildirimleri' }).click();
  await olaylar.getByRole('button', { name: /İlaç hatası.*İsimsiz/ }).click();
  await olaylar.getByLabel('Kök neden').fill('Benzer ambalajlı ilaçlar aynı rafta');
  await olaylar.getByLabel('Alınan önlem').fill('Raflar ayrıldı, uyarı etiketi');
  await olaylar.getByRole('button', { name: 'Olayı kapat' }).click();
  await olaylar.getByText('Kapatıldı').waitFor();
  adim('kalite sorumlusu DÖF açtı ve olayı kök neden/önlemle kapattı');

  await sayfa.getByRole('tab', { name: 'Şikâyetler' }).click();
  const sikayetler = sayfa.getByRole('region', { name: 'Şikâyetler' });
  await sikayetler.getByText('Resmî · CİMER').waitFor();
  await sikayetler.getByText('4 gün kaldı').waitFor();
  await sikayetler.getByRole('button', { name: /Tedavi sonrası şikâyet/ }).click();
  await sikayetler.getByText('Tıbbi içerikli şikâyeti başhekim veya mesul müdür cevaplar.').waitFor();
  await foto('28-sikayetler');
  adim('resmî şikâyet süre sayacıyla listelendi; tıbbi cevap mesul müdüre bırakıldı');

  // Mesul müdür: şikâyet cevabı ve DÖF tamamlama
  await girisYap(HEKIM, 'gecici-parola-123');
  await kaliteSayfasi();
  await sayfa.getByRole('tab', { name: 'Şikâyetler' }).click();
  await sikayetler.getByRole('button', { name: /Tedavi sonrası şikâyet/ }).click();
  await sikayetler.getByLabel('Cevap').fill('Başvurunuz tıbbi kurulca incelenmiş, tedavinin uygun olduğu değerlendirilmiştir.');
  await sikayetler.getByRole('button', { name: 'Cevapla' }).click();
  await sikayetler.getByRole('button', { name: 'Kapat' }).click();
  await sikayetler.getByText('Kapatıldı').waitFor();
  await sayfa.getByRole('tab', { name: 'DÖF (düzeltici önleyici faaliyet)' }).click();
  const dofler = sayfa.getByRole('region', { name: 'DÖF (düzeltici önleyici faaliyet)' });
  await dofler.getByLabel('Yapılanlar').fill('Raflar ayrıldı, etiketler asıldı, ekip bilgilendirildi.');
  await dofler.getByRole('button', { name: 'Tamamlandı olarak işaretle' }).click();
  await dofler.getByText('Tamamlandı (doğrulama bekliyor)').waitFor();
  if (!(await dofler.getByRole('button', { name: 'Etkinliği doğrula' }).isDisabled())) throw new Error('tamamlayan kendi DÖF’ünü doğrulayabiliyor');
  adim('mesul müdür tıbbi şikâyeti cevaplayıp kapattı, DÖF’ü tamamladı; kendisi doğrulayamıyor');

  await girisYap(KALITE, 'gecici-parola-123');
  await kaliteSayfasi();
  await sayfa.getByRole('tab', { name: 'DÖF (düzeltici önleyici faaliyet)' }).click();
  await dofler.getByLabel('Doğrulama notu').fill('Yerinde kontrol edildi, etiketler uygun.');
  await dofler.getByRole('button', { name: 'Etkinliği doğrula' }).click();
  await dofler.getByText('Etkinliği doğrulandı').waitFor();
  await foto('29-dof');
  adim('kalite sorumlusu DÖF etkinliğini doğruladı');

  await sayfa.setViewportSize({ width: 390, height: 844 });
  await sayfa.reload();
  await sayfa.getByRole('heading', { name: 'Kalite ve Uyum' }).waitFor();
  const tasma = await sayfa.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  if (tasma) throw new Error('kalite sayfasında mobilde yatay taşma var');
  adim('mobilde yatay taşma yok');

  if (hatalar.length) throw new Error('Sayfa hataları: ' + hatalar.join(' | '));
  await tarayici.close();
  console.log('TÜM ADIMLAR BAŞARILI');
})().catch(async (e) => {
  console.error('HATA:', e.message);
  if (sonSayfa) {
    await sonSayfa.screenshot({ path: path.join(CIKTI, 'hata.png'), fullPage: true });
    console.error('URL:', sonSayfa.url());
  }
  process.exit(1);
});
