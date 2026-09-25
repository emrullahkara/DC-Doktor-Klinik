// Çalıştırma: API (3000) ve web (3001) açıkken `node apps/web/e2e/nobet.e2e.js` (Playwright gerekir).
// Nöbet akışı: İK izin girer ve gelecek ayın çizelgesini hazırlar (izinli güne görev reddedilir,
// dinlenme ihlali raporlanır) → onaya gönderir → mesul müdür gerekçeyle onaylayıp yayınlar.
const { chromium } = require('playwright');
const path = require('path');

const TABAN = process.env.WEB_URL ?? 'http://localhost:3001';
const CIKTI = process.env.E2E_CIKTI ?? require('os').tmpdir();
const zaman = Date.now();
const PAROLA = 'guclu-parola-123';
const SAHIP = `nobet.sahip.${zaman}@ornek.test`;
const HEKIM = `nobet.hekim.${zaman}@ornek.test`;
const IK = `nobet.ik.${zaman}@ornek.test`;
let sonSayfa;

const bugun = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const [yil, ayNo] = bugun.split('-').map(Number);
const AY = new Date(Date.UTC(yil, ayNo, 1)).toISOString().slice(0, 7);
const gunAdi = (g) => new Date(`${AY}-${String(g).padStart(2, '0')}T12:00:00+03:00`).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Istanbul' });

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
  const hucre = (kisi, g) => sayfa.getByRole('button', { name: new RegExp(`^${kisi}, ${gunAdi(g)}`) });

  // Kayıt ve ekip
  await sayfa.goto(TABAN + '/kayit');
  await sayfa.getByRole('button', { name: /Poliklinik \/ Tıp Merkezi/ }).click();
  await sayfa.getByRole('button', { name: /Devam: Kurum bilgileri/ }).click();
  await sayfa.getByLabel('Resmî unvan').fill('Nöbet Deneme Tıp Merkezi');
  await sayfa.getByRole('button', { name: /Devam: Hesabınız/ }).click();
  await sayfa.getByLabel('Ad soyad').fill('Melis Tan');
  await sayfa.getByLabel('E-posta').fill(SAHIP);
  await sayfa.getByLabel('Parola', { exact: true }).fill(PAROLA);
  await sayfa.getByLabel('Parola (tekrar)').fill(PAROLA);
  await sayfa.getByLabel('Mesleğiniz').selectOption('idari');
  await sayfa.getByRole('button', { name: /Devam: Onay/ }).click();
  await sayfa.getByRole('checkbox').check();
  await sayfa.getByRole('button', { name: 'Kurumu oluştur' }).click();
  await sayfa.waitForURL('**/panel');
  await sayfa.getByRole('link', { name: 'Kullanıcılar ve Yetkiler' }).click();
  await kullaniciEkle('Dr. Selim Ak', 'hekim', HEKIM, ['mesul_mudur', 'hekim']);
  await kullaniciEkle('Ece Yurt', 'idari', IK, ['insan_kaynaklari']);
  adim('mesul müdür (hekim) ve İK eklendi');

  // İK: izin ve çizelge
  await girisYap(IK, 'gecici-parola-123');
  await sayfa.getByRole('link', { name: 'Personel ve Belgeler' }).click();
  await sayfa.getByRole('row').filter({ hasText: 'Dr. Selim Ak' }).getByRole('link').click();
  const izinFormu = sayfa.getByRole('form', { name: 'İzin ekle' });
  await izinFormu.getByLabel('İzin türü').selectOption('yillik');
  await izinFormu.getByLabel('Başlangıç').fill(`${AY}-20`);
  await izinFormu.getByLabel('Bitiş').fill(`${AY}-21`);
  await izinFormu.getByRole('button', { name: 'İzin ekle' }).click();
  await sayfa.getByRole('region', { name: 'İzinler' }).getByRole('listitem').filter({ hasText: 'Yıllık izin' }).waitFor();
  adim('hekime yıllık izin girildi');

  await sayfa.getByRole('link', { name: 'Nöbet ve Vardiya' }).click();
  await sayfa.waitForURL('**/panel/nobet');
  await sayfa.getByRole('button', { name: 'Bu ay için çizelge oluştur' }).click();
  await sayfa.getByText('Taslak', { exact: true }).waitFor();

  const panel = sayfa.getByRole('region', { name: 'Seçili gün' });
  await hucre('Dr. Selim Ak', 5).click();
  await panel.getByRole('button', { name: 'Nöbet 08:00–08:00 (24 saat)' }).click();
  await panel.getByText('Nöbet · 08:00–08:00').waitFor();
  await hucre('Dr. Selim Ak', 6).click();
  await panel.getByRole('button', { name: 'Akşam 16:00–24:00' }).click();
  await panel.getByText('Vardiya · 16:00–00:00').waitFor();
  const ihlaller = sayfa.getByRole('region', { name: 'Kural ihlalleri' });
  await ihlaller.getByText(/nöbet sonrası 8 saat dinlenme \(en az 24\)/).waitFor();
  adim('24 saatlik nöbetten 8 saat sonra vardiya: dinlenme ihlali raporlandı');

  await hucre('Dr. Selim Ak', 20).click();
  await panel.getByRole('button', { name: 'Gündüz 08:00–16:00' }).click();
  await sayfa.getByRole('alert').filter({ hasText: 'Kişi bu tarihte izinli.' }).waitFor();
  adim('izinli güne görev reddedildi');

  await hucre('Ece Yurt', 5).click();
  await panel.getByRole('button', { name: 'Gündüz 08:00–16:00' }).click();
  await panel.getByText('Vardiya · 08:00–16:00').waitFor();
  await foto('23-nobet-taslak');
  await sayfa.getByRole('button', { name: 'Onaya gönder' }).click();
  await sayfa.getByText('Onaya siz gönderdiniz; başka bir yetkili onaylamalı.').waitFor();
  if (await sayfa.getByRole('button', { name: 'Onayla ve yayınla' }).count()) throw new Error('gönderen onay düğmesini görüyor');
  adim('İK onaya gönderdi; kendi çizelgesini onaylayamıyor');

  // Mesul müdür onaylar
  await girisYap(HEKIM, 'gecici-parola-123');
  await sayfa.getByRole('button', { name: /^Tümünü göster/ }).click();
  await sayfa.getByRole('region', { name: 'Yapılacaklar ve alarmlar' }).getByText(/nöbet çizelgesi onayınızı bekliyor/).waitFor();
  await sayfa.getByRole('link', { name: 'Nöbet ve Vardiya' }).click();
  await sayfa.getByText('Onay bekliyor', { exact: true }).waitFor();
  await sayfa.getByRole('button', { name: 'Onayla ve yayınla' }).first().click();
  await sayfa.getByLabel('İhlal gerekçesi (zorunlu)').fill('Ekim başında hekim açığı; tek seferlik, hekim onayıyla');
  await sayfa.getByRole('form', { name: 'Onayla ve yayınla' }).getByRole('button', { name: 'Onayla ve yayınla' }).click();
  await sayfa.getByText('Yayında', { exact: true }).waitFor();
  await sayfa.getByText(/İhlal gerekçesi: Ekim başında hekim açığı/).waitFor();
  await foto('24-nobet-yayinda');
  adim('mesul müdür alarmdan gördü, gerekçeyle onayladı; çizelge yayında');

  // Mobil
  await sayfa.setViewportSize({ width: 390, height: 844 });
  await sayfa.reload();
  await sayfa.getByText('Yayında', { exact: true }).waitFor();
  const tasma = await sayfa.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  if (tasma) throw new Error('nöbet sayfasında mobilde yatay taşma var');
  adim('mobilde yatay taşma yok (ızgara kendi içinde kayar)');

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
