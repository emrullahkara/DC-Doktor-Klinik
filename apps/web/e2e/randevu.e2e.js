// Çalıştırma: API (3000) ve web (3001) açıkken `node apps/web/e2e/randevu.e2e.js` (Playwright gerekir).
// Randevu akışı: kurum → oda → hasta → randevu → çakışma → kabul (sıra no, bekleme salonu) → muayene → tamamla.
const { chromium } = require('playwright');
const path = require('path');

const TABAN = process.env.WEB_URL ?? 'http://localhost:3001';
const CIKTI = process.env.E2E_CIKTI ?? require('os').tmpdir();
const zaman = Date.now();
let sonSayfa;

(async () => {
  const tarayici = await chromium.launch();
  const sayfa = await tarayici.newPage({ viewport: { width: 1440, height: 1100 } });
  sonSayfa = sayfa;
  const hatalar = [];
  sayfa.on('pageerror', (e) => hatalar.push(e.message));
  const foto = (ad) => sayfa.screenshot({ path: path.join(CIKTI, `${ad}.png`), fullPage: true });
  const adim = (m) => console.log('✓', m);

  // Kurum (hekim sahip: kurum sahibi + mesul müdür + hekim)
  await sayfa.goto(TABAN + '/kayit');
  await sayfa.getByRole('button', { name: /Poliklinik \/ Tıp Merkezi/ }).click();
  await sayfa.getByRole('button', { name: /Devam: Kurum bilgileri/ }).click();
  await sayfa.getByLabel('Resmî unvan').fill('Randevu Deneme Polikliniği');
  await sayfa.getByRole('button', { name: /Devam: Hesabınız/ }).click();
  await sayfa.getByLabel('Ad soyad').fill('Dr. Can Er');
  await sayfa.getByLabel('E-posta').fill(`randevu.${zaman}@ornek.test`);
  await sayfa.getByLabel('Parola', { exact: true }).fill('guclu-parola-123');
  await sayfa.getByLabel('Parola (tekrar)').fill('guclu-parola-123');
  await sayfa.getByLabel('Mesleğiniz').selectOption('hekim');
  await sayfa.getByRole('button', { name: /Devam: Onay/ }).click();
  await sayfa.getByRole('checkbox').check();
  await sayfa.getByRole('button', { name: 'Kurumu oluştur' }).click();
  await sayfa.waitForURL('**/panel');

  // Hasta
  await sayfa.goto(TABAN + '/panel/hastalar/yeni');
  await sayfa.getByLabel('Kimlik türü').selectOption('kimliksiz');
  await sayfa.getByLabel('Ad', { exact: true }).fill('Zeynep');
  await sayfa.getByLabel('Soyad', { exact: true }).fill('Arslan');
  await sayfa.getByLabel('Kişisel verilerin işlenmesine ilişkin aydınlatma metni hastaya sunuldu.').check();
  await sayfa.getByRole('button', { name: 'Hastayı kaydet' }).click();
  await sayfa.waitForURL(/\/panel\/hastalar\/[0-9a-f-]{36}$/);
  adim('kurum ve hasta hazır');

  // Oda ekle
  await sayfa.getByRole('link', { name: 'Randevular' }).click();
  await sayfa.waitForURL('**/panel/randevular');
  await sayfa.getByLabel('Adı').fill('Oda 1');
  await sayfa.getByRole('button', { name: 'Ekle' }).click();
  await sayfa.locator('.cip', { hasText: 'Oda 1' }).waitFor();
  adim('oda eklendi');

  async function randevuVer(saat) {
    await sayfa.getByRole('button', { name: '+ Yeni randevu' }).click();
    const form = sayfa.getByRole('form', { name: 'Yeni randevu' });
    await form.getByLabel('Hasta').fill('zeynep');
    await form.getByRole('button', { name: /Zeynep Arslan/ }).click();
    await form.getByLabel('Saat').fill(saat);
    await form.getByLabel('Oda / cihaz').selectOption({ label: 'Oda 1' });
    await form.getByRole('button', { name: 'Randevuyu kaydet' }).click();
    return form;
  }

  await randevuVer('10:00');
  const blok = sayfa.getByRole('button', { name: /^10:00 Zeynep Arslan/ });
  await blok.waitFor();
  adim('randevu verildi, takvimde göründü');

  const form = await randevuVer('10:15');
  await form.getByText('Hekimin bu saatte başka bir randevusu var.').waitFor();
  await form.getByRole('button', { name: 'Kapat' }).click();
  adim('çakışan randevu reddedildi ve nedeni gösterildi');

  await blok.click();
  const ayrinti = sayfa.getByRole('region', { name: 'Randevu' });
  await ayrinti.getByRole('button', { name: 'Hasta geldi (kabul)' }).click();
  const salon = sayfa.getByRole('region', { name: 'Bekleme salonu' });
  await salon.getByText('Zeynep Arslan').waitFor();
  await ayrinti.getByText('Salonda bekliyor · Sıra 1').waitFor();
  await foto('13-randevu-takvimi');
  adim('kabul yapıldı: sıra 1, bekleme salonunda');

  await ayrinti.getByRole('button', { name: 'Muayeneye al' }).click();
  await ayrinti.getByRole('button', { name: 'Tamamla' }).click();
  await ayrinti.getByText('Tamamlandı').waitFor();
  await salon.getByText('Salonda bekleyen hasta yok.').waitFor();
  adim('muayeneye alındı ve tamamlandı; salon boşaldı');

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
