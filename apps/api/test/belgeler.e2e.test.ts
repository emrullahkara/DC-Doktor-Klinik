import type { INestApplication } from '@nestjs/common';
import { Client } from 'pg';
import { calisanEkle, kurumKaydet, testUygulamasi, veritabaniniSifirla, yetkili } from './yardimci';

let app: INestApplication;

const gunSonra = (n: number) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.now() + n * 86_400_000));

const PDF = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.from('deneme belge içeriği')]);

beforeAll(async () => {
  await veritabaniniSifirla();
  app = await testUygulamasi();
});

afterAll(async () => {
  await app.close();
});

describe('personel ve kurum belgeleri', () => {
  let sahip: string;
  let subeId: string;
  let mesul: { id: string; token: string };
  let hekim: { id: string; token: string };
  let digerHekim: { id: string; token: string };
  let sekreter: string;
  let diplomaId: string;
  const s = (token: string) => yetkili(app, token, subeId);

  beforeAll(async () => {
    sahip = (await kurumKaydet(app, { meslek: 'idari' })).token;
    subeId = ((await yetkili(app, sahip).get('/ben')).body as { subeler: { id: string }[] }).subeler[0]!.id;
    mesul = await calisanEkle(app, sahip, sahip, 'hekim', 'mesul_mudur', subeId);
    hekim = await calisanEkle(app, sahip, mesul.token, 'hekim', 'hekim', subeId);
    digerHekim = await calisanEkle(app, sahip, mesul.token, 'hekim', 'hekim', subeId);
    sekreter = (await calisanEkle(app, sahip, sahip, 'idari', 'sekreter', null)).token;
  });

  const belgeEkle = (token: string, alanlar: Record<string, string>, dosya?: { icerik: Buffer; ad: string; tur: string }) => {
    const r = s(token).post('/belgeler');
    for (const [k, v] of Object.entries(alanlar)) r.field(k, v);
    if (dosya) r.attach('dosya', dosya.icerik, { filename: dosya.ad, contentType: dosya.tur });
    return r;
  };

  it('personel yöneticisi dosyalı belge ekler; dosya türü imzadan doğrulanır', async () => {
    const yanit = await belgeEkle(sahip, { kapsam: 'personel', kullaniciId: hekim.id, tur: 'diploma_tescil', belgeNo: 'D-123' }, { icerik: PDF, ad: 'diploma.pdf', tur: 'application/pdf' });
    expect(yanit.status).toBe(201);
    expect(yanit.body.dosya).toMatchObject({ ad: 'diploma.pdf', icerikTuru: 'application/pdf', boyut: PDF.length });
    expect(yanit.body.durum).toBe('suresiz');
    diplomaId = yanit.body.id;

    const sahte = await belgeEkle(sahip, { kapsam: 'personel', kullaniciId: hekim.id, tur: 'uzmanlik_belgesi' }, { icerik: Buffer.from('<script>alert(1)</script>'), ad: 'x.pdf', tur: 'application/pdf' });
    expect(sahte.status).toBe(415);
    expect(sahte.body.kod).toBe('DOSYA_TURU');
  });

  it('süreli belgede bitiş zorunlu; tür kapsama uygun olmalı; yetkisiz ekleyemez', async () => {
    const bitissiz = await belgeEkle(sahip, { kapsam: 'personel', kullaniciId: hekim.id, tur: 'oda_kaydi' });
    expect(bitissiz.status).toBe(400);
    expect(bitissiz.body.ayrinti).toEqual([{ alan: 'bitis', mesaj: 'Bu belge için bitiş tarihi zorunlu.' }]);
    expect((await belgeEkle(sahip, { kapsam: 'personel', kullaniciId: hekim.id, tur: 'ruhsat' })).status).toBe(400);
    expect((await belgeEkle(sekreter, { kapsam: 'personel', kullaniciId: hekim.id, tur: 'diploma_tescil' })).status).toBe(403);
    expect((await belgeEkle(sahip, { kapsam: 'personel', tur: 'diploma_tescil' })).status).toBe(400);
  });

  it('kişi kendi kartını görür; başkası personel izni olmadan göremez; görüntüleme kayda geçer', async () => {
    const kendi = await s(hekim.token).get(`/personel/${hekim.id}`);
    expect(kendi.status).toBe(200);
    expect(kendi.body.eksikler).toEqual(expect.arrayContaining(['malpraktis_sigortasi', 'calisma_belgesi', 'oda_kaydi']));
    expect(kendi.body.eksikler).not.toContain('diploma_tescil');
    expect((await s(digerHekim.token).get(`/personel/${hekim.id}`)).status).toBe(403);
    expect((await s(sekreter).get(`/personel/${hekim.id}`)).status).toBe(403);

    expect((await s(sahip).get(`/personel/${hekim.id}`)).status).toBe(200);
    const iz = await yetkili(app, sahip).get('/denetim-izi');
    expect(iz.body.some((k: { eylem: string; varlikId: string }) => k.eylem === 'personel.goruntulendi' && k.varlikId === hekim.id)).toBe(true);
  });

  it('dosya yalnızca yetkiliye, şifresi çözülmüş ve bütün olarak iner', async () => {
    const indir = await s(hekim.token).get(`/belgeler/${diplomaId}/dosya`).buffer(true).parse((r, cb) => {
      const parcalar: Buffer[] = [];
      r.on('data', (p: Buffer) => parcalar.push(p));
      r.on('end', () => cb(null, Buffer.concat(parcalar)));
    });
    expect(indir.status).toBe(200);
    expect(indir.headers['content-type']).toBe('application/pdf');
    expect(indir.headers['x-content-type-options']).toBe('nosniff');
    expect(Buffer.compare(indir.body as Buffer, PDF)).toBe(0);
    expect((await s(digerHekim.token).get(`/belgeler/${diplomaId}/dosya`)).status).toBe(403);

    const baska = (await kurumKaydet(app)).token;
    expect((await yetkili(app, baska).get(`/belgeler/${diplomaId}/dosya`)).status).toBe(404);

    // Veritabanında içerik şifreli durur
    const db = new Client({ connectionString: process.env.TEST_MIGRATION_DATABASE_URL });
    await db.connect();
    const { rows } = await db.query('SELECT d.sifreli FROM dosyalar d JOIN belgeler b ON b.dosya_id = d.id WHERE b.id = $1', [diplomaId]);
    await db.end();
    expect((rows[0].sifreli as Buffer).includes(Buffer.from('deneme belge'))).toBe(false);
  });

  it('malpraktis sigortası dolunca hekimin klinik işlemleri askıya alınır; yenilenince açılır', async () => {
    expect((await s(hekim.token).get('/icd10?q=hiper')).status).toBe(200);

    const dolmus = await belgeEkle(sahip, { kapsam: 'personel', kullaniciId: hekim.id, tur: 'malpraktis_sigortasi', bitis: gunSonra(-1) });
    expect(dolmus.status).toBe(201);
    expect(dolmus.body.durum).toBe('dolmus');

    const engel = await s(hekim.token).get('/icd10?q=hiper');
    expect(engel.status).toBe(403);
    expect(engel.body.kod).toBe('BELGE_SURESI_DOLDU');
    expect(engel.body.ayrinti.belge).toBe('malpraktis_sigortasi');

    const ben = (await s(hekim.token).get('/ben')).body;
    expect(ben.izinler).not.toContain('tani.koy');
    expect(ben.izinler).toContain('tibbi.kayit.goruntule');
    expect(ben.askidakiIzinler.map((a: { izin: string }) => a.izin)).toContain('recete.yaz');

    const yenilenen = await belgeEkle(sahip, { kapsam: 'personel', kullaniciId: hekim.id, tur: 'malpraktis_sigortasi', bitis: gunSonra(365) });
    expect(yenilenen.status).toBe(201);
    expect((await s(hekim.token).get('/icd10?q=hiper')).status).toBe(200);
  });

  it('alarm eskalasyonu: kişinin kendisi ve personel yönetimi görür, başka hekim görmez', async () => {
    await belgeEkle(sahip, { kapsam: 'personel', kullaniciId: hekim.id, tur: 'oda_kaydi', bitis: gunSonra(20) });
    const bul = (liste: { tur: string; kullaniciId: string | null; seviye: string }[]) => liste.find((a) => a.tur === 'oda_kaydi' && a.kullaniciId === hekim.id);

    expect(bul((await s(hekim.token).get('/alarmlar')).body)?.seviye).toBe('ciddi');
    expect(bul((await s(sahip).get('/alarmlar')).body)?.seviye).toBe('ciddi');
    expect(bul((await s(mesul.token).get('/alarmlar')).body)).toBeDefined();
    expect(bul((await s(digerHekim.token).get('/alarmlar')).body)).toBeUndefined();
    // Başka hekim kendi eksiklerini görür
    const kendi = (await s(digerHekim.token).get('/alarmlar')).body as { kullaniciId: string; seviye: string }[];
    expect(kendi.length).toBeGreaterThan(0);
    expect(kendi.every((a) => a.kullaniciId === digerHekim.id)).toBe(true);
  });

  it('kurum belgeleri: şube türüne göre eksikler; süre alarmı kurum yöneticisine', async () => {
    const once = (await s(sahip).get('/kurum-belgeleri')).body;
    expect(once.subeler[0].eksikler).toEqual(expect.arrayContaining(['ruhsat', 'mesul_mudur_belgesi', 'tibbi_atik_sozlesmesi']));

    const ruhsat = await belgeEkle(sahip, { kapsam: 'kurum', subeId, tur: 'ruhsat', belgeNo: 'R-2024-01' }, { icerik: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2]), ad: 'ruhsat.png', tur: 'image/png' });
    expect(ruhsat.status).toBe(201);
    await belgeEkle(sahip, { kapsam: 'kurum', tur: 'tibbi_atik_sozlesmesi', bitis: gunSonra(100) });

    const sonra = (await s(sahip).get('/kurum-belgeleri')).body;
    expect(sonra.subeler[0].eksikler).toEqual(['mesul_mudur_belgesi']);
    expect(sonra.isletmeGeneli).toHaveLength(1);

    const atik = (l: { tur: string }[]) => l.find((a) => a.tur === 'tibbi_atik_sozlesmesi');
    expect(atik((await s(sahip).get('/alarmlar')).body)).toMatchObject({ seviye: 'uyari', kalanGun: 100 });
    expect(atik((await s(hekim.token).get('/alarmlar')).body)).toBeUndefined();
    expect((await belgeEkle(hekim.token, { kapsam: 'kurum', subeId, tur: 'ndk_lisansi', bitis: gunSonra(10) })).status).toBe(403);
  });

  it('belge gerekçeyle kaldırılır, içeriği değiştirilemez', async () => {
    expect((await s(sekreter).post(`/belgeler/${diplomaId}/kaldir`).send({ neden: 'Yanlış kişi' })).status).toBe(403);
    expect((await s(sahip).post(`/belgeler/${diplomaId}/kaldir`).send({ neden: 'Yanlış dosya yüklendi' })).status).toBe(201);
    expect((await s(sahip).post(`/belgeler/${diplomaId}/kaldir`).send({ neden: 'Tekrar' })).status).toBe(409);
    const kart = (await s(sahip).get(`/personel/${hekim.id}`)).body;
    expect(kart.eksikler).toContain('diploma_tescil');
    expect(kart.belgeler.find((b: { id: string }) => b.id === diplomaId).kaldirmaNedeni).toBe('Yanlış dosya yüklendi');

    const db = new Client({ connectionString: process.env.TEST_MIGRATION_DATABASE_URL });
    await db.connect();
    await expect(db.query("UPDATE belgeler SET belge_no = 'X' WHERE id = $1", [diplomaId])).rejects.toThrow('değiştirilemez');
    await db.end();
  });

  it('personel listesi ve özlük bilgisi', async () => {
    expect((await s(hekim.token).patch(`/personel/${hekim.id}`).send({ calismaSekli: 'serbest' })).status).toBe(403);
    const g = await s(sahip).patch(`/personel/${hekim.id}`).send({ unvanBrans: 'Uzm. Dr. — Dahiliye', calismaSekli: 'serbest', iseGiris: '2024-03-01', telefon: '5321234567' });
    expect(g.status).toBe(200);
    const liste = (await s(sahip).get('/personel')).body as { id: string; unvanBrans: string; eksikSayisi: number; ciddi: number; roller: string[] }[];
    const h = liste.find((k) => k.id === hekim.id)!;
    expect(h).toMatchObject({ unvanBrans: 'Uzm. Dr. — Dahiliye', ciddi: 1 });
    expect(h.eksikSayisi).toBeGreaterThan(0);
    expect((await s(sekreter).get('/personel')).status).toBe(403);
    expect((await s(hekim.token).get(`/personel/${hekim.id}`)).body.bilgi.telefon).toBe('05321234567');
  });
});
