import type { INestApplication } from '@nestjs/common';
import { sablonZamani } from '@dc/shared';
import { calisanEkle, kurumKaydet, testUygulamasi, veritabaniniSifirla, yetkili } from './yardimci';

let app: INestApplication;

/** Gelecek ay (Türkiye saatiyle), YYYY-AA */
const bugun = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const [yil, ayNo] = bugun.split('-').map(Number) as [number, number];
const AY = new Date(Date.UTC(yil, ayNo, 1)).toISOString().slice(0, 7);
const gun = (n: number) => `${AY}-${String(n).padStart(2, '0')}`;

beforeAll(async () => {
  await veritabaniniSifirla();
  app = await testUygulamasi();
});

afterAll(async () => {
  await app.close();
});

describe('nöbet ve vardiya çizelgesi', () => {
  let sahip: string;
  let subeId: string;
  let mesul: { id: string; token: string };
  let bashemsire: { id: string; token: string };
  let hemsire: { id: string; token: string };
  let hekim: { id: string; token: string };
  let gm: { id: string; token: string };
  let cizelgeId: string;
  const s = (token: string) => yetkili(app, token, subeId);
  const gorev = (kullaniciId: string, tur: string, g: string, saat: string, sure: number) => ({ kullaniciId, tur, ...sablonZamani(g, saat, sure) });

  beforeAll(async () => {
    sahip = (await kurumKaydet(app, { meslek: 'idari' })).token;
    subeId = ((await yetkili(app, sahip).get('/ben')).body as { subeler: { id: string }[] }).subeler[0]!.id;
    mesul = await calisanEkle(app, sahip, sahip, 'hekim', 'mesul_mudur', subeId);
    bashemsire = await calisanEkle(app, sahip, mesul.token, 'hemsire', 'bashemsire', subeId);
    hemsire = await calisanEkle(app, sahip, mesul.token, 'hemsire', 'hemsire', subeId);
    hekim = await calisanEkle(app, sahip, mesul.token, 'hekim', 'hekim', subeId);
    gm = await calisanEkle(app, sahip, sahip, 'idari', 'genel_mudur', null);
  });

  it('şube seçilmeden çizelge açılmaz; yetkisiz oluşturamaz; ikinci istek aynı çizelgeyi döndürür', async () => {
    expect((await yetkili(app, gm.token).post('/cizelge').send({ ay: AY })).body.kod).toBe('SUBE_SECILMELI');
    expect((await s(hemsire.token).post('/cizelge').send({ ay: AY })).status).toBe(403);
    const ilk = await s(bashemsire.token).post('/cizelge').send({ ay: AY });
    expect(ilk.status).toBe(201);
    cizelgeId = ilk.body.id;
    expect((await s(bashemsire.token).post('/cizelge').send({ ay: AY })).body).toEqual({ id: cizelgeId, yeni: false });
  });

  it('görev eklenir; çakışan görev reddedilir; şube dışı kişi ve ay dışı gün reddedilir', async () => {
    const ek = await s(bashemsire.token).post(`/cizelge/${cizelgeId}/gorevler`).send(gorev(hemsire.id, 'vardiya', gun(5), '08:00', 8));
    expect(ek.status).toBe(201);
    expect(ek.body.ihlaller).toEqual([]);
    const cakisan = await s(bashemsire.token).post(`/cizelge/${cizelgeId}/gorevler`).send(gorev(hemsire.id, 'nobet', gun(5), '12:00', 16));
    expect(cakisan.status).toBe(409);
    expect(cakisan.body.kod).toBe('GOREV_CAKISMASI');
    expect((await s(bashemsire.token).post(`/cizelge/${cizelgeId}/gorevler`).send(gorev(hemsire.id, 'vardiya', bugun, '08:00', 8))).body.kod).toBe('AY_DISI');

    const baskaKurum = (await kurumKaydet(app)).token;
    const yabanci = ((await yetkili(app, baskaKurum).get('/ben')).body as { kullanici: { id: string } }).kullanici.id;
    expect((await s(bashemsire.token).post(`/cizelge/${cizelgeId}/gorevler`).send(gorev(yabanci, 'vardiya', gun(6), '08:00', 8))).status).toBe(422);
  });

  it('izinli güne görev verilemez; görevi olan güne izin girilemez', async () => {
    expect((await s(sahip).post(`/personel/${hemsire.id}/izinler`).send({ tur: 'yillik', baslangic: gun(5), bitis: gun(6) })).body.kod).toBe('IZIN_GOREV_CAKISMASI');
    expect((await s(sahip).post(`/personel/${hemsire.id}/izinler`).send({ tur: 'yillik', baslangic: gun(20), bitis: gun(22) })).status).toBe(201);
    const izinli = await s(bashemsire.token).post(`/cizelge/${cizelgeId}/gorevler`).send(gorev(hemsire.id, 'nobet', gun(21), '08:00', 24));
    expect(izinli.status).toBe(409);
    expect(izinli.body.kod).toBe('IZINLI');
    expect((await s(hemsire.token).get(`/personel/${hemsire.id}/izinler`)).body).toHaveLength(1);
    expect((await s(hekim.token).get(`/personel/${hemsire.id}/izinler`)).status).toBe(403);
  });

  it('nöbet sonrası dinlenme ihlali raporlanır; görev silinebilir', async () => {
    await s(bashemsire.token).post(`/cizelge/${cizelgeId}/gorevler`).send(gorev(hekim.id, 'nobet', gun(10), '08:00', 24));
    const erken = await s(bashemsire.token).post(`/cizelge/${cizelgeId}/gorevler`).send(gorev(hekim.id, 'vardiya', gun(11), '16:00', 8));
    expect(erken.body.ihlaller.map((i: { kural: string }) => i.kural)).toEqual(['dinlenme']);
    const c = (await s(bashemsire.token).get(`/cizelge?ay=${AY}`)).body;
    expect(c.ihlaller).toHaveLength(1);
    expect(c.personel.map((p: { id: string }) => p.id)).toEqual(expect.arrayContaining([hemsire.id, hekim.id, mesul.id]));
    expect(c.izinler).toHaveLength(1);
  });

  it('taslak çizelge personele görünmez; yayındaki görünür', async () => {
    const taslak = (await s(hemsire.token).get(`/cizelge?ay=${AY}`)).body;
    expect(taslak.cizelge.durum).toBe('taslak');
    expect(taslak.gorevler).toEqual([]);
  });

  it('dört göz: gönderen onaylayamaz; ihlalde gerekçe zorunlu; yayında çizelge kilitli', async () => {
    expect((await s(bashemsire.token).post(`/cizelge/${cizelgeId}/onaya-gonder`)).body.ihlalSayisi).toBe(1);
    expect((await s(bashemsire.token).post(`/cizelge/${cizelgeId}/gorevler`).send(gorev(hemsire.id, 'vardiya', gun(7), '08:00', 8))).body.kod).toBe('CIZELGE_KILITLI');

    // Başhemşirenin onay izni yok; genel onaylayıcı (mesul) kendi göndermediği için onaylayabilir
    expect((await s(bashemsire.token).post(`/cizelge/${cizelgeId}/karar`).send({ onay: true })).status).toBe(403);
    const gerekcesiz = await s(mesul.token).post(`/cizelge/${cizelgeId}/karar`).send({ onay: true });
    expect(gerekcesiz.status).toBe(422);
    expect(gerekcesiz.body.kod).toBe('IHLAL_GEREKCESI');

    const red = await s(mesul.token).post(`/cizelge/${cizelgeId}/karar`).send({ onay: false, redNedeni: 'Dinlenme süresini düzeltin' });
    expect(red.body.durum).toBe('taslak');
    const c = (await s(bashemsire.token).get(`/cizelge?ay=${AY}`)).body;
    expect(c.cizelge.redNedeni).toBe('Dinlenme süresini düzeltin');
    const erken = c.gorevler.find((g: { kullaniciId: string; tur: string }) => g.kullaniciId === hekim.id && g.tur === 'vardiya');
    expect((await s(bashemsire.token).post(`/gorevler/${erken.id}/sil`)).status).toBe(201);

    await s(bashemsire.token).post(`/cizelge/${cizelgeId}/onaya-gonder`);
    expect((await s(mesul.token).post(`/cizelge/${cizelgeId}/karar`).send({ onay: true })).body.durum).toBe('yayinda');

    const yayinda = (await s(hemsire.token).get(`/cizelge?ay=${AY}`)).body;
    expect(yayinda.cizelge).toMatchObject({ durum: 'yayinda', onaylayan: 'Deneme mesul_mudur' });
    expect(yayinda.gorevler.length).toBe(2);
    expect(yayinda.ihlaller).toEqual([]);
  });

  it('planlama ve onay izni olan genel müdür kendi gönderdiği çizelgeyi onaylayamaz', async () => {
    // Mesul müdürün planlama izni yok; genel müdür gibi iki izne sahip biri için kural serviste
    await s(bashemsire.token).post(`/cizelge/${cizelgeId}/revizyon`);
    await s(bashemsire.token).post(`/cizelge/${cizelgeId}/onaya-gonder`);
    // GM onaylar (göndermedi) → yayında; sonra GM revizyon + gönderir ve kendisi onaylamaya çalışır
    expect((await s(gm.token).post(`/cizelge/${cizelgeId}/karar`).send({ onay: true })).body.durum).toBe('yayinda');
    await s(gm.token).post(`/cizelge/${cizelgeId}/revizyon`);
    await s(gm.token).post(`/cizelge/${cizelgeId}/onaya-gonder`);
    const kendi = await s(gm.token).post(`/cizelge/${cizelgeId}/karar`).send({ onay: true });
    expect(kendi.status).toBe(403);
    expect(kendi.body.kod).toBe('KENDI_CIZELGESI');
    expect((await s(mesul.token).post(`/cizelge/${cizelgeId}/karar`).send({ onay: true })).body.durum).toBe('yayinda');
  });

  it('görevlerim yalnızca yayındaki kendi görevlerini gösterir; ayarlar yetkiyle değişir', async () => {
    const benim = (await s(hemsire.token).get('/gorevlerim')).body as { tur: string }[];
    expect(benim.every((g) => ['vardiya', 'nobet', 'icap'].includes(g.tur))).toBe(true);
    expect((await s(hemsire.token).patch('/nobet/ayarlar').send({ haftalikAzamiSaat: 40, nobetSonrasiDinlenmeSaat: 24, ardisikGeceAzami: 2 })).status).toBe(403);
    expect((await s(sahip).patch('/nobet/ayarlar').send({ haftalikAzamiSaat: 40, nobetSonrasiDinlenmeSaat: 24, ardisikGeceAzami: 2 })).status).toBe(200);
    expect((await s(hemsire.token).get('/nobet/ayarlar')).body.haftalikAzamiSaat).toBe(40);
  });

  it('onay bekleyen çizelge onaylayana alarm üretir', async () => {
    await s(bashemsire.token).post(`/cizelge/${cizelgeId}/revizyon`);
    await s(bashemsire.token).post(`/cizelge/${cizelgeId}/onaya-gonder`);
    const bul = (l: { tur: string }[]) => l.find((a) => a.tur === 'cizelge_onay');
    expect(bul((await s(mesul.token).get('/alarmlar')).body)).toBeDefined();
    expect(bul((await s(hemsire.token).get('/alarmlar')).body)).toBeUndefined();
  });
});
