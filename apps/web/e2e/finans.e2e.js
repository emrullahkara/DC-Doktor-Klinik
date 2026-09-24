// Çalıştırma: API (3000) ve web (3001) açıkken `node apps/web/e2e/finans.e2e.js` (Playwright gerekir).
// Finans akışı: sahip hizmet tanımlar → sekreter hasta hesabına ekler, tahsilat alır → sahip iade yapar,
// Komuta Merkezi'nde ciro ve alacağı görür → sekreter kasayı farkla kapatır.
const { chromium } = require('playwright');
const path = require('path');

const TABAN = process.env.WEB_URL ?? 'http://localhost:3001';
const CIKTI = process.env.E2E_CIKTI ?? require('os').tmpdir();
const zaman = Date.now();
const PAROLA = 'guclu-parola-123';
const SAHIP = `finans.sahip.${zaman}@ornek.test`;
const SEKRETER = `finans.sekreter.${zaman}@ornek.test`;
let sonSayfa;

(async () => {
  const tarayici = await chromium.launch();
  const sayfa = await tarayici.newPage({ viewport: { width: 1440, height: 1100 } });
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

  // Kurum sahibi (hekim değil) kaydı
  await sayfa.goto(TABAN + '/kayit');
  await sayfa.getByRole('button', { name: /Poliklinik \/ Tıp Merkezi/ }).click();
  await sayfa.getByRole('button', { name: /Devam: Kurum bilgileri/ }).click();
  await sayfa.getByLabel('Resmî unvan').fill('Finans Deneme Polikliniği');
  await sayfa.getByRole('button', { name: /Devam: Hesabınız/ }).click();
  await sayfa.getByLabel('Ad soyad').fill('Selin Aksoy');
  await sayfa.getByLabel('E-posta').fill(SAHIP);
  await sayfa.getByLabel('Parola', { exact: true }).fill(PAROLA);
  await sayfa.getByLabel('Parola (tekrar)').fill(PAROLA);
  await sayfa.getByLabel('Mesleğiniz').selectOption('idari');
  await sayfa.getByRole('button', { name: /Devam: Onay/ }).click();
  await sayfa.getByRole('checkbox').check();
  await sayfa.getByRole('button', { name: 'Kurumu oluştur' }).click();
  await sayfa.waitForURL('**/panel');

  // Hizmet tanımı: sahibin fiyat onay yetkisi olduğu için doğrudan yayınlanır
  await sayfa.getByRole('link', { name: 'Hizmet ve fiyat listesini oluşturun' }).click();
  await sayfa.waitForURL('**/panel/finans');
  const hizmetBolumu = sayfa.getByRole('region', { name: 'Hizmetler ve fiyatlar' });
  await hizmetBolumu.getByLabel('Kod').fill('MUA-01');
  await hizmetBolumu.getByLabel('Hizmet adı').fill('Dahiliye muayenesi');
  await hizmetBolumu.getByLabel('Fiyat (KDV dahil, TL)').fill('1500');
  await hizmetBolumu.getByRole('button', { name: 'Hizmet ekle' }).click();
  await hizmetBolumu.getByRole('cell', { name: 'Dahiliye muayenesi' }).waitFor();
  if (await hizmetBolumu.getByText('Onay bekliyor').count()) throw new Error('sahibin hizmeti onaya düştü');
  adim('sahip hizmeti tanımladı; fiyat doğrudan yayında');

  // Sekreter ekle
  await sayfa.getByRole('link', { name: 'Kullanıcılar ve Yetkiler' }).click();
  await sayfa.getByRole('button', { name: '+ Kullanıcı ekle' }).click();
  await sayfa.getByLabel('Ad soyad').fill('Burak Tan');
  await sayfa.getByLabel('E-posta').fill(SEKRETER);
  await sayfa.getByLabel('Meslek').selectOption('idari');
  await sayfa.getByLabel('Geçici parola').fill('gecici-parola-123');
  await sayfa.getByRole('button', { name: 'Kaydet' }).click();
  const satir = sayfa.getByRole('row').filter({ hasText: 'Burak Tan' });
  await satir.getByLabel('Rol').selectOption('sekreter');
  await satir.getByRole('button', { name: 'Rol ata' }).click();
  await satir.getByText('Hasta kabul / sekreter · Merkez').first().waitFor();
  adim('sekreter eklendi');

  // Sekreter: hasta, hesap kalemi, tahsilat
  await girisYap(SEKRETER, 'gecici-parola-123');
  await sayfa.goto(TABAN + '/panel/hastalar/yeni');
  await sayfa.getByLabel('Kimlik türü').selectOption('kimliksiz');
  await sayfa.getByLabel('Ad', { exact: true }).fill('Nazlı');
  await sayfa.getByLabel('Soyad', { exact: true }).fill('Güneş');
  await sayfa.getByLabel('Doğum tarihi').fill('1990-07-14');
  await sayfa.getByLabel('Kişisel verilerin işlenmesine ilişkin aydınlatma metni hastaya sunuldu.').check();
  await sayfa.getByRole('button', { name: 'Hastayı kaydet' }).click();
  await sayfa.waitForURL(/\/panel\/hastalar\/[0-9a-f-]{36}$/);
  const hastaYolu = new URL(sayfa.url()).pathname;

  const hesap = sayfa.getByRole('region', { name: 'Hesap' });
  await hesap.getByLabel('Hizmet', { exact: true }).selectOption({ label: 'MUA-01 · Dahiliye muayenesi · ₺1.500,00' });
  await hesap.getByLabel('İndirim %').fill('30');
  await hesap.getByText('%20 üzerindeki indirimi yalnızca yönetici uygulayabilir.').waitFor();
  const kalemDugmesi = hesap.getByRole('button', { name: /^Hizmet ekle/ });
  if (!(await kalemDugmesi.isDisabled())) throw new Error('sekreter eşik üstü indirim uygulayabiliyor');
  await hesap.getByLabel('İndirim %').fill('10');
  await hesap.getByLabel('İndirim nedeni').fill('Anlaşmalı kurum');
  await hesap.getByRole('button', { name: 'Hizmet ekle · ₺1.350,00' }).click();
  await hesap.getByText('Anlaşmalı kurum').waitFor();
  adim('eşik üstü indirim engellendi; %10 indirimli kalem eklendi (₺1.350)');

  const tahsilat = hesap.getByRole('form', { name: 'Tahsilat al' });
  if ((await tahsilat.getByLabel('Tutar (TL)').inputValue()) !== '1350') throw new Error('tahsilat tutarı bakiyeyle dolmadı');
  await tahsilat.getByLabel('Tutar (TL)').fill('1000');
  await tahsilat.getByRole('button', { name: 'Tahsilat al' }).click();
  await hesap.getByText('₺350,00').first().waitFor();
  if (await hesap.getByRole('button', { name: 'İade', exact: true }).count()) throw new Error('sekretere iade düğmesi gösterildi');
  await foto('16-hasta-hesap');
  adim('₺1.000 nakit tahsilat alındı; bakiye ₺350; tahsilatı alan kişiye iade düğmesi yok');

  // Sahip: iade ve Komuta Merkezi
  await girisYap(SAHIP, PAROLA);
  await sayfa.getByRole('link', { name: 'Finans' }).click();
  const kasa = sayfa.getByRole('region', { name: 'Gün sonu kasa' });
  await kasa.getByText('Hareketler (1)').click();
  await kasa.getByRole('button', { name: 'İade', exact: true }).click();
  await kasa.getByLabel('İade tutarı (TL)').fill('200');
  await kasa.getByLabel('İade nedeni').fill('Fazla alınan tutar');
  await kasa.getByRole('button', { name: 'İade', exact: true }).last().click();
  await kasa.getByText('Hareketler (2)').waitFor();
  await kasa.getByRole('cell', { name: '₺800,00' }).first().waitFor();
  adim('sahip ₺200 iade yaptı; kasa neti ₺800');

  await sayfa.getByRole('link', { name: 'Komuta Merkezi' }).click();
  const kpi = (ad) => sayfa.locator(`[data-kpi="${ad}"]`);
  await kpi('Bugünkü ciro').getByText('₺800,00').waitFor();
  await kpi('Tahsil edilmemiş alacak').getByText('₺550,00').waitFor();
  await kpi('Tahsil edilmemiş alacak').getByText('1 hastada açık bakiye').waitFor();
  await sayfa.getByRole('img', { name: /Son 14 gün net tahsilat/ }).waitFor();
  const tamamAdim = sayfa.getByText('Hizmet ve fiyat listesini oluşturun').locator('..');
  await tamamAdim.getByText('(tamamlandı)').waitFor();
  await foto('17-komuta-gercek-veri');
  await sayfa.getByRole('button', { name: 'Tablo olarak göster' }).click();
  await sayfa.getByRole('cell', { name: '₺800,00' }).waitFor();
  adim('Komuta Merkezi: ciro ₺800, alacak ₺550; grafik ve tablo görünümü; kurulum adımı tamamlandı');

  // Sekreter: kasayı farkla kapatır
  await girisYap(SEKRETER, 'gecici-parola-123');
  await sayfa.getByRole('link', { name: 'Finans' }).click();
  const kasa2 = sayfa.getByRole('region', { name: 'Gün sonu kasa' });
  await kasa2.getByLabel('Sayılan nakit (TL)').fill('790');
  const kapatDugmesi = kasa2.getByRole('button', { name: 'Kasayı kapat' });
  if (!(await kapatDugmesi.isDisabled())) throw new Error('fark açıklamasız kapatılabiliyor');
  await kasa2.getByLabel('Fark açıklaması').fill('Bozuk para eksiği');
  await kapatDugmesi.click();
  await kasa2.getByText(/Kasa kapatıldı · Burak Tan · fark -?−?₺10,00/).waitFor();
  await foto('18-kasa-kapandi');
  adim('kasa ₺10 eksikle, açıklamayla kapatıldı');

  // Kapalı günde yeni tahsilat alınamaz
  await sayfa.goto(TABAN + hastaYolu);
  const tahsilat2 = sayfa.getByRole('region', { name: 'Hesap' }).getByRole('form', { name: 'Tahsilat al' });
  await tahsilat2.getByLabel('Tutar (TL)').fill('50');
  await tahsilat2.getByRole('button', { name: 'Tahsilat al' }).click();
  await sayfa.getByRole('region', { name: 'Hesap' }).getByRole('alert').waitFor();
  adim('kapalı güne tahsilat reddedildi');

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
