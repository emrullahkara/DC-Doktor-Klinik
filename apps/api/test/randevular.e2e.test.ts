import type { INestApplication } from '@nestjs/common';
import { calisanEkle, kurumKaydet, testUygulamasi, veritabaniniSifirla, yetkili } from './yardimci';

let app: INestApplication;

const GUN = '2026-10-05';
const saat = (hhmm: string, gun = GUN) => `${gun}T${hhmm}:00+03:00`;

interface Kurum {
  sahip: string;
  subeId: string;
  sekreter: string;
  hekim1: { id: string; token: string };
  hekim2: { id: string; token: string };
  hemsire: { id: string; token: string };
  hastaId: string;
}

async function kurumKur(kurumTipleri = ['tip_merkezi']): Promise<Kurum> {
  const sahip = await kurumKaydet(app, { meslek: 'idari', kurumTipleri });
  const subeId = ((await yetkili(app, sahip.token).get('/ben')).body as { subeler: { id: string }[] }).subeler[0]!.id;
  const hekim1 = await calisanEkle(app, sahip.token, sahip.token, kurumTipleri.includes('veteriner') ? 'veteriner_hekim' : 'hekim', 'mesul_mudur', subeId);
  // Kurum sahibi, atadığı mesul müdüre aynı şubede hekim rolü de verir
  expect((await yetkili(app, sahip.token).post(`/kullanicilar/${hekim1.id}/roller`).send({ rolKodu: 'hekim', subeId })).status).toBe(201);
  const hekim2 = await calisanEkle(app, sahip.token, hekim1.token, 'hekim', 'hekim', subeId);
  const hemsire = await calisanEkle(app, sahip.token, hekim1.token, 'hemsire', 'hemsire', subeId);
  const sekreter = await calisanEkle(app, sahip.token, sahip.token, 'idari', 'sekreter', null);
  const hasta = await yetkili(app, sekreter.token).post('/hastalar').send({ kimlik: { tur: 'kimliksiz' }, ad: 'Deneme', soyad: 'Hasta', aydinlatma: { kanal: 'tablet_imza' } });
  return { sahip: sahip.token, subeId, sekreter: sekreter.token, hekim1, hekim2, hemsire, hastaId: hasta.body.id };
}

beforeAll(async () => {
  await veritabaniniSifirla();
  app = await testUygulamasi();
});

afterAll(async () => {
  await app.close();
});

