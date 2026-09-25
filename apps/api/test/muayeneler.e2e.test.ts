import type { INestApplication } from '@nestjs/common';
import { Client } from 'pg';
import request from 'supertest';
import { calisanEkle, kurumKaydet, testUygulamasi, veritabaniniSifirla, yetkili } from './yardimci';

let app: INestApplication;

/** Türkiye saatine göre bugünün tarihi */
const bugun = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

beforeAll(async () => {
  await veritabaniniSifirla();
  app = await testUygulamasi();
});

afterAll(async () => {
  await app.close();
});

describe('muayene kaydı', () => {
  let sahip: string;
  let subeId: string;
  let sekreter: string;
  let mesul: { id: string; token: string };
  let hekim: { id: string; token: string; eposta?: string };
  let digerHekim: { id: string; token: string };
  let hemsire: { id: string; token: string };
  let hastaId: string;
  let randevuId: string;
  let muayeneId: string;
  const s = (token: string) => yetkili(app, token, subeId);

  beforeAll(async () => {
    const kayit = await kurumKaydet(app, { meslek: 'idari' });
    sahip = kayit.token;
    subeId = ((await yetkili(app, sahip).get('/ben')).body as { subeler: { id: string }[] }).subeler[0]!.id;
    mesul = await calisanEkle(app, sahip, sahip, 'hekim', 'mesul_mudur', subeId);
    hekim = await calisanEkle(app, sahip, mesul.token, 'hekim', 'hekim', subeId);
    digerHekim = await calisanEkle(app, sahip, mesul.token, 'hekim', 'hekim', subeId);
    hemsire = await calisanEkle(app, sahip, mesul.token, 'hemsire', 'hemsire', subeId);
    sekreter = (await calisanEkle(app, sahip, sahip, 'idari', 'sekreter', null)).token;

    const hasta = await yetkili(app, sekreter).post('/hastalar').send({ kimlik: { tur: 'kimliksiz' }, ad: 'Kemal', soyad: 'Şahin', aydinlatma: { kanal: 'tablet_imza' } });
    hastaId = hasta.body.id;
    await s(hemsire.token).post(`/hastalar/${hastaId}/uyarilar`).send({ tur: 'alerji', aciklama: 'Penisilin' });
    const randevu = await s(sekreter).post('/randevular').send({ kisiId: hastaId, hekimId: hekim.id, baslangic: `${bugun}T21:00:00+03:00`, sureDakika: 30, tur: 'ilk_muayene' });
    randevuId = randevu.body.id;
  });

  it('hasta kabul edilmeden muayene kaydı açılamaz', async () => {
    const yanit = await s(hemsire.token).post('/muayeneler').send({ randevuId });
    expect(yanit.status).toBe(422);
    expect(yanit.body.kod).toBe('HASTA_GELMEDI');
  });

  it('kabulden sonra hemşire kaydı açar; ikinci istek aynı kaydı döndürür', async () => {
    await s(sekreter).post(`/randevular/${randevuId}/durum`).send({ durum: 'geldi' });
    const ilk = await s(hemsire.token).post('/muayeneler').send({ randevuId });
    expect(ilk.status).toBe(201);
    expect(ilk.body.yeni).toBe(true);
    muayeneId = ilk.body.id;
    const ikinci = await s(hekim.token).post('/muayeneler').send({ randevuId });
    expect(ikinci.body).toEqual({ id: muayeneId, yeni: false });
  });

  it('hemşire şikâyet ve vital girer; tanı giremez', async () => {
    const yanit = await s(hemsire.token).patch(`/muayeneler/${muayeneId}`).send({ sikayet: 'Baş ağrısı', vitaller: { tansiyonSistolik: 148, tansiyonDiastolik: 92, nabiz: 78 } });
    expect(yanit.status).toBe(200);
    const tani = await s(hemsire.token).patch(`/muayeneler/${muayeneId}`).send({ tanilar: [{ kod: 'I10', ad: 'Esansiyel hipertansiyon', tur: 'kesin', birincil: true }] });
    expect(tani.status).toBe(403);
    const aralikDisi = await s(hemsire.token).patch(`/muayeneler/${muayeneId}`).send({ vitaller: { nabiz: 400 } });
    expect(aralikDisi.status).toBe(400);
  });

  it('sekreter ve hekim olmayan kurum sahibi tıbbi kaydı göremez', async () => {
    expect((await s(sekreter).get(`/muayeneler/${muayeneId}`)).status).toBe(403);
    expect((await s(sahip).get(`/muayeneler/${muayeneId}`)).status).toBe(403);
  });

  it('tedavi ilişkisi olmayan hekim göremez; gerekçeli acil erişimle görür ve bu kayda geçer', async () => {
    const red = await s(digerHekim.token).get(`/muayeneler/${muayeneId}`);
    expect(red.status).toBe(403);
    expect(red.body.kod).toBe('TEDAVI_ILISKISI_YOK');

    expect((await s(digerHekim.token).post(`/hastalar/${hastaId}/acil-erisim`).send({ gerekce: 'konsultasyon', aciklama: 'kısa' })).status).toBe(400);
    const acil = await s(digerHekim.token).post(`/hastalar/${hastaId}/acil-erisim`).send({ gerekce: 'konsultasyon', aciklama: 'Kardiyoloji konsültasyonu istendi' });
    expect(acil.status).toBe(201);

    const kayit = await s(digerHekim.token).get(`/muayeneler/${muayeneId}`);
    expect(kayit.status).toBe(200);
    expect(kayit.body.erisimNedeni).toBe('acil');

    const iz = (await yetkili(app, sahip).get('/denetim-izi?adet=200')).body as { eylem: string; ayrinti: { erisimNedeni?: string } }[];
    expect(iz.some((k) => k.eylem === 'acil.erisim')).toBe(true);
    expect(iz.some((k) => k.eylem === 'muayene.goruntulendi' && k.ayrinti.erisimNedeni === 'acil')).toBe(true);
  });

  it('tanı ve reçeteyi yalnızca muayeneyi yapan hekim girer', async () => {
    const baskasi = await s(digerHekim.token).patch(`/muayeneler/${muayeneId}`).send({ plan: 'x' });
    expect(baskasi.status).toBe(403);
    expect(baskasi.body.kod).toBe('KAYDIN_HEKIMI_DEGIL');
  });

  it('tanı olmadan reçete girilemez; birincil tanı tek olmalı', async () => {
    const recete = { ilac: 'Amlodipin 10 mg tablet', doz: '10 mg', kullanim: '1x1 sabah', sureGun: 30, kutu: 1 };
    const tanisiz = await s(hekim.token).patch(`/muayeneler/${muayeneId}`).send({ recete: [recete] });
    expect(tanisiz.status).toBe(422);
    expect(tanisiz.body.kod).toBe('TANI_GEREKLI');

    const ikiBirincil = await s(hekim.token).patch(`/muayeneler/${muayeneId}`).send({
      tanilar: [{ kod: 'I10', ad: 'Hipertansiyon', tur: 'kesin', birincil: true }, { kod: 'R51', ad: 'Baş ağrısı', tur: 'on', birincil: true }],
    });
    expect(ikiBirincil.status).toBe(400);

    const tamam = await s(hekim.token).patch(`/muayeneler/${muayeneId}`).send({
      fizikMuayene: 'Genel durum iyi.',
      tanilar: [{ kod: 'I10', ad: 'Esansiyel (primer) hipertansiyon', tur: 'kesin', birincil: true }],
      recete: [recete],
      plan: 'Tuz kısıtlaması, 2 hafta sonra kontrol.',
    });
    expect(tamam.status).toBe(200);

    const kayit = await s(hekim.token).get(`/muayeneler/${muayeneId}`);
    expect(kayit.body).toMatchObject({
      durum: 'taslak',
      erisimNedeni: 'tedavi',
      benimKaydim: true,
      sikayet: 'Baş ağrısı',
      vitaller: { tansiyonSistolik: 148, tansiyonDiastolik: 92, nabiz: 78 },
      uyarilar: [expect.objectContaining({ tur: 'alerji', aciklama: 'Penisilin' })],
    });
  });

  it('imza parolayla yapılır; imzalı kayıt kilitlenir, randevu tamamlanır', async () => {
    await s(hekim.token).post(`/randevular/${randevuId}/durum`).send({ durum: 'muayenede' });

    expect((await s(digerHekim.token).post(`/muayeneler/${muayeneId}/imzala`).send({ parola: 'gecici-parola-123' })).status).toBe(403);
    const yanlis = await s(hekim.token).post(`/muayeneler/${muayeneId}/imzala`).send({ parola: 'yanlis' });
    expect(yanlis.status).toBe(401);
    expect(yanlis.body.kod).toBe('PAROLA_HATALI');

    const imza = await s(hekim.token).post(`/muayeneler/${muayeneId}/imzala`).send({ parola: 'gecici-parola-123' });
    expect(imza.status).toBe(201);
    expect(imza.body.icerikOzeti).toMatch(/^[0-9a-f]{64}$/);

    const takvim = await s(sekreter).get(`/randevular/takvim?tarih=${bugun}`);
    expect((takvim.body.randevular as { id: string; durum: string }[]).find((r) => r.id === randevuId)?.durum).toBe('tamamlandi');

    const degisiklik = await s(hekim.token).patch(`/muayeneler/${muayeneId}`).send({ plan: 'değişti' });
    expect(degisiklik.status).toBe(409);

    const db = new Client({ connectionString: process.env.TEST_MIGRATION_DATABASE_URL });
    await db.connect();
    try {
      await expect(db.query('UPDATE muayeneler SET plan = $1 WHERE id = $2', ['arka kapı', muayeneId])).rejects.toThrow(/değiştirilemez/);
      await expect(db.query('DELETE FROM muayeneler WHERE id = $1', [muayeneId])).rejects.toThrow(/değiştirilemez/);
    } finally {
      await db.end();
    }
  });

  it('imzadan sonra ek not eklenir', async () => {
    expect((await s(hemsire.token).post(`/muayeneler/${muayeneId}/ek-not`).send({ metin: 'Hasta ilaç kullanımı hakkında bilgilendirildi.' })).status).toBe(201);
    const kayit = await s(hekim.token).get(`/muayeneler/${muayeneId}`);
    expect(kayit.body.ekler).toEqual([expect.objectContaining({ metin: 'Hasta ilaç kullanımı hakkında bilgilendirildi.', yazan: 'Deneme hemsire' })]);
  });

  it('muayene geçmişi: hekim tedavi ilişkisiyle, mesul müdür denetim yetkisiyle görür', async () => {
    const hekimGorunumu = await s(hekim.token).get(`/hastalar/${hastaId}/muayeneler`);
    expect(hekimGorunumu.body.erisimNedeni).toBe('tedavi');
    expect(hekimGorunumu.body.muayeneler).toEqual([expect.objectContaining({ id: muayeneId, durum: 'imzali', tanilar: [expect.objectContaining({ kod: 'I10' })] })]);
    expect((await s(mesul.token).get(`/hastalar/${hastaId}/muayeneler`)).body.erisimNedeni).toBe('denetim');
  });

  it('ICD-10 kodu veya adıyla aranır', async () => {
    const adIle = await s(hekim.token).get(`/icd10?q=${encodeURIComponent('hipertansiyon')}`);
    expect(adIle.body.map((t: { kod: string }) => t.kod)).toContain('I10');
    const kodIle = await s(hekim.token).get('/icd10?q=i10');
    expect(kodIle.body[0].kod).toBe('I10');
    expect((await s(hemsire.token).get('/icd10?q=i10')).status).toBe(403);
  });

  it('başka kurum bu muayene kaydını göremez', async () => {
    const baska = await kurumKaydet(app, { meslek: 'hekim' });
    const baskaSube = ((await yetkili(app, baska.token).get('/ben')).body as { subeler: { id: string }[] }).subeler[0]!.id;
    const yanit = await request(app.getHttpServer()).get(`/api/v1/muayeneler/${muayeneId}`).set('Authorization', `Bearer ${baska.token}`).set('x-sube-id', baskaSube);
    expect(yanit.status).toBe(404);
  });
});
