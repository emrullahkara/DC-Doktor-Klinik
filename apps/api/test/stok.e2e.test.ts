import type { INestApplication } from '@nestjs/common';
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

describe('stok ve ilaç', () => {
  let sahip: string;
  let subeId: string;
  let mesul: { id: string; token: string };
  let depo: { id: string; token: string };
  let hemsire: { id: string; token: string };
  let bashemsire: { id: string; token: string };
  let sekreter: string;
  let hastaId: string;
  let urunId: string;
  let morfinId: string;
  const s = (token: string) => yetkili(app, token, subeId);

  beforeAll(async () => {
    sahip = (await kurumKaydet(app, { meslek: 'idari' })).token;
    subeId = ((await yetkili(app, sahip).get('/ben')).body as { subeler: { id: string }[] }).subeler[0]!.id;
    mesul = await calisanEkle(app, sahip, sahip, 'hekim', 'mesul_mudur', subeId);
    depo = await calisanEkle(app, sahip, sahip, 'idari', 'depo', null);
    hemsire = await calisanEkle(app, sahip, mesul.token, 'hemsire', 'hemsire', subeId);
    bashemsire = await calisanEkle(app, sahip, mesul.token, 'hemsire', 'bashemsire', subeId);
    sekreter = (await calisanEkle(app, sahip, sahip, 'idari', 'sekreter', null)).token;
    hastaId = (await yetkili(app, sekreter).post('/hastalar').send({ kimlik: { tur: 'kimliksiz' }, ad: 'Leyla', soyad: 'Aydın', aydinlatma: { kanal: 'tablet_imza' } })).body.id;
  });

  it('ürün kartı: yalnızca stok yöneticisi ekler; kod tekildir', async () => {
    expect((await s(hemsire.token).post('/urunler').send({ kod: 'PAR', ad: 'Parol 500 mg', tip: 'ilac', birim: 'tablet' })).status).toBe(403);
    const u = await s(depo.token).post('/urunler').send({ kod: 'dklo-75', ad: 'Diklofenak 75 mg ampul', tip: 'ilac', birim: 'ampul', minSeviye: 10 });
    expect(u.status).toBe(201);
    urunId = u.body.id;
    expect((await s(depo.token).post('/urunler').send({ kod: 'DKLO-75', ad: 'Tekrar', tip: 'ilac', birim: 'ampul' })).body.kod).toBe('URUN_KODU_KULLANIMDA');
    morfinId = (await s(depo.token).post('/urunler').send({ kod: 'MRF-10', ad: 'Morfin 10 mg ampul', tip: 'ilac', birim: 'ampul', kontrol: 'narkotik' })).body.id;
  });

  it('giriş: ilaçta SKT zorunlu; bakiye lot bazında; FEFO önerisi', async () => {
    const h = (govde: object) => s(depo.token).post(`/urunler/${urunId}/hareketler`).send(govde);
    expect((await h({ tur: 'giris', lot: 'L1', miktar: 20 })).status).toBe(400);
    expect((await h({ tur: 'giris', lot: 'L1', skt: gunSonra(200), miktar: 20 })).status).toBe(201);
    expect((await h({ tur: 'giris', lot: 'L2', skt: gunSonra(20), miktar: 5 })).status).toBe(201);
    expect((await h({ tur: 'giris', lot: 'ESKI', skt: gunSonra(-3), miktar: 2 })).status).toBe(201);
    expect((await h({ tur: 'giris', lot: 'L1', skt: gunSonra(100), miktar: 1 })).body.kod).toBe('LOT_SKT_FARKLI');

    const kart = (await s(hemsire.token).get(`/urunler/${urunId}`)).body;
    expect(kart.fefo).toBe('L2');
    expect(kart.lotlar.map((l: { lot: string; bakiye: number }) => [l.lot, l.bakiye])).toEqual([['ESKI', 2], ['L2', 5], ['L1', 20]]);
    const liste = (await s(depo.token).get('/urunler')).body.find((u: { id: string }) => u.id === urunId);
    expect(liste).toMatchObject({ bakiye: 27, lotSayisi: 3 });
  });

  it('hemşire hastaya kullanım kaydeder; bakiye yetmezse ve SKT geçmişse reddedilir', async () => {
    const h = (govde: object) => s(hemsire.token).post(`/urunler/${urunId}/hareketler`).send(govde);
    const k = await h({ tur: 'kullanim', lot: 'L2', miktar: 1, kisiId: hastaId });
    expect(k.status).toBe(201);
    expect(k.body.bakiye).toBe(4);
    expect((await h({ tur: 'kullanim', lot: 'L2', miktar: 10, kisiId: hastaId })).body.kod).toBe('STOK_YETERSIZ');
    expect((await h({ tur: 'kullanim', lot: 'ESKI', miktar: 1, kisiId: hastaId })).body.kod).toBe('SKT_GECMIS');
    expect((await h({ tur: 'fire', lot: 'ESKI', miktar: 2, aciklama: 'SKT geçti' })).status).toBe(403);
    expect((await s(depo.token).post(`/urunler/${urunId}/hareketler`).send({ tur: 'fire', lot: 'ESKI', miktar: 2, aciklama: 'SKT geçti, imha' })).status).toBe(201);
    expect((await s(sekreter).post(`/urunler/${urunId}/hareketler`).send({ tur: 'kullanim', lot: 'L2', miktar: 1, kisiId: hastaId })).status).toBe(403);
  });

  it('sayım farkı düzeltme hareketi olarak yazılır', async () => {
    const say = await s(depo.token).post(`/urunler/${urunId}/hareketler`).send({ tur: 'sayim', lot: 'L1', sayilan: 18, aciklama: 'Aylık sayım' });
    expect(say.body).toMatchObject({ fark: -2, bakiye: 18 });
    expect((await s(depo.token).post(`/urunler/${urunId}/hareketler`).send({ tur: 'sayim', lot: 'L1', sayilan: 18, aciklama: 'Tekrar' })).body).toEqual({ fark: 0 });
  });

  it('narkotik: yalnızca narkotik sorumlusu; çıkışta farklı sağlık meslek mensubu şahit zorunlu', async () => {
    const h = (token: string, govde: object) => s(token).post(`/urunler/${morfinId}/hareketler`).send(govde);
    expect((await h(depo.token, { tur: 'giris', lot: 'M1', skt: gunSonra(300), miktar: 10 })).body.kod).toBe('NARKOTIK_YETKI');
    expect((await h(bashemsire.token, { tur: 'giris', lot: 'M1', skt: gunSonra(300), miktar: 10 })).status).toBe(201);
    expect((await h(hemsire.token, { tur: 'kullanim', lot: 'M1', miktar: 1, kisiId: hastaId, sahitId: bashemsire.id })).body.kod).toBe('NARKOTIK_YETKI');

    const kullan = (sahitId?: string) => h(bashemsire.token, { tur: 'kullanim', lot: 'M1', miktar: 1, kisiId: hastaId, ...(sahitId ? { sahitId } : {}) });
    expect((await kullan()).body.kod).toBe('SAHIT_GEREKLI');
    expect((await kullan(bashemsire.id)).body.kod).toBe('SAHIT_UYGUN_DEGIL');
    expect((await kullan(depo.id)).body.kod).toBe('SAHIT_UYGUN_DEGIL');
    expect((await kullan(hemsire.id)).status).toBe(201);
  });

  it('narkotik sayım farkı mesul müdüre ve komuta yetkilisine kritik alarm', async () => {
    const say = await s(bashemsire.token).post(`/urunler/${morfinId}/hareketler`).send({ tur: 'sayim', lot: 'M1', sayilan: 8, sahitId: hemsire.id, aciklama: 'Vardiya devri sayımı' });
    expect(say.body.fark).toBe(-1);
    const bul = (l: { tur: string; seviye: string }[]) => l.find((a) => a.tur === 'narkotik_fark');
    expect(bul((await s(mesul.token).get('/alarmlar')).body)?.seviye).toBe('kritik');
    expect(bul((await s(sahip).get('/alarmlar')).body)).toBeDefined();
    expect(bul((await s(depo.token).get('/alarmlar')).body)).toBeUndefined();
  });

  it('lot izleme (geri çağırma) hangi hastaya uygulandığını gösterir ve kayda geçer', async () => {
    expect((await s(hemsire.token).get(`/urunler/${urunId}/lot-izleme?lot=L2`)).status).toBe(403);
    const iz = await s(sahip).get(`/urunler/${urunId}/lot-izleme?lot=L2`);
    expect(iz.status).toBe(200);
    expect(iz.body.kullanimlar).toHaveLength(1);
    expect(iz.body.kullanimlar[0]).toMatchObject({ ad: 'Leyla', soyad: 'Aydın', miktar: 1 });
    const denetim = (await yetkili(app, sahip).get('/denetim-izi')).body as { eylem: string }[];
    expect(denetim.some((k) => k.eylem === 'lot.izleme')).toBe(true);
  });

  it('alarm: SKT yaklaşan lot ve kritik seviye stok sorumlusuna', async () => {
    const alarmlar = (await s(depo.token).get('/alarmlar')).body as { tur: string; seviye: string; ek?: { lot?: string } }[];
    expect(alarmlar.find((a) => a.tur === 'skt' && a.ek?.lot === 'L2')?.seviye).toBe('ciddi');
    // Toplam 22 ampul ≥ 10: kritik seviye yok
    expect(alarmlar.some((a) => a.tur === 'kritik_stok')).toBe(false);
    await s(depo.token).patch(`/urunler/${urunId}`).send({ minSeviye: 50 });
    const sonra = (await s(depo.token).get('/alarmlar')).body as { tur: string; seviye: string }[];
    expect(sonra.find((a) => a.tur === 'kritik_stok')?.seviye).toBe('ciddi');
    expect(((await s(sekreter).get('/alarmlar')).body as { kapsam: string }[]).some((a) => a.kapsam === 'stok')).toBe(false);
  });
});
