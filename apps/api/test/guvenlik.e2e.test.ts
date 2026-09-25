import type { INestApplication } from '@nestjs/common';
import { sablonZamani } from '@dc/shared';
import request from 'supertest';
import { uygulamaOlustur } from '../src/main';
import { calisanEkle, kurumKaydet, TEST_AYARLARI, testUygulamasi, veritabaniniSifirla, yetkili } from './yardimci';

let app: INestApplication;

beforeAll(async () => {
  await veritabaniniSifirla();
  app = await testUygulamasi();
});

afterAll(async () => {
  await app.close();
});

/** İki şubeli kurum: A şubesine kapsamlı kullanıcı, kaydı B şubesinde olan kaynağa şube A başlığıyla erişmeye çalışır. */
describe('şube kapsamı (yetki sınırı)', () => {
  let sahip: string;
  let subeA: string;
  let subeB: string;
  const a = (token: string) => yetkili(app, token, subeA);
  const b = (token: string) => yetkili(app, token, subeB);
  const AY = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, 1)).toISOString().slice(0, 7);

  beforeAll(async () => {
    sahip = (await kurumKaydet(app, { kurumTipleri: ['tip_merkezi', 'veteriner'], meslek: 'idari' })).token;
    const subeler = ((await yetkili(app, sahip).get('/ben')).body as { subeler: { id: string }[] }).subeler;
    subeA = subeler[0]!.id;
    subeB = subeler[1]!.id;
  });

  it('A şubesinin planlayıcısı B şubesinin çizelgesine görev ekleyemez, onaya gönderemez', async () => {
    const ikA = await calisanEkle(app, sahip, sahip, 'idari', 'insan_kaynaklari', subeA);
    const ikB = await calisanEkle(app, sahip, sahip, 'idari', 'insan_kaynaklari', subeB);
    const cizelgeB = (await b(ikB.token).post('/cizelge').send({ ay: AY })).body.id as string;
    // Başlıkta kendi şubesi olsa da kayıt B'ye ait
    const ekle = await a(ikA.token).post(`/cizelge/${cizelgeB}/gorevler`).send({ kullaniciId: ikB.id, tur: 'vardiya', ...sablonZamani(`${AY}-05`, '08:00', 8) });
    expect(ekle.status).toBe(403);
    expect(ekle.body.kod).toBe('SUBE_KAPSAMI_DISI');
    expect((await a(ikA.token).post(`/cizelge/${cizelgeB}/onaya-gonder`).send({})).body.kod).toBe('SUBE_KAPSAMI_DISI');
    // Başlıkta B şubesi seçilirse zaten orada izni yoktur
    expect((await b(ikA.token).post(`/cizelge/${cizelgeB}/gorevler`).send({})).status).toBe(403);
  });

  it('başka şubede alınmış tahsilat, bu şubenin yöneticisince iade edilemez', async () => {
    const sekreter = await calisanEkle(app, sahip, sahip, 'idari', 'sekreter', null);
    const gmA = await calisanEkle(app, sahip, sahip, 'idari', 'genel_mudur', subeA);
    const hasta = await b(sekreter.token).post('/hastalar').send({ kimlik: { tur: 'kimliksiz' }, ad: 'Şube', soyad: 'Deneme', aydinlatma: { kanal: 'tablet_imza' } });
    expect(hasta.status).toBe(201);
    const tahsilat = await b(sekreter.token).post(`/hastalar/${hasta.body.id}/tahsilatlar`).send({ tutarTl: 100, odemeTuru: 'nakit' });
    expect(tahsilat.status).toBe(201);
    const iade = await a(gmA.token).post(`/tahsilatlar/${tahsilat.body.id}/iade`).send({ tutarTl: 10, neden: 'Deneme' });
    expect(iade.status).toBe(403);
    expect(iade.body.kod).toBe('SUBE_KAPSAMI_DISI');
  });

  it('A şubesinin yöneticisi B şubesine kurum belgesi ekleyemez; tüm şubelere ait belge de ekleyemez', async () => {
    const gmA = await calisanEkle(app, sahip, sahip, 'idari', 'genel_mudur', subeA);
    const ekle = (alanlar: Record<string, string>) => {
      const r = a(gmA.token).post('/belgeler');
      for (const [k, v] of Object.entries(alanlar)) r.field(k, v);
      return r;
    };
    const baska = await ekle({ kapsam: 'kurum', subeId: subeB, tur: 'ruhsat', belgeNo: 'R-1' });
    expect(baska.status).toBe(403);
    expect(baska.body.kod).toBe('SUBE_KAPSAMI_DISI');
    expect((await ekle({ kapsam: 'kurum', tur: 'ruhsat', belgeNo: 'R-2' })).body.kod).toBe('SUBE_KAPSAMI_DISI');
    expect((await ekle({ kapsam: 'kurum', subeId: subeA, tur: 'ruhsat', belgeNo: 'R-3' })).status).toBe(201);
  });

  it('şubeye kapsamlı kalite sorumlusu başka şubenin olaylarını görmez ve güncelleyemez', async () => {
    const kaliteA = await calisanEkle(app, sahip, sahip, 'idari', 'kalite_sorumlusu', subeA);
    const olay = { tur: 'dusme', siddet: 'hafif', olayZamani: new Date().toISOString(), yer: 'Bekleme salonu', aciklama: 'Hasta kaydı, yaralanma olmadı; zemin ıslaktı.' };
    const olayA = (await a(sahip).post('/olaylar').send(olay)).body.id as string;
    const olayB = (await b(sahip).post('/olaylar').send(olay)).body.id as string;
    expect(olayA).toBeDefined();
    expect(olayB).toBeDefined();
    const liste = ((await a(kaliteA.token).get('/olaylar')).body as { id: string }[]).map((o) => o.id);
    expect(liste).toContain(olayA);
    expect(liste).not.toContain(olayB);
    const guncelle = await a(kaliteA.token).patch(`/olaylar/${olayB}`).send({ durum: 'inceleniyor' });
    expect(guncelle.status).toBe(403);
    expect(guncelle.body.kod).toBe('SUBE_KAPSAMI_DISI');
  });
});

