// Çalıştırma: API (3000) ve web (3001) açıkken `node apps/web/e2e/hasta.e2e.js` (Playwright gerekir).
// Hasta akışı: hekim sahip kurum kaydı → yeni hasta (KVKK) → kart → kimlik gösterme → uyarı → rıza geri çekme → arama → mükerrer.
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

  // Hekim sahip ile kurum kaydı (hekim rolü hasta kaydedebilir)
  await sayfa.goto(TABAN + '/kayit');
  await sayfa.getByRole('button', { name: /Poliklinik \/ Tıp Merkezi/ }).click();
  await sayfa.getByRole('button', { name: /Devam: Kurum bilgileri/ }).click();
  await sayfa.getByLabel('Resmî unvan').fill('Hasta Deneme Tıp Merkezi');
  await sayfa.getByRole('button', { name: /Devam: Hesabınız/ }).click();
  await sayfa.getByLabel('Ad soyad').fill('Dr. Selin Aydın');
  await sayfa.getByLabel('E-posta').fill(`hekim.sahip.${zaman}@ornek.test`);
  await sayfa.getByLabel('Parola', { exact: true }).fill('guclu-parola-123');
  await sayfa.getByLabel('Parola (tekrar)').fill('guclu-parola-123');
  await sayfa.getByLabel('Mesleğiniz').selectOption('hekim');
  await sayfa.getByRole('button', { name: /Devam: Onay/ }).click();
  await sayfa.getByRole('checkbox').check();
  await sayfa.getByRole('button', { name: 'Kurumu oluştur' }).click();
  await sayfa.waitForURL('**/panel');
  adim('hekim sahip ile kurum kaydedildi');

  // Yeni hasta
  await sayfa.getByRole('link', { name: 'Hastalar' }).click();
  await sayfa.waitForURL('**/panel/hastalar');
  await sayfa.getByRole('link', { name: '+ Yeni hasta' }).click();
  await sayfa.waitForURL('**/panel/hastalar/yeni');
  await sayfa.getByLabel('Kimlik / pasaport no').fill('10000000147');
  await sayfa.getByText('Geçersiz T.C. kimlik numarası.').waitFor();
  await sayfa.getByLabel('Kimlik / pasaport no').fill('10000000146');
  await sayfa.getByLabel('Ad', { exact: true }).fill('İlker');
  await sayfa.getByLabel('Soyad', { exact: true }).fill('Işık');
  await sayfa.getByLabel('Doğum tarihi').fill('1980-05-17');
  await sayfa.getByLabel('Cinsiyet').selectOption('erkek');
  await sayfa.getByLabel('Cep telefonu').fill('0532 123 45 67');
  const kaydet = sayfa.getByRole('button', { name: 'Hastayı kaydet' });
  if (!(await kaydet.isDisabled())) throw new Error('aydınlatma sunulmadan kaydet düğmesi etkin');
  await sayfa.getByLabel('Kişisel verilerin işlenmesine ilişkin aydınlatma metni hastaya sunuldu.').check();
  await sayfa.getByLabel(/Kampanya ve tanıtım iletileri/).check();
  await foto('10-yeni-hasta');
  await kaydet.click();
  await sayfa.waitForURL(/\/panel\/hastalar\/[0-9a-f-]{36}$/);
  const kartAdresi = sayfa.url();
  await sayfa.getByRole('heading', { name: 'İlker Işık' }).waitFor();
  await sayfa.getByText('100******46').waitFor();
  adim('aydınlatma olmadan kaydet pasifti; hasta kaydedildi, kimlik maskeli');

  await sayfa.getByRole('button', { name: 'Göster' }).click();
  await sayfa.getByText('10000000146').waitFor();
  adim('açık kimlik no gösterildi');

  await sayfa.getByLabel('Uyarı türü').selectOption('alerji');
  await sayfa.getByLabel('Açıklama').fill('Penisilin');
  await sayfa.getByRole('button', { name: 'Uyarı ekle' }).click();
  await sayfa.getByRole('list', { name: 'Uyarılar' }).getByText('Alerji: Penisilin').waitFor();
  adim('alerji uyarısı eklendi ve başlıkta görünüyor');

  const pazarlama = sayfa.getByRole('listitem').filter({ hasText: 'Kampanya ve tanıtım iletileri' });
  await pazarlama.getByText('Rıza verildi').waitFor();
  await pazarlama.getByRole('button', { name: 'Geri çek' }).click();
  await pazarlama.getByText('Rıza yok').waitFor();
  await foto('11-hasta-karti');
  adim('pazarlama rızası geri çekildi');

  // Arama
  await sayfa.getByRole('link', { name: 'Hastalar' }).first().click();
  await sayfa.waitForURL('**/panel/hastalar');
  await sayfa.getByLabel('Hasta ara').fill('ILKER isik');
  await sayfa.getByRole('link', { name: 'İlker Işık' }).waitFor();
  await foto('12-hasta-arama');
  adim('Türkçe karakterden bağımsız arama buldu');

  // Mükerrer kayıt
  await sayfa.getByRole('link', { name: '+ Yeni hasta' }).click();
  await sayfa.getByLabel('Kimlik / pasaport no').fill('10000000146');
  await sayfa.getByLabel('Ad', { exact: true }).fill('İlker');
  await sayfa.getByLabel('Soyad', { exact: true }).fill('Işık');
  await sayfa.getByLabel('Kişisel verilerin işlenmesine ilişkin aydınlatma metni hastaya sunuldu.').check();
  await sayfa.getByRole('button', { name: 'Hastayı kaydet' }).click();
  await sayfa.getByRole('link', { name: 'Mevcut kaydı aç' }).click();
  await sayfa.waitForURL(kartAdresi);
  adim('aynı kimlik numarası mevcut kayda yönlendirdi');

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
