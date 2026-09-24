import type { INestApplication } from '@nestjs/common';
import { calisanEkle, kurumKaydet, testUygulamasi, veritabaniniSifirla, yetkili } from './yardimci';

let app: INestApplication;

beforeAll(async () => {
  await veritabaniniSifirla();
  app = await testUygulamasi();
});

afterAll(async () => {
  await app.close();
});

describe('finans', () => {
  let sahip: string;
  let subeId: string;
  let gm: { id: string; token: string };
  let sekreter: { id: string; token: string };
  let hastaId: string;
  let muayeneHizmeti: string;
  let sekreterNakit: string;
  const s = (token: string) => yetkili(app, token, subeId);

  beforeAll(async () => {
    const kayit = await kurumKaydet(app, { meslek: 'idari' });
    sahip = kayit.token;
    subeId = ((await yetkili(app, sahip).get('/ben')).body as { subeler: { id: string }[] }).subeler[0]!.id;
    gm = await calisanEkle(app, sahip, sahip, 'idari', 'genel_mudur', null);
    sekreter = await calisanEkle(app, sahip, sahip, 'idari', 'sekreter', null);
    const hasta = await yetkili(app, sekreter.token).post('/hastalar').send({ kimlik: { tur: 'kimliksiz' }, ad: 'Ödeme', soyad: 'Deneme', aydinlatma: { kanal: 'tablet_imza' } });
    hastaId = hasta.body.id;
  });

  describe('hizmet ve fiyat onayı', () => {
    it('genel müdürün eklediği hizmet, kurum sahibi onaylayana kadar kullanılamaz', async () => {
      const hizmet = await s(gm.token).post('/hizmetler').send({ kod: 'MUA-01', ad: 'Dahiliye muayenesi', kategori: 'muayene', kdvOrani: 10, fiyatTl: 1500 });
      expect(hizmet.status).toBe(201);
      expect(hizmet.body).toMatchObject({ aktif: false, onayBekliyor: true });
      muayeneHizmeti = hizmet.body.id;

      const kalem = await s(sekreter.token).post(`/hastalar/${hastaId}/hesap/kalemler`).send({ hizmetId: muayeneHizmeti });
      expect(kalem.status).toBe(422);
      expect(kalem.body.kod).toBe('HIZMET_ONAYSIZ');

      expect((await s(gm.token).get('/fiyat-talepleri')).body).toHaveLength(1);
      const talepId = (await s(sahip).get('/fiyat-talepleri')).body[0].id;
      expect((await s(gm.token).post(`/fiyat-talepleri/${talepId}/karar`).send({ onay: true })).status).toBe(403);
      expect((await s(sahip).post(`/fiyat-talepleri/${talepId}/karar`).send({ onay: true })).status).toBe(201);
      const liste = (await s(sekreter.token).get('/hizmetler')).body as { id: string; aktif: boolean; fiyatKurus: number }[];
      expect(liste.find((h) => h.id === muayeneHizmeti)).toMatchObject({ aktif: true, fiyatKurus: 150000 });
    });

    it('kurum sahibinin eklediği hizmet doğrudan yayınlanır; kod tekildir', async () => {
      const hizmet = await s(sahip).post('/hizmetler').send({ kod: 'ENJ-01', ad: 'Enjeksiyon', kategori: 'islem', kdvOrani: 10, fiyatTl: 250.5 });
      expect(hizmet.body).toMatchObject({ aktif: true, onayBekliyor: false });
      expect((await s(sahip).post('/hizmetler').send({ kod: 'enj-01', ad: 'Başka', kategori: 'islem', kdvOrani: 10, fiyatTl: 1 })).status).toBe(409);
    });

    it('fiyat değişikliği talebi reddedilirse fiyat değişmez; aynı anda ikinci talep açılamaz', async () => {
      expect((await s(gm.token).post(`/hizmetler/${muayeneHizmeti}/fiyat`).send({ fiyatTl: 2000 })).body).toMatchObject({ uygulandi: false });
      expect((await s(gm.token).post(`/hizmetler/${muayeneHizmeti}/fiyat`).send({ fiyatTl: 2100 })).status).toBe(409);
      const talepId = (await s(sahip).get('/fiyat-talepleri')).body[0].id;
      await s(sahip).post(`/fiyat-talepleri/${talepId}/karar`).send({ onay: false });
      const liste = (await s(sekreter.token).get('/hizmetler')).body as { id: string; fiyatKurus: number }[];
      expect(liste.find((h) => h.id === muayeneHizmeti)?.fiyatKurus).toBe(150000);
    });
  });

  describe('hasta hesabı ve tahsilat', () => {
    it('yüksek indirimi sekreter uygulayamaz; indirim nedensiz olamaz', async () => {
      const yuksek = await s(sekreter.token).post(`/hastalar/${hastaId}/hesap/kalemler`).send({ hizmetId: muayeneHizmeti, indirimYuzde: 30, indirimNedeni: 'Personel yakını' });
      expect(yuksek.status).toBe(403);
      expect(yuksek.body.kod).toBe('INDIRIM_ONAY_GEREKLI');
      expect((await s(sekreter.token).post(`/hastalar/${hastaId}/hesap/kalemler`).send({ hizmetId: muayeneHizmeti, indirimYuzde: 10 })).status).toBe(400);
    });

    it('kalemler ve tahsilatlar bakiyeye yansır', async () => {
      expect((await s(sekreter.token).post(`/hastalar/${hastaId}/hesap/kalemler`).send({ hizmetId: muayeneHizmeti })).status).toBe(201);
      const indirimli = await s(sekreter.token).post(`/hastalar/${hastaId}/hesap/kalemler`).send({ hizmetId: muayeneHizmeti, indirimYuzde: 10, indirimNedeni: 'Kontrol muayenesi' });
      expect(indirimli.body.tutarKurus).toBe(135000);

      const nakit = await s(sekreter.token).post(`/hastalar/${hastaId}/tahsilatlar`).send({ tutarTl: 1000, odemeTuru: 'nakit' });
      expect(nakit.status).toBe(201);
      sekreterNakit = nakit.body.id;
      expect((await s(sekreter.token).post(`/hastalar/${hastaId}/tahsilatlar`).send({ tutarTl: 500, odemeTuru: 'kredi_karti' })).status).toBe(201);

      const hesap = (await s(sekreter.token).get(`/hastalar/${hastaId}/hesap`)).body;
      expect(hesap).toMatchObject({ borcKurus: 285000, odenenKurus: 150000, bakiyeKurus: 135000 });
    });

    it('iadeyi yetkili yönetici yapar; tahsilatı alan kendi tahsilatını iade edemez; iade tutarı aşılamaz', async () => {
      expect((await s(sekreter.token).post(`/tahsilatlar/${sekreterNakit}/iade`).send({ tutarTl: 100, neden: 'Fazla ödeme' })).status).toBe(403);
      expect((await s(gm.token).post(`/tahsilatlar/${sekreterNakit}/iade`).send({ tutarTl: 200, neden: 'Fazla ödeme' })).status).toBe(201);
      const asim = await s(gm.token).post(`/tahsilatlar/${sekreterNakit}/iade`).send({ tutarTl: 900, neden: 'Deneme' });
      expect(asim.status).toBe(422);
      expect(asim.body.kod).toBe('IADE_TUTARI_ASIMI');

      // Genel müdüre kasa rolü de verilir: kendi aldığı tahsilatı iade edemez
      await yetkili(app, sahip).post(`/kullanicilar/${gm.id}/roller`).send({ rolKodu: 'sekreter', subeId: null });
      const gmTahsilat = await s(gm.token).post(`/hastalar/${hastaId}/tahsilatlar`).send({ tutarTl: 50, odemeTuru: 'havale' });
      const kendi = await s(gm.token).post(`/tahsilatlar/${gmTahsilat.body.id}/iade`).send({ tutarTl: 50, neden: 'Deneme' });
      expect(kendi.status).toBe(403);
      expect(kendi.body.kod).toBe('GOREVLER_AYRILIGI');
    });

    it('kalem iptalini yalnızca yönetici yapar ve bakiye düşer', async () => {
      const hesap = (await s(sekreter.token).get(`/hastalar/${hastaId}/hesap`)).body;
      const kalemId = hesap.kalemler[0].id;
      expect((await s(sekreter.token).post(`/hastalar/${hastaId}/hesap/kalemler/${kalemId}/iptal`).send({ neden: 'Hatalı giriş' })).status).toBe(403);
      expect((await s(gm.token).post(`/hastalar/${hastaId}/hesap/kalemler/${kalemId}/iptal`).send({ neden: 'Hatalı giriş' })).status).toBe(201);
      const sonra = (await s(sekreter.token).get(`/hastalar/${hastaId}/hesap`)).body;
      expect(sonra.borcKurus).toBe(hesap.borcKurus - hesap.kalemler[0].tutarKurus);
    });
  });

  describe('kasa ve komuta merkezi', () => {
    it('gün özeti ödeme türüne göre ayrılır; beklenen nakit iadeleri düşer', async () => {
      const kasa = (await s(sekreter.token).get('/kasa')).body;
      expect(kasa.turler.nakit).toEqual({ tahsilatKurus: 100000, iadeKurus: 20000 });
      expect(kasa.turler.kredi_karti).toEqual({ tahsilatKurus: 50000, iadeKurus: 0 });
      expect(kasa.beklenenNakitKurus).toBe(80000);
      expect(kasa.kapanis).toBeNull();
    });

    it('komuta merkezi toplu göstergeleri gösterir; sekreter göremez', async () => {
      const ozet = (await yetkili(app, sahip).get('/komuta/ozet')).body;
      expect(ozet.bugunCiroKurus).toBe(100000 + 50000 - 20000 + 5000);
      expect(ozet.ciro14Gun).toHaveLength(14);
      expect(ozet.alacak.hastaSayisi).toBe(1);
      expect((await s(sekreter.token).get('/komuta/ozet')).status).toBe(403);
    });

    it('kasa farkı açıklamasız kapatılamaz; kapandıktan sonra hareket girilemez', async () => {
      const kasa = (await s(sekreter.token).get('/kasa')).body;
      const acikla = await s(sekreter.token).post('/kasa/kapanis').send({ gun: kasa.gun, sayilanNakitTl: 790 });
      expect(acikla.status).toBe(422);
      expect(acikla.body.kod).toBe('FARK_ACIKLAMASI_GEREKLI');
      const kapanis = await s(sekreter.token).post('/kasa/kapanis').send({ gun: kasa.gun, sayilanNakitTl: 790, aciklama: '10 TL bozuk para eksik' });
      expect(kapanis.body).toMatchObject({ beklenenNakitKurus: 80000, sayilanNakitKurus: 79000, farkKurus: -1000 });
      expect((await s(sekreter.token).post('/kasa/kapanis').send({ gun: kasa.gun, sayilanNakitTl: 800 })).status).toBe(409);
      const sonra = await s(sekreter.token).post(`/hastalar/${hastaId}/tahsilatlar`).send({ tutarTl: 10, odemeTuru: 'nakit' });
      expect(sonra.status).toBe(409);
      expect(sonra.body.kod).toBe('KASA_KAPALI');
      const iz = (await yetkili(app, sahip).get('/denetim-izi?adet=200')).body as { eylem: string }[];
      expect(iz.map((k) => k.eylem)).toEqual(expect.arrayContaining(['kasa.kapandi.farkli', 'iade', 'fiyat.onaylandi', 'fiyat.reddedildi', 'hesap.kalem.iptal']));
    });
  });
});
