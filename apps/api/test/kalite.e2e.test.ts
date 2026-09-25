import type { INestApplication } from '@nestjs/common';
import { Client } from 'pg';
import { calisanEkle, kurumKaydet, testUygulamasi, veritabaniniSifirla, yetkili } from './yardimci';

let app: INestApplication;

const gunSonra = (n: number) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.now() + n * 86_400_000));

beforeAll(async () => {
  await veritabaniniSifirla();
  app = await testUygulamasi();
});

afterAll(async () => {
  await app.close();
});

describe('kalite: olay bildirimi, şikâyet, DÖF', () => {
  let sahip: string;
  let subeId: string;
  let mesul: { id: string; token: string };
  let kalite: { id: string; token: string };
  let kalite2: { id: string; token: string };
  let hemsire: { id: string; token: string };
  let sekreter: string;
  let isimsizOlay: { id: string; takipKodu: string };
  let isimliOlay: { id: string; takipKodu: string };
  const s = (token: string) => yetkili(app, token, subeId);
  const olay = (ek: object = {}) => ({ tur: 'ilac_hatasi', siddet: 'orta', olayZamani: new Date().toISOString(), yer: 'Enjeksiyon odası', aciklama: 'Benzer ambalajlı iki ampul karıştırıldı, uygulama öncesi fark edildi.', ...ek });

  beforeAll(async () => {
    sahip = (await kurumKaydet(app, { meslek: 'idari' })).token;
    subeId = ((await yetkili(app, sahip).get('/ben')).body as { subeler: { id: string }[] }).subeler[0]!.id;
    mesul = await calisanEkle(app, sahip, sahip, 'hekim', 'mesul_mudur', subeId);
    kalite = await calisanEkle(app, sahip, sahip, 'idari', 'kalite_sorumlusu', null);
    kalite2 = await calisanEkle(app, sahip, sahip, 'idari', 'kalite_sorumlusu', null);
    hemsire = await calisanEkle(app, sahip, mesul.token, 'hemsire', 'hemsire', subeId);
    sekreter = (await calisanEkle(app, sahip, sahip, 'idari', 'sekreter', null)).token;
  });

  it('isimsiz bildirimde kimlik kalite ekibine ve denetim izine açık yazılmaz; takip koduyla izlenir', async () => {
    const yanit = await s(hemsire.token).post('/olaylar').send(olay({ isimsiz: true }));
    expect(yanit.status).toBe(201);
    expect(yanit.body.takipKodu).toMatch(/^[A-Z2-9]{8}$/);
    isimsizOlay = yanit.body;
    isimliOlay = (await s(hemsire.token).post('/olaylar').send(olay({ tur: 'dusme', siddet: 'hafif', aciklama: 'Hasta bekleme salonunda kaydı, yaralanma yok.' }))).body;

    const liste = (await s(kalite.token).get('/olaylar')).body as { id: string; bildiren: string | null; isimsiz: boolean; bildirenSifreli?: string }[];
    const isimsiz = liste.find((o) => o.id === isimsizOlay.id)!;
    expect(isimsiz).toMatchObject({ isimsiz: true, bildiren: null });
    expect(isimsiz.bildirenSifreli).toBeUndefined();
    expect(liste.find((o) => o.id === isimliOlay.id)!.bildiren).toBe('Deneme hemsire');

    const iz = (await yetkili(app, sahip).get('/denetim-izi')).body as { eylem: string; varlikId: string; kullanici: string | null; kullaniciId?: string | null }[];
    const kayit = iz.find((k) => k.eylem === 'olay.bildirildi' && k.varlikId === isimsizOlay.id)!;
    expect(JSON.stringify(kayit)).not.toContain(hemsire.id);
    expect(JSON.stringify(kayit)).not.toContain('Deneme hemsire');

    // Veritabanında da açık kimlik yok
    const db = new Client({ connectionString: process.env.TEST_MIGRATION_DATABASE_URL });
    await db.connect();
    const { rows } = await db.query('SELECT bildiren_id, bildiren_sifreli FROM olay_bildirimleri WHERE id = $1', [isimsizOlay.id]);
    await db.end();
    expect(rows[0].bildiren_id).toBeNull();
    expect(rows[0].bildiren_sifreli).not.toContain(hemsire.id);

    expect((await s(hemsire.token).get(`/olaylar/takip/${isimsizOlay.takipKodu}`)).body.durum).toBe('yeni');
    const benim = (await s(hemsire.token).get('/olaylarim')).body as { id: string }[];
    expect(benim.map((o) => o.id)).toEqual([isimliOlay.id]);
    expect((await s(hemsire.token).get('/olaylar')).status).toBe(403);
  });

  it('orta şiddetli olay kök neden ve önlem olmadan kapatılamaz', async () => {
    const kapat = await s(kalite.token).patch(`/olaylar/${isimsizOlay.id}`).send({ durum: 'kapatildi' });
    expect(kapat.body.kod).toBe('KOK_NEDEN_GEREKLI');
    await s(kalite.token).patch(`/olaylar/${isimsizOlay.id}`).send({ sorumluId: kalite.id, kokNeden: 'LASA ilaçlar aynı rafta', alinanOnlem: 'Raf ayrımı ve uyarı etiketi' });
    expect((await s(kalite.token).patch(`/olaylar/${isimsizOlay.id}`).send({ durum: 'kapatildi' })).status).toBe(200);
    expect((await s(hemsire.token).get(`/olaylar/takip/${isimsizOlay.takipKodu}`)).body.durum).toBe('kapatildi');
    expect((await s(kalite.token).patch(`/olaylar/${isimsizOlay.id}`).send({ kokNeden: 'değişiklik' })).body.kod).toBe('OLAY_KAPALI');
  });

  it('şikâyet: resmî kanalda 30 gün; tıbbi şikâyeti yalnızca başhekim/mesul cevaplar', async () => {
    const idari = await s(sekreter).post('/sikayetler').send({ kanal: 'telefon', kategori: 'bekleme', basvuran: 'Ahmet Y.', konu: 'Uzun bekleme', aciklama: '45 dakika bekledim', alinisGunu: gunSonra(0) });
    expect(idari.status).toBe(201);
    expect(idari.body.sonTarih).toBe(gunSonra(7));
    const tibbi = await s(sekreter).post('/sikayetler').send({ kanal: 'cimer', kategori: 'tibbi', resmiNo: 'CMR-2026-1', basvuran: 'Zeynep K.', konu: 'Yanlış tedavi iddiası', alinisGunu: gunSonra(-26) });
    expect(tibbi.body.sonTarih).toBe(gunSonra(4));
    expect((await s(sekreter).get('/sikayetler')).status).toBe(403);
    expect((await s(sekreter).post('/sikayetler').send({ kanal: 'telefon', kategori: 'idari', basvuran: 'X Y', konu: 'Gelecek', alinisGunu: gunSonra(2) })).body.kod).toBe('GELECEK_TARIH');

    const cevapsiz = await s(kalite.token).post(`/sikayetler/${tibbi.body.id}/cevap`).send({ cevap: 'Başvurunuz incelenmiştir, tedavi uygun bulunmuştur.' });
    expect(cevapsiz.body.kod).toBe('TIBBI_DEGERLENDIRME');
    expect((await s(mesul.token).post(`/sikayetler/${tibbi.body.id}/cevap`).send({ cevap: 'Başvurunuz tıbbi kurulca incelenmiştir; ayrıntılı yanıt yazılı iletilmiştir.' })).status).toBe(201);
    expect((await s(kalite.token).post(`/sikayetler/${tibbi.body.id}/kapat`)).status).toBe(201);

    const liste = (await s(sahip).get('/sikayetler')).body as { id: string; resmi: boolean; kalanGun: number | null; durum: string }[];
    expect(liste.find((x) => x.id === idari.body.id)).toMatchObject({ resmi: false, kalanGun: 7, durum: 'acik' });
  });

  it('DÖF: sorumlu tamamlar; tamamlayan doğrulayamaz; başka kalite yetkilisi doğrular', async () => {
    const dof = await s(kalite.token).post('/dofler').send({ kaynak: 'olay', olayId: isimsizOlay.id, baslik: 'LASA ilaç ayrımı', kokNeden: 'Aynı raf', aksiyon: 'Tüm LASA ilaçlar ayrı raf ve kırmızı etiket', sorumluId: hemsire.id, termin: gunSonra(-1) });
    expect(dof.status).toBe(201);
    const dofId = dof.body.id;

    const hemsireAlarm = (await s(hemsire.token).get('/alarmlar')).body as { tur: string; seviye: string }[];
    expect(hemsireAlarm.find((a) => a.tur === 'dof')?.seviye).toBe('ciddi');
    expect(((await s(hemsire.token).get('/dofler')).body as unknown[]).length).toBe(1);

    expect((await s(sekreter).post(`/dofler/${dofId}/tamamla`).send({ not: 'Yapıldı' })).status).toBe(403);
    expect((await s(hemsire.token).post(`/dofler/${dofId}/tamamla`).send({ not: 'Raflar ayrıldı, etiketler asıldı.' })).status).toBe(201);
    expect((await s(hemsire.token).post(`/dofler/${dofId}/dogrula`).send({ not: 'Uygun' })).status).toBe(403);
    // Kalite sorumlusu tamamlamadı → doğrulayabilir
    expect((await s(kalite.token).post(`/dofler/${dofId}/dogrula`).send({ not: 'Yerinde kontrol edildi, uygun.' })).status).toBe(201);

    const dof2 = (await s(kalite.token).post('/dofler').send({ kaynak: 'diger', baslik: 'El hijyeni afişleri', aksiyon: 'Tüm odalara afiş', sorumluId: kalite.id, termin: gunSonra(10) })).body.id;
    await s(kalite.token).post(`/dofler/${dof2}/tamamla`).send({ not: 'Afişler asıldı.' });
    expect((await s(kalite.token).post(`/dofler/${dof2}/dogrula`).send({ not: 'Kendim doğruluyorum' })).body.kod).toBe('KENDI_DOF');
    expect((await s(kalite2.token).post(`/dofler/${dof2}/dogrula`).send({ not: 'Kontrol edildi.' })).status).toBe(201);
  });

  it('alarm: açık olaylar ve süresi yaklaşan resmî şikâyet kalite ekibine; kritikler komutaya', async () => {
    await s(hemsire.token).post('/olaylar').send(olay({ tur: 'yanlis_taraf', siddet: 'ciddi', aciklama: 'Yanlış taraf işaretlemesi işlem öncesi zaman aşımında yakalandı.' }));
    await s(sekreter).post('/sikayetler').send({ kanal: 'sabim', kategori: 'idari', basvuran: 'Murat D.', konu: 'Randevu verilmedi', alinisGunu: gunSonra(-27) });
    const k = (await s(kalite.token).get('/alarmlar')).body as { tur: string; seviye: string; ek?: { siddet?: string } }[];
    expect(k.find((a) => a.tur === 'olay' && a.ek?.siddet === 'ciddi')?.seviye).toBe('kritik');
    expect(k.find((a) => a.tur === 'sikayet' && a.seviye === 'ciddi')).toBeDefined();
    const komuta = (await s(sahip).get('/alarmlar')).body as { tur: string; seviye: string }[];
    expect(komuta.some((a) => a.tur === 'olay' && a.seviye === 'kritik')).toBe(true);
    expect(komuta.some((a) => a.tur === 'olay' && a.seviye !== 'kritik')).toBe(false);
  });
});
