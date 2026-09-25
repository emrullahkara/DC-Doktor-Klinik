// Çalıştırma: API (3000) ve web (3001) açıkken `node apps/web/e2e/muayene.e2e.js` (Playwright gerekir).
// Muayene akışı: randevu → kabul → muayene kaydı → vital, tanı, reçete (alerji uyarısı) → parolalı imza → kilit → ek not.
const { chromium } = require('playwright');
const path = require('path');

const TABAN = process.env.WEB_URL ?? 'http://localhost:3001';
const CIKTI = process.env.E2E_CIKTI ?? require('os').tmpdir();
const zaman = Date.now();
const PAROLA = 'guclu-parola-123';
let sonSayfa;

(async () => {
  const tarayici = await chromium.launch();
  const sayfa = await tarayici.newPage({ viewport: { width: 1440, height: 1100 } });
  sonSayfa = sayfa;
  const hatalar = [];
  sayfa.on('pageerror', (e) => hatalar.push(e.message));
  const foto = (ad) => sayfa.screenshot({ path: path.join(CIKTI, `${ad}.png`), fullPage: true });
  const adim = (m) => console.log('✓', m);

  await sayfa.goto(TABAN + '/kayit');
  await sayfa.getByRole('button', { name: /Poliklinik \/ Tıp Merkezi/ }).click();
  await sayfa.getByRole('button', { name: /Devam: Kurum bilgileri/ }).click();
  await sayfa.getByLabel('Resmî unvan').fill('Muayene Deneme Polikliniği');
  await sayfa.getByRole('button', { name: /Devam: Hesabınız/ }).click();
  await sayfa.getByLabel('Ad soyad').fill('Dr. Ayla Demir');
  await sayfa.getByLabel('E-posta').fill(`muayene.${zaman}@ornek.test`);
  await sayfa.getByLabel('Parola', { exact: true }).fill(PAROLA);
  await sayfa.getByLabel('Parola (tekrar)').fill(PAROLA);
  await sayfa.getByLabel('Mesleğiniz').selectOption('hekim');
  await sayfa.getByRole('button', { name: /Devam: Onay/ }).click();
  await sayfa.getByRole('checkbox').check();
  await sayfa.getByRole('button', { name: 'Kurumu oluştur' }).click();
  await sayfa.waitForURL('**/panel');

  // Hasta + alerji
  await sayfa.goto(TABAN + '/panel/hastalar/yeni');
  await sayfa.getByLabel('Kimlik türü').selectOption('kimliksiz');
  await sayfa.getByLabel('Ad', { exact: true }).fill('Kemal');
  await sayfa.getByLabel('Soyad', { exact: true }).fill('Şahin');
  await sayfa.getByLabel('Doğum tarihi').fill('1968-03-02');
  await sayfa.getByLabel('Kişisel verilerin işlenmesine ilişkin aydınlatma metni hastaya sunuldu.').check();
  await sayfa.getByRole('button', { name: 'Hastayı kaydet' }).click();
  await sayfa.waitForURL(/\/panel\/hastalar\/[0-9a-f-]{36}$/);
  await sayfa.getByLabel('Uyarı türü').selectOption('alerji');
  await sayfa.getByLabel('Açıklama').fill('Penisilin');
  await sayfa.getByRole('button', { name: 'Uyarı ekle' }).click();
  await sayfa.getByRole('list', { name: 'Uyarılar' }).getByText('Alerji: Penisilin').waitFor();

  // Randevu ve kabul
  await sayfa.getByRole('link', { name: 'Randevular' }).click();
  await sayfa.getByRole('button', { name: '+ Yeni randevu' }).click();
  const form = sayfa.getByRole('form', { name: 'Yeni randevu' });
  await form.getByLabel('Hasta').fill('kemal');
  await form.getByRole('button', { name: /Kemal Şahin/ }).click();
  await form.getByLabel('Saat').fill('19:00');
  await form.getByRole('button', { name: 'Randevuyu kaydet' }).click();
  await sayfa.getByRole('button', { name: /^19:00 Kemal Şahin/ }).click();
  const ayrinti = sayfa.getByRole('region', { name: 'Randevu' });
  await ayrinti.getByRole('button', { name: 'Hasta geldi (kabul)' }).click();
  await ayrinti.getByRole('button', { name: 'Muayeneye al' }).click();
  await ayrinti.getByRole('button', { name: 'Muayene kaydını aç' }).click();
  await sayfa.waitForURL(/\/panel\/muayene\/[0-9a-f-]{36}$/);
  await sayfa.getByText('Erişiminiz kayda alınıyor · Tedavi ilişkisi').waitFor();
  adim('randevudan muayene kaydı açıldı; erişim nedeni gösteriliyor');

  // Kayıt
  await sayfa.getByLabel('Şikâyet').fill('İki haftadır sabah baş ağrısı.');
  await sayfa.getByLabel('Sistolik tansiyon').fill('148');
  await sayfa.getByLabel('Diastolik tansiyon').fill('92');
  await sayfa.getByLabel('Boy').fill('174');
  await sayfa.getByLabel('Kilo').fill('88');
  await sayfa.getByText('29.1').waitFor();
  await sayfa.getByText('Sistolik tansiyon olağan aralığın dışında: 148 mmHg').waitFor();
  const imzaDugmesi = sayfa.getByRole('button', { name: 'İmzala ve bitir' });
  if (!(await imzaDugmesi.isDisabled())) throw new Error('tanı yokken imza düğmesi etkin');
  adim('vitaller girildi; VKİ hesaplandı; olağan dışı tansiyon uyarısı; tanısız imza kapalı');

  await sayfa.getByLabel('Fizik muayene').fill('Genel durum iyi. Kardiyovasküler muayene doğal.');
  await sayfa.getByLabel('Tanı adı veya ICD-10 kodu ile arayın').fill('hipertans');
  await sayfa.getByRole('button', { name: /I10 Esansiyel/ }).click();
  await sayfa.getByText('Esansiyel (primer) hipertansiyon').waitFor();
  await sayfa.getByLabel('İlaç (ad ve form)').fill('Penisilin V 1000 mg tablet');
  await sayfa.getByLabel('Kullanım').fill('2x1');
  await sayfa.getByRole('button', { name: '+ İlaç ekle' }).click();
  await sayfa.getByText('“Penisilin V 1000 mg tablet” reçetede; hastanın “Penisilin” alerjisi kayıtlı.').waitFor();
  adim('ICD-10 tanı eklendi; alerjiyle çakışan ilaç kırmızı uyarı verdi');

  const recete = sayfa.getByRole('region', { name: 'e-Reçete taslağı' });
  await recete.getByRole('button', { name: 'Kaldır' }).click();
  await sayfa.getByLabel('İlaç (ad ve form)').fill('Amlodipin 10 mg tablet');
  await sayfa.getByLabel('Kullanım').fill('1x1 sabah');
  await sayfa.getByRole('button', { name: '+ İlaç ekle' }).click();
  await sayfa.getByLabel('Plan ve öneriler').fill('Tuz kısıtlaması, 2 hafta sonra kontrol.');
  await sayfa.getByText(/Taslak kaydedildi/).waitFor({ timeout: 10000 });
  await sayfa.waitForFunction(() => !document.querySelector('button[disabled]')?.textContent?.includes('İmzala ve bitir'));
  await foto('14-muayene-taslak');
  adim('otomatik kaydedildi');

  // İmza
  await imzaDugmesi.click();
  await sayfa.getByLabel('Parolanız').fill('yanlis-parola');
  await sayfa.getByRole('button', { name: 'İmzala', exact: true }).click();
  await sayfa.getByText('Parola hatalı; kayıt imzalanmadı.').waitFor();
  await sayfa.getByLabel('Parolanız').fill(PAROLA);
  await sayfa.getByRole('button', { name: 'İmzala', exact: true }).click();
  await sayfa.getByText(/İmzalandı · .* · Özet [0-9a-f]{12}/).waitFor();
  if (!(await sayfa.getByLabel('Plan ve öneriler').isDisabled())) throw new Error('imzalı kayıt düzenlenebilir');
  adim('yanlış parola reddedildi; imzalandı; alanlar kilitlendi');

  await sayfa.getByLabel('Not').fill('Hasta ilaç kullanımı konusunda bilgilendirildi.');
  await sayfa.getByRole('button', { name: 'Ek not ekle' }).click();
  await sayfa.getByText('Hasta ilaç kullanımı konusunda bilgilendirildi.').waitFor();
  await foto('15-muayene-imzali');
  adim('imza sonrası ek not eklendi');

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