describe('saldırı önlemleri', () => {
  it('aynı e-postaya 5 hatalı girişten sonra doğru parola da 429 alır', async () => {
    const { eposta } = await kurumKaydet(app);
    const giris = (parola: string) => request(app.getHttpServer()).post('/api/v1/kimlik/giris').send({ eposta, parola });
    for (let i = 0; i < 5; i += 1) expect((await giris('yanlis-parola-000')).status).toBe(401);
    const engel = await giris('guclu-parola-123');
    expect(engel.status).toBe(429);
    expect(engel.body.kod).toBe('COK_FAZLA_DENEME');
    expect(engel.body.ayrinti?.bekleSaniye ?? engel.body.bekleSaniye).toBeGreaterThan(0);
  });

  it('başarılı giriş hatalı deneme sayacını sıfırlar', async () => {
    const { eposta } = await kurumKaydet(app);
    const giris = (parola: string) => request(app.getHttpServer()).post('/api/v1/kimlik/giris').send({ eposta, parola });
    for (let i = 0; i < 4; i += 1) await giris('yanlis-parola-000');
    expect((await giris('guclu-parola-123')).status).toBe(200);
    for (let i = 0; i < 4; i += 1) expect((await giris('yanlis-parola-000')).status).toBe(401);
    expect((await giris('guclu-parola-123')).status).toBe(200);
  });

  it('kurum kaydı IP başına sınırlıdır', async () => {
    const sinirli = await uygulamaOlustur({ ...TEST_AYARLARI, kayitSiniri: 1 });
    await sinirli.init();
    try {
      await kurumKaydet(sinirli);
      await expect(kurumKaydet(sinirli)).rejects.toThrow(/429/);
    } finally {
      await sinirli.close();
    }
  });

  it('güvenlik başlıkları gönderilir, sunucu teknolojisi gizlenir', async () => {
    const yanit = await request(app.getHttpServer()).get('/api/v1/kurum-tipleri');
    expect(yanit.headers['x-powered-by']).toBeUndefined();
    expect(yanit.headers).toMatchObject({
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
      'referrer-policy': 'no-referrer',
      'cache-control': 'no-store',
    });
    expect(yanit.headers['content-security-policy']).toContain("frame-ancestors 'none'");
  });
});