describe('randevu', () => {
  let k: Kurum;
  let odaId: string;
  const sekreter = () => yetkili(app, k.sekreter, k.subeId);
  const randevu = (ek: Record<string, unknown>) =>
    sekreter().post('/randevular').send({ kisiId: k.hastaId, hekimId: k.hekim1.id, baslangic: saat('10:00'), sureDakika: 30, tur: 'ilk_muayene', ...ek });

  beforeAll(async () => {
    k = await kurumKur();
  });

  it('şube seçilmeden takvim açılmaz', async () => {
    const yanit = await yetkili(app, k.sekreter).get(`/randevular/takvim?tarih=${GUN}`);
    expect(yanit.status).toBe(400);
    expect(yanit.body.kod).toBe('SUBE_SECILMELI');
  });

  it('kurum sahibi şubeye oda ekler; aynı ad ikinci kez eklenemez', async () => {
    const oda = await yetkili(app, k.sahip, k.subeId).post('/kaynaklar').send({ ad: 'Oda 1', tur: 'oda' });
    expect(oda.status).toBe(201);
    odaId = oda.body.id;
    expect((await yetkili(app, k.sahip, k.subeId).post('/kaynaklar').send({ ad: 'Oda 1', tur: 'oda' })).status).toBe(409);
    expect((await sekreter().post('/kaynaklar').send({ ad: 'Oda 2', tur: 'oda' })).status).toBe(403);
  });

  it('sekreter randevu verir; takvimde yalnızca randevu alabilen personel sütun olur', async () => {
    const yanit = await randevu({ kaynakId: odaId });
    expect(yanit.status).toBe(201);
    const takvim = await sekreter().get(`/randevular/takvim?tarih=${GUN}`);
    expect(takvim.status).toBe(200);
    const hekimIdleri = (takvim.body.hekimler as { id: string }[]).map((h) => h.id);
    expect(hekimIdleri.sort()).toEqual([k.hekim1.id, k.hekim2.id].sort());
    expect(takvim.body.randevular).toEqual([
      expect.objectContaining({ hekimId: k.hekim1.id, kaynakAd: 'Oda 1', durum: 'planlandi', hasta: expect.objectContaining({ ad: 'Deneme', soyad: 'Hasta' }) }),
    ]);
  });

  it('aynı hekime veya aynı odaya çakışan randevu verilemez', async () => {
    const hekimCakisma = await randevu({ baslangic: saat('10:15') });
    expect(hekimCakisma.status).toBe(409);
    expect(hekimCakisma.body.kod).toBe('HEKIM_DOLU');

    const odaCakisma = await randevu({ hekimId: k.hekim2.id, kaynakId: odaId, baslangic: saat('10:15') });
    expect(odaCakisma.status).toBe(409);
    expect(odaCakisma.body.kod).toBe('KAYNAK_DOLU');

    expect((await randevu({ hekimId: k.hekim2.id, baslangic: saat('10:15') })).status).toBe(201);
    expect((await randevu({ baslangic: saat('10:30') })).status).toBe(201);
  });

  it('hemşireye veya başka kurumun hekimine randevu verilemez', async () => {
    const hemsire = await randevu({ hekimId: k.hemsire.id, baslangic: saat('15:00') });
    expect(hemsire.status).toBe(422);
    expect(hemsire.body.kod).toBe('HEKIM_UYGUN_DEGIL');
  });

  it('durum akışı: kabulde sıra no verilir, hekim muayeneye alır ve bitirir; adım atlanamaz', async () => {
    const takvim = await sekreter().get(`/randevular/takvim?tarih=${GUN}`);
    const [r1, r2] = (takvim.body.randevular as { id: string; hekimId: string }[]).filter((r) => r.hekimId === k.hekim1.id);

    const atlama = await sekreter().post(`/randevular/${r1!.id}/durum`).send({ durum: 'tamamlandi' });
    expect(atlama.status).toBe(422);
    expect(atlama.body.kod).toBe('GECERSIZ_DURUM_GECISI');

    const hemsireKabul = await yetkili(app, k.hemsire.token, k.subeId).post(`/randevular/${r1!.id}/durum`).send({ durum: 'geldi' });
    expect(hemsireKabul.status).toBe(403);

    expect((await sekreter().post(`/randevular/${r1!.id}/durum`).send({ durum: 'geldi' })).body.siraNo).toBe(1);
    expect((await sekreter().post(`/randevular/${r2!.id}/durum`).send({ durum: 'geldi' })).body.siraNo).toBe(2);

    const hekim = yetkili(app, k.hekim1.token, k.subeId);
    expect((await hekim.post(`/randevular/${r1!.id}/durum`).send({ durum: 'muayenede' })).status).toBe(201);
    expect((await hekim.post(`/randevular/${r1!.id}/durum`).send({ durum: 'tamamlandi' })).status).toBe(201);
    expect((await sekreter().post(`/randevular/${r1!.id}/durum`).send({ durum: 'iptal', neden: 'x' })).status).toBe(422);
  });

  it('iptal neden ister; iptal edilen randevunun saati yeniden verilebilir', async () => {
    const yeni = await randevu({ baslangic: saat('14:00') });
    expect((await sekreter().post(`/randevular/${yeni.body.id}/durum`).send({ durum: 'iptal' })).status).toBe(400);
    expect((await sekreter().post(`/randevular/${yeni.body.id}/durum`).send({ durum: 'iptal', neden: 'Hasta aradı' })).status).toBe(201);
    expect((await randevu({ baslangic: saat('14:00') })).status).toBe(201);
  });

  it('henüz gelinmemiş randevu taşınabilir; çakışmaya veya kapanmış randevuya taşıma reddedilir', async () => {
    const yeni = await randevu({ baslangic: saat('16:00') });
    expect((await sekreter().post(`/randevular/${yeni.body.id}/tasi`).send({ baslangic: saat('16:30'), sureDakika: 20 })).status).toBe(201);
    const cakisan = await sekreter().post(`/randevular/${yeni.body.id}/tasi`).send({ baslangic: saat('14:00'), sureDakika: 30 });
    expect(cakisan.status).toBe(409);

    const takvim = await sekreter().get(`/randevular/takvim?tarih=${GUN}`);
    const tamamlanan = (takvim.body.randevular as { id: string; durum: string }[]).find((r) => r.durum === 'tamamlandi')!;
    expect((await sekreter().post(`/randevular/${tamamlanan.id}/tasi`).send({ baslangic: saat('18:00'), sureDakika: 30 })).status).toBe(422);
  });

  it('gün, Türkiye saatine göre hesaplanır (gece yarısından sonraki randevu ertesi güne düşer)', async () => {
    expect((await randevu({ baslangic: '2026-10-07T00:30:00+03:00' })).status).toBe(201);
    const onceki = await sekreter().get('/randevular/takvim?tarih=2026-10-06');
    const sonraki = await sekreter().get('/randevular/takvim?tarih=2026-10-07');
    expect(onceki.body.randevular).toHaveLength(0);
    expect(sonraki.body.randevular).toHaveLength(1);
  });

  it('randevu işlemleri denetim izine yazılır', async () => {
    const iz = (await yetkili(app, k.sahip).get('/denetim-izi?adet=200')).body as { eylem: string }[];
    expect(iz.map((i) => i.eylem)).toEqual(expect.arrayContaining(['randevu.olusturuldu', 'randevu.durum', 'randevu.tasindi', 'kaynak.olusturuldu']));
  });
});

describe('veteriner randevusu', () => {
  it('veteriner şubesinde randevu hayvan için verilir', async () => {
    const k = await kurumKur(['veteriner']);
    const s = yetkili(app, k.sekreter, k.subeId);
    const hayvansiz = await s.post('/randevular').send({ kisiId: k.hastaId, hekimId: k.hekim1.id, baslangic: saat('11:00'), sureDakika: 20, tur: 'asi' });
    expect(hayvansiz.status).toBe(422);
    expect(hayvansiz.body.kod).toBe('HAYVAN_GEREKLI');

    const hayvan = await yetkili(app, k.sekreter).post(`/hastalar/${k.hastaId}/hayvanlar`).send({ ad: 'Karabaş', tur: 'kopek' });
    const yanit = await s.post('/randevular').send({ kisiId: k.hastaId, hayvanId: hayvan.body.id, hekimId: k.hekim1.id, baslangic: saat('11:00'), sureDakika: 20, tur: 'asi' });
    expect(yanit.status).toBe(201);
    const takvim = await s.get(`/randevular/takvim?tarih=${GUN}`);
    expect(takvim.body.randevular[0].hayvan).toMatchObject({ ad: 'Karabaş', tur: 'kopek' });
  });
});
