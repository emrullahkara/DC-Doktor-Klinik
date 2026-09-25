// Çalıştırma: API (3000) ve web (3001) açıkken `node apps/web/e2e/stok.e2e.js` (Playwright gerekir).
// Stok akışı: genel müdür ürün tanımlar ve iki lot girer → hekim (mesul müdür) FEFO önerisiyle hastaya
// kullanım kaydeder → lot izleme hastayı bulur → SKT yaklaşan lot alarmı Komuta Merkezi'nde.
const { chromium } = require('playwright');
const path = require('path');

const TABAN = process.env.WEB_URL ?? 'http://localhost:3001';
const CIKTI = process.env.E2E_CIKTI ?? require('os').tmpdir();
const zaman = Date.now();
const PAROLA = 'guclu-parola-123';
const SAHIP = `stok.sahip.${zaman}@ornek.test`;
const GM = `stok.gm.${zaman}@ornek.test`;
const HEKIM = `stok.hekim.${zaman}@ornek.test`;
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

  await sayfa.goto(TABAN + '/kayit');
  await sayfa.getByRole('button', { name: /Poliklinik \/ Tıp Merkezi/ }).click();
  await sayfa.getByRole('button', { name: /Devam: Kurum bilgileri/ }).click();
  await sayfa.getByLabel('Resmî unvan').fill('Stok Deneme Tıp Merkezi');
  await sayfa.getByRole('button', { name: /Devam: Hesabınız/ }).click();
  await sayfa.getByLabel('Ad soyad').fill('Sibel Kurt');
  await sayfa.getByLabel('E-posta').fill(SAHIP);
  await sayfa.getByLabel('Parola', { exact: true }).fill(PAROLA);
  await sayfa.getByLabel('Parola (tekrar)').fill(PAROLA);
  await sayfa.getByLabel('Mesleğiniz').selectOption('idari');
  await sayfa.getByRole('button', { name: /Devam: Onay/ }).click();
  await sayfa.getByRole('checkbox').check();
  await sayfa.getByRole('button', { name: 'Kurumu oluştur' }).click();
  await sayfa.waitForURL('**/panel');
  await sayfa.getByRole('link', { name: 'Kullanıcılar ve Yetkiler' }).click();
  await kullaniciEkle('Okan Er', 'idari', GM, ['genel_mudur']);
  await kullaniciEkle('Dr. Can Işık', 'hekim', HEKIM, ['mesul_mudur', 'hekim']);
  adim('genel müdür ve hekim (mesul müdür) eklendi');

  // Genel müdür: ürün ve girişler
  await girisYap(GM, 'gecici-parola-123');
  await sayfa.getByRole('link', { name: 'Stok ve İlaç' }).click();
  await sayfa.waitForURL('**/panel/stok');
  await sayfa.getByRole('button', { name: '+ Ürün ekle' }).click();
  const urunFormu = sayfa.getByRole('form', { name: 'Ürün ekle' });
  await urunFormu.getByLabel('Kod', { exact: true }).fill('DKLO-75');
  await urunFormu.getByLabel('Ürün adı').fill('Diklofenak 75 mg ampul');
  await urunFormu.getByLabel('Birim').selectOption('ampul');
  await urunFormu.getByLabel('En az stok').fill('10');
  await urunFormu.getByRole('button', { name: 'Ürün ekle' }).click();
  await sayfa.getByRole('link', { name: 'Diklofenak 75 mg ampul' }).click();
  await sayfa.waitForURL(/\/panel\/stok\/[0-9a-f-]{36}$/);
  const urunYolu = new URL(sayfa.url()).pathname;

  const hareket = sayfa.getByRole('form', { name: 'Stok hareketi' });
  async function giris(lot, skt, miktar) {
    await hareket.getByLabel('Hareket').selectOption('giris');
    await hareket.getByLabel('Lot / seri no').fill(lot);
    await hareket.getByLabel('Son kullanma tarihi').fill(skt);
    await hareket.getByLabel('Miktar (ampul)').fill(miktar);
    await hareket.getByRole('button', { name: 'Hareketi kaydet' }).click();
    await sayfa.getByRole('region', { name: 'Lotlar' }).getByRole('cell', { name: new RegExp(`^${lot}`) }).waitFor();
  }
  await giris('L-2027A', gunSonra(200), '20');
  await giris('L-YAKIN', gunSonra(20), '5');
  await sayfa.getByRole('region', { name: 'Lotlar' }).getByRole('row').filter({ hasText: 'L-YAKIN' }).getByText('Önce bunu kullanın (FEFO)').waitFor();
  await sayfa.getByRole('region', { name: 'Lotlar' }).getByText('20 gün kaldı').waitFor();
  adim('iki lot girildi; SKT’si yakın lot FEFO önerisi ve 20 gün uyarısıyla');

  // Hekim: hasta ve kullanım
  await girisYap(HEKIM, 'gecici-parola-123');
  await sayfa.goto(TABAN + '/panel/hastalar/yeni');
  await sayfa.getByLabel('Kimlik türü').selectOption('kimliksiz');
  await sayfa.getByLabel('Ad', { exact: true }).fill('Ozan');
  await sayfa.getByLabel('Soyad', { exact: true }).fill('Kaya');
  await sayfa.getByLabel('Doğum tarihi').fill('1979-11-02');
  await sayfa.getByLabel('Kişisel verilerin işlenmesine ilişkin aydınlatma metni hastaya sunuldu.').check();
  await sayfa.getByRole('button', { name: 'Hastayı kaydet' }).click();
  await sayfa.waitForURL(/\/panel\/hastalar\/[0-9a-f-]{36}$/);

  await sayfa.goto(TABAN + urunYolu);
  const form = sayfa.getByRole('form', { name: 'Stok hareketi' });
  if ((await form.getByLabel('Hareket').inputValue()) !== 'kullanim') throw new Error('varsayılan hareket kullanım değil');
  if ((await form.getByLabel('Lot / seri no').inputValue()) !== 'L-YAKIN') throw new Error('FEFO lotu seçili değil');
  await form.getByLabel('Hasta ara (ad, telefon)').fill('ozan');
  await form.getByRole('button', { name: 'Ozan Kaya' }).click();
  await form.getByLabel('Açıklama').fill('IM, sol gluteal');
  await form.getByRole('button', { name: 'Hareketi kaydet' }).click();
  await form.getByText('Hareket kaydedildi.').waitFor();
  await sayfa.getByRole('region', { name: 'Hareket geçmişi' }).getByRole('link', { name: 'Ozan Kaya' }).waitFor();
  await foto('25-stok-urun');
  adim('hekim FEFO lotundan hastaya kullanım kaydetti');

  const izleme = sayfa.getByRole('region', { name: 'Lot izleme (geri çağırma)' });
  await izleme.getByLabel('Lot / seri no').fill('L-YAKIN');
  await izleme.getByRole('button', { name: 'Hastaları listele' }).click();
  await izleme.getByRole('link', { name: 'Ozan Kaya' }).waitFor();
  adim('lot izleme lotun uygulandığı hastayı buldu');

  await sayfa.getByRole('link', { name: 'Komuta Merkezi' }).click();
  const alarm = sayfa.getByRole('region', { name: 'Yapılacaklar ve alarmlar' });
  const tumu = alarm.getByRole('button', { name: /^Tümünü göster/ });
  if (await tumu.count()) await tumu.click();
  await alarm.getByText(/Diklofenak 75 mg ampul \(lot L-YAKIN\) SKT'sine 20 gün kaldı/).waitFor();
  adim('SKT alarmı Komuta Merkezi’nde');

  await sayfa.goto(TABAN + '/panel/stok');
  await sayfa.getByRole('cell', { name: /24 ampul/ }).waitFor();
  await foto('26-stok-liste');

  await sayfa.setViewportSize({ width: 390, height: 844 });
  await sayfa.goto(TABAN + urunYolu);
  await sayfa.getByRole('heading', { name: 'Diklofenak 75 mg ampul' }).waitFor();
  const tasma = await sayfa.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  if (tasma) throw new Error('ürün kartında mobilde yatay taşma var');
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
