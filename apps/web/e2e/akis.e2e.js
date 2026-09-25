// Çalıştırma: API (3000) ve web (3001) açıkken `node apps/web/e2e/akis.e2e.js` (Playwright gerekir).
// Ekran görüntüleri E2E_CIKTI klasörüne (varsayılan: geçici klasör) yazılır.
// Web arayüzünün uçtan uca denemesi: kayıt sihirbazı → panel → kullanıcı ekleme → rol atama → denetim izi
const { chromium } = require('playwright');
const path = require('path');

const TABAN = process.env.WEB_URL ?? 'http://localhost:3001';
const CIKTI = process.env.E2E_CIKTI ?? require('os').tmpdir();
const zaman = Date.now();

let sonSayfa;
(async () => {
  const tarayici = await chromium.launch();
  const sayfa = await tarayici.newPage({ viewport: { width: 1440, height: 1000 } });
  sonSayfa = sayfa;
  const hatalar = [];
  sayfa.on('pageerror', (e) => hatalar.push(e.message));
  const foto = (ad) => sayfa.screenshot({ path: path.join(CIKTI, `${ad}.png`), fullPage: true });
  const adim = (m) => console.log('✓', m);

  // 1. Kök adres oturum yoksa girişe yönlenir
  await sayfa.goto(TABAN + '/');
  await sayfa.waitForURL('**/giris');
  await foto('01-giris');
  adim('oturum yokken giriş sayfasına yönlendi');

  // 2. Kayıt sihirbazı
  await sayfa.getByRole('link', { name: 'Kurum kaydı oluşturun' }).click();
  await sayfa.waitForURL('**/kayit');
  await sayfa.getByRole('button', { name: /Poliklinik \/ Tıp Merkezi/ }).click();
  await sayfa.getByRole('button', { name: /Veteriner Klinik/ }).click();
  await sayfa.getByText('ayrı şube olarak açar').waitFor();
  await foto('02-kayit-tip');
  adim('kurum tipleri seçildi, ayrı şube uyarısı göründü');
  await sayfa.getByRole('button', { name: /Devam: Kurum bilgileri/ }).click();
  await sayfa.getByLabel('Resmî unvan').fill('Deneme Sağlık Hizmetleri Ltd. Şti.');
  await sayfa.getByLabel('İlk şubenin adı').fill('Kadıköy');
  await sayfa.getByRole('button', { name: /Devam: Hesabınız/ }).click();
  await sayfa.getByLabel('Ad soyad').fill('Merve Kaya');
  await sayfa.getByLabel('E-posta').fill(`sahip.${zaman}@ornek.test`);
  await sayfa.getByLabel('Parola', { exact: true }).fill('guclu-parola-123');
  await sayfa.getByLabel('Parola (tekrar)').fill('guclu-parola-123');
  await sayfa.getByLabel('Mesleğiniz').selectOption('idari');
  await sayfa.getByText('tıbbi kayıtlarını göremezsiniz').waitFor();
  await foto('03-kayit-hesap');
  await sayfa.getByRole('button', { name: /Devam: Onay/ }).click();
  await sayfa.getByText('Kadıköy (Veteriner)').waitFor();
  await sayfa.getByRole('checkbox').check();
  await foto('04-kayit-onay');
  await sayfa.getByRole('button', { name: 'Kurumu oluştur' }).click();
  await sayfa.waitForURL('**/panel');
  await sayfa.getByRole('heading', { name: 'Komuta Merkezi' }).waitFor();
  await foto('05-komuta-merkezi');
  adim('kayıt tamamlandı, Komuta Merkezi açıldı');

  // 3. Kullanıcı ekleme ve rol atama
  await sayfa.getByRole('link', { name: 'Kullanıcılar ve Yetkiler' }).click();
  await sayfa.waitForURL('**/panel/kullanicilar');

  async function kullaniciEkle(ad, meslek, eposta) {
    await sayfa.getByRole('button', { name: '+ Kullanıcı ekle' }).click();
    await sayfa.getByLabel('Ad soyad').fill(ad);
    await sayfa.getByLabel('E-posta').fill(eposta);
    await sayfa.getByLabel('Meslek').selectOption(meslek);
    await sayfa.getByLabel('Geçici parola').fill('gecici-parola-123');
    await sayfa.getByRole('button', { name: 'Kaydet' }).click();
    await sayfa.getByRole('cell', { name: new RegExp(ad) }).waitFor();
  }
  const satir = (ad) => sayfa.getByRole('row').filter({ hasText: ad });

  await kullaniciEkle('Dr. Ahmet Demir', 'hekim', `hekim.${zaman}@ornek.test`);
  const hekimSatiri = satir('Dr. Ahmet Demir');
  await hekimSatiri.getByLabel('Rol').selectOption('mesul_mudur');
  await hekimSatiri.getByRole('button', { name: 'Rol ata' }).click();
  await hekimSatiri.getByText('Mesul müdür · Kadıköy').waitFor();
  adim('hekim eklendi ve mesul müdür atandı');

  await kullaniciEkle('Ayşe Yıldız', 'hemsire', `hemsire.${zaman}@ornek.test`);
  const hemsireSatiri = satir('Ayşe Yıldız');
  const roller = await hemsireSatiri.getByLabel('Rol').locator('option').allTextContents();
  if (roller.some((r) => r === 'Hekim' || r === 'Mesul müdür')) throw new Error('Hemşireye hekim rolü önerildi: ' + roller.join(','));
  const hemsireSecenegi = hemsireSatiri.getByLabel('Rol').locator('option[value="hemsire"]');
  if (!(await hemsireSecenegi.isDisabled())) throw new Error('sahip için hemşire rolü pasif değil');
  if (!(await hemsireSecenegi.textContent()).includes('mesul müdür atar')) throw new Error('gerekçe yok');
  await foto('06-kullanicilar-ret');
  adim('sahip için hemşire rolü pasif ve gerekçeli; hemşireye hekim rolü önerilmedi');

  // 4. Denetim izi
  await sayfa.getByRole('link', { name: 'Denetim İzi' }).click();
  await sayfa.waitForURL('**/panel/denetim');
  await sayfa.getByText('Kullanıcı eklendi').first().waitFor();
  await foto('07-denetim-izi');
  adim('denetim izi kayıtları görünüyor');

  // 5. Mesul müdür girişi ve hemşire rolünü onaylaması
  await sayfa.getByRole('button', { name: 'Çıkış yap' }).click();
  await sayfa.waitForURL('**/giris');
  await sayfa.getByLabel('E-posta').fill(`hekim.${zaman}@ornek.test`);
  await sayfa.getByLabel('Parola').fill('gecici-parola-123');
  await sayfa.getByRole('button', { name: 'Giriş yap' }).click();
  await sayfa.waitForURL('**/panel');
  await sayfa.getByRole('link', { name: 'Kullanıcılar ve Yetkiler' }).click();
  const hemsireSatiri2 = satir('Ayşe Yıldız');
  await hemsireSatiri2.getByRole('button', { name: 'Rol ata' }).click();
  await hemsireSatiri2.getByLabel('Rol').selectOption('hemsire');
  await hemsireSatiri2.getByRole('button', { name: 'Rol ata' }).click();
  await hemsireSatiri2.getByText('Hemşire / ebe · Kadıköy').waitFor();
  await foto('08-mesul-mudur-atadi');
  adim('mesul müdür hemşire rolünü atadı');

  // 6. Mobil görünüm
  await sayfa.setViewportSize({ width: 390, height: 844 });
  await sayfa.goto(TABAN + '/panel');
  await sayfa.getByRole('heading', { name: 'Komuta Merkezi' }).waitFor();
  const tasma = await sayfa.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  await foto('09-mobil');
  if (tasma) throw new Error('mobilde yatay taşma var');
  adim('mobilde yatay taşma yok');

  if (hatalar.length) throw new Error('Sayfa hataları: ' + hatalar.join(' | '));
  await tarayici.close();
  console.log('TÜM ADIMLAR BAŞARILI');
})().catch(async (e) => {
  console.error('HATA:', e.message);
  if (sonSayfa) { await sonSayfa.screenshot({ path: path.join(CIKTI, 'hata.png'), fullPage: true }); console.error('URL:', sonSayfa.url()); }
  process.exit(1);
});
