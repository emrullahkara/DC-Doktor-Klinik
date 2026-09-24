// Çalıştırma: API (3000) ve web (3001) açıkken `node apps/web/e2e/personel.e2e.js` (Playwright gerekir).
// Personel ve belge akışı: sahip hekimi ekler → hekimin malpraktis poliçesi dolmuş yüklenir → klinik
// işlemleri askıya alınır (hekim uyarıyı görür) → poliçe yenilenir → kurum ruhsatı yüklenir, alarmlar azalır.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const TABAN = process.env.WEB_URL ?? 'http://localhost:3001';
const CIKTI = process.env.E2E_CIKTI ?? require('os').tmpdir();
const zaman = Date.now();
const PAROLA = 'guclu-parola-123';
const SAHIP = `personel.sahip.${zaman}@ornek.test`;
const HEKIM = `personel.hekim.${zaman}@ornek.test`;
const PDF = Buffer.from('%PDF-1.4\n% deneme poliçe\n');
let sonSayfa;

const gunSonra = (n) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.now() + n * 86_400_000));

(async () => {
  const tarayici = await chromium.launch();
  const baglam = await tarayici.newContext({ viewport: { width: 1440, height: 1100 }, acceptDownloads: true });
  const sayfa = await baglam.newPage();
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

  // Kayıt: tıp merkezi, sahip hekim değil
  await sayfa.goto(TABAN + '/kayit');
  await sayfa.getByRole('button', { name: /Poliklinik \/ Tıp Merkezi/ }).click();
  await sayfa.getByRole('button', { name: /Devam: Kurum bilgileri/ }).click();
  await sayfa.getByLabel('Resmî unvan').fill('Belge Deneme Tıp Merkezi');
  await sayfa.getByRole('button', { name: /Devam: Hesabınız/ }).click();
  await sayfa.getByLabel('Ad soyad').fill('Deniz Arslan');
  await sayfa.getByLabel('E-posta').fill(SAHIP);
  await sayfa.getByLabel('Parola', { exact: true }).fill(PAROLA);
  await sayfa.getByLabel('Parola (tekrar)').fill(PAROLA);
  await sayfa.getByLabel('Mesleğiniz').selectOption('idari');
  await sayfa.getByRole('button', { name: /Devam: Onay/ }).click();
  await sayfa.getByRole('checkbox').check();
  await sayfa.getByRole('button', { name: 'Kurumu oluştur' }).click();
  await sayfa.waitForURL('**/panel');
  const alarmKarti = sayfa.getByRole('region', { name: 'Yapılacaklar ve alarmlar' });
  await alarmKarti.getByText('Ruhsat / faaliyet izin belgesi yüklenmemiş').waitFor();
  adim('yeni kurumda eksik ruhsat alarmı Komuta Merkezi’nde');

  // Hekim ekle: mesul müdür + hekim (sahip istisnası)
  await sayfa.getByRole('link', { name: 'Kullanıcılar ve Yetkiler' }).click();
  await sayfa.getByRole('button', { name: '+ Kullanıcı ekle' }).click();
  await sayfa.getByLabel('Ad soyad').fill('Dr. Kaan Er');
  await sayfa.getByLabel('E-posta').fill(HEKIM);
  await sayfa.getByLabel('Meslek').selectOption('hekim');
  await sayfa.getByLabel('Geçici parola').fill('gecici-parola-123');
  await sayfa.getByRole('button', { name: 'Kaydet' }).click();
  const satir = sayfa.getByRole('row').filter({ hasText: 'Dr. Kaan Er' });
  await satir.getByLabel('Rol').selectOption('mesul_mudur');
  await satir.getByRole('button', { name: 'Rol ata' }).click();
  await satir.getByText(/^Mesul müdür · /).waitFor();
  await satir.getByRole('button', { name: 'Rol ata' }).click();
  await satir.getByLabel('Rol').selectOption('hekim');
  await satir.getByRole('button', { name: 'Rol ata' }).click();
  await satir.getByText(/^Hekim · /).waitFor();
  adim('hekim eklendi (mesul müdür + hekim)');

  // Personel listesi ve kart
  await sayfa.getByRole('link', { name: 'Personel ve Nöbet' }).click();
  await sayfa.waitForURL('**/panel/personel');
  const hekimSatiri = sayfa.getByRole('row').filter({ hasText: 'Dr. Kaan Er' });
  await hekimSatiri.getByText(/\d+ eksik/).waitFor();
  await hekimSatiri.getByRole('link', { name: 'Dr. Kaan Er' }).click();
  await sayfa.waitForURL(/\/panel\/personel\/[0-9a-f-]{36}$/);
  const hekimYolu = new URL(sayfa.url()).pathname;
  const eksikler = sayfa.getByRole('list', { name: 'Eksik zorunlu belgeler' });
  await eksikler.getByRole('button', { name: '+ Zorunlu mali sorumluluk (malpraktis) sigortası' }).click();
  const form = sayfa.getByRole('form', { name: 'Belge ekle' });
  if ((await form.getByLabel('Belge türü').inputValue()) !== 'malpraktis_sigortasi') throw new Error('eksik belge türü forma gelmedi');
  if (!(await form.getByRole('button', { name: 'Belge ekle' }).isDisabled())) throw new Error('bitişsiz süreli belge eklenebiliyor');
  await form.getByLabel('Belge / poliçe no').fill('POL-2025-889');
  await form.getByLabel('Bitiş tarihi').fill(gunSonra(-1));
  await form.getByLabel(/^Dosya/).setInputFiles({ name: 'police.pdf', mimeType: 'application/pdf', buffer: PDF });
  await form.getByRole('button', { name: 'Belge ekle' }).click();
  await sayfa.getByText('Süresi doldu (1 gün önce)').waitFor();
  await sayfa.getByRole('alert').filter({ hasText: 'askıya alındı' }).waitFor();
  await foto('19-personel-karti-askida');
  adim('dolmuş malpraktis poliçesi yüklendi; kartta askıya alma uyarısı');

  await sayfa.getByRole('link', { name: 'Komuta Merkezi' }).click();
  await alarmKarti.getByText(/malpraktis\) sigortası 1 gün önce doldu/).waitFor();
  await alarmKarti.getByText('işlemler askıda').waitFor();
  adim('Komuta Merkezi alarmında dolmuş poliçe ve askı');

  // Hekim girişi: üst şerit uyarısı, kendi kartı
  await girisYap(HEKIM, 'gecici-parola-123');
  await sayfa.getByRole('alert').filter({ hasText: 'işlemleriniz askıya alındı' }).waitFor();
  await sayfa.getByRole('alert').getByRole('link', { name: 'Belgelerim' }).click();
  await sayfa.getByRole('heading', { name: 'Belgelerim' }).waitFor();
  await sayfa.getByText('Süresi doldu (1 gün önce)').waitFor();
  await foto('20-hekim-askida');
  adim('hekim girişinde askı uyarısı; uyarıdan kendi belgelerine geçti');

  // Sahip poliçeyi yeniler, dosyayı indirir
  await girisYap(SAHIP, PAROLA);
  await sayfa.goto(TABAN + hekimYolu);
  const form2 = sayfa.getByRole('form', { name: 'Belge ekle' });
  await form2.getByLabel('Belge türü').selectOption('malpraktis_sigortasi');
  await form2.getByLabel('Bitiş tarihi').fill(gunSonra(365));
  await form2.getByRole('button', { name: 'Belge ekle' }).click();
  await sayfa.getByText('Geçmiş ve kaldırılan belgeler (1)').waitFor();
  if (await sayfa.getByRole('alert').filter({ hasText: 'askıya alındı' }).count()) throw new Error('yenilemeden sonra askı sürüyor');
  await sayfa.getByText('Geçmiş ve kaldırılan belgeler (1)').click();
  const [indirme] = await Promise.all([sayfa.waitForEvent('download'), sayfa.getByRole('button', { name: /^İndir: Zorunlu mali sorumluluk/ }).click()]);
  const inen = fs.readFileSync(await indirme.path());
  if (!inen.equals(PDF) || indirme.suggestedFilename() !== 'police.pdf') throw new Error('indirilen dosya farklı');
  adim('poliçe yenilendi, askı kalktı; eski poliçe dosyası bütün olarak indi');

  // Kurum belgeleri
  await sayfa.getByRole('link', { name: 'Ruhsat ve Belgeler' }).click();
  await sayfa.waitForURL('**/panel/belgeler');
  await sayfa.getByRole('button', { name: '+ Ruhsat / faaliyet izin belgesi' }).click();
  const kform = sayfa.getByRole('form', { name: 'Belge ekle' });
  await kform.getByLabel('Belge / poliçe no').fill('34-RUH-2024-117');
  await kform.getByLabel('Veren kurum').fill('İstanbul İl Sağlık Müdürlüğü');
  await kform.getByRole('button', { name: 'Belge ekle' }).click();
  await sayfa.getByRole('cell', { name: /34-RUH-2024-117/ }).waitFor();
  await kform.getByLabel('Belge türü').selectOption('tibbi_atik_sozlesmesi');
  await kform.getByLabel('Bitiş tarihi').fill(gunSonra(20));
  await kform.getByRole('button', { name: 'Belge ekle' }).click();
  await sayfa.getByText('20 gün kaldı').waitFor();
  if (await sayfa.getByRole('button', { name: '+ Ruhsat / faaliyet izin belgesi' }).count()) throw new Error('ruhsat hâlâ eksik görünüyor');
  await foto('21-kurum-belgeleri');
  adim('ruhsat ve tıbbi atık sözleşmesi yüklendi; eksikler güncellendi');

  await sayfa.getByRole('link', { name: 'Komuta Merkezi' }).click();
  await alarmKarti.getByText('Tıbbi atık sözleşmesi 20 gün sonra doluyor').waitFor();
  if (await alarmKarti.getByText('Ruhsat / faaliyet izin belgesi yüklenmemiş').count()) throw new Error('ruhsat alarmı kalkmadı');
  await foto('22-komuta-alarmlar');
  adim('Komuta alarmları güncellendi');

  // Mobil
  await sayfa.setViewportSize({ width: 390, height: 844 });
  await sayfa.goto(TABAN + hekimYolu);
  await sayfa.getByRole('heading', { name: 'Dr. Kaan Er' }).waitFor();
  const tasma = await sayfa.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  if (tasma) throw new Error('personel kartında mobilde yatay taşma var');
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
