import type { INestApplication } from '@nestjs/common';
import { Client } from 'pg';
import { calisanEkle, kurumKaydet, testUygulamasi, veritabaniniSifirla, yetkili } from './yardimci';

const GECERLI_TC = '10000000146';

let app: INestApplication;

interface Ekip {
  sahip: string;
  subeId: string;
  sekreter: string;
  hemsire: string;
}

/** Sahip (idari) + mesul müdür (hekim) + sekreter + hemşire olan bir kurum */
async function ekipKur(kurumTipleri: string[] = ['tip_merkezi']): Promise<Ekip> {
  const sahip = await kurumKaydet(app, { meslek: 'idari', kurumTipleri });
  const subeId = ((await yetkili(app, sahip.token).get('/ben')).body as { subeler: { id: string }[] }).subeler[0]!.id;
  const mesul = await calisanEkle(app, sahip.token, sahip.token, 'hekim', 'mesul_mudur', subeId);
  const sekreter = await calisanEkle(app, sahip.token, sahip.token, 'idari', 'sekreter', null);
  const hemsire = await calisanEkle(app, sahip.token, mesul.token, 'hemsire', 'hemsire', subeId);
  return { sahip: sahip.token, subeId, sekreter: sekreter.token, hemsire: hemsire.token };
}

function hastaGovdesi(ek: Record<string, unknown> = {}) {
  return {
    kimlik: { tur: 'tc', no: GECERLI_TC },
    ad: 'İlker',
    soyad: 'IŞIK',
    dogumTarihi: '1980-05-17',
    cinsiyet: 'erkek',
    telefon: '0532 123 45 67',
    aydinlatma: { kanal: 'tablet_imza' },
    rizalar: { pazarlama_iletisim: true, foto_tanitim: false },
    ...ek,
  };
}

beforeAll(async () => {
  await veritabaniniSifirla();
  app = await testUygulamasi();
});

afterAll(async () => {
  await app.close();
});

describe('hasta kaydı', () => {
  let ekip: Ekip;
  let hastaId: string;

  beforeAll(async () => {
    ekip = await ekipKur();
  });

  it('sekreter aydınlatma ve rızalarla hasta kaydeder; kimlik numarası maskeli döner', async () => {
    const yanit = await yetkili(app, ekip.sekreter).post('/hastalar').send(hastaGovdesi());
    expect(yanit.status).toBe(201);
    hastaId = yanit.body.id;

    const kart = await yetkili(app, ekip.sekreter).get(`/hastalar/${hastaId}`);
    expect(kart.status).toBe(200);
    expect(kart.body).toMatchObject({ ad: 'İlker', soyad: 'IŞIK', kimlikTuru: 'tc', kimlikNoMaske: '100******46', telefon: '05321234567' });
    expect(kart.body.aydinlatma).toMatchObject({ metinSurumu: 'taslak-0.1', kanal: 'tablet_imza' });
    const rizalar = Object.fromEntries((kart.body.rizalar as { tur: string; verildi: boolean; kayitli: boolean }[]).map((r) => [r.tur, r]));
    expect(rizalar.pazarlama_iletisim).toMatchObject({ verildi: true, kayitli: true });
    expect(rizalar.foto_tanitim).toMatchObject({ verildi: false, kayitli: true });
    expect(rizalar.yurtdisi_aktarim).toMatchObject({ verildi: false, kayitli: false });
    expect(JSON.stringify(kart.body)).not.toContain(GECERLI_TC);
  });

  it('kimlik numarası veritabanında açık metin olarak bulunmaz', async () => {
    const istemci = new Client({ connectionString: process.env.TEST_MIGRATION_DATABASE_URL });
    await istemci.connect();
    try {
      const { rows } = await istemci.query('SELECT row_to_json(k)::text AS satir FROM kisiler k WHERE id = $1', [hastaId]);
      expect(rows[0].satir).not.toContain(GECERLI_TC);
      expect(rows[0].satir).toContain('v1:');
    } finally {
      await istemci.end();
    }
  });

  it('kimlik numarasının açık hâli ayrı istekle alınır ve denetim izine yazılır', async () => {
    const yanit = await yetkili(app, ekip.sekreter).get(`/hastalar/${hastaId}/kimlik-no`);
    expect(yanit.body).toEqual({ tur: 'tc', no: GECERLI_TC });
    const iz = (await yetkili(app, ekip.sahip).get('/denetim-izi')).body as { eylem: string }[];
    expect(iz.map((k) => k.eylem)).toEqual(expect.arrayContaining(['hasta.olusturuldu', 'hasta.goruntulendi', 'hasta.kimlik.goruntulendi']));
  });

  it('aydınlatma sunulmadan veya geçersiz kimlik numarasıyla kayıt yapılamaz', async () => {
    const aydinlatmasiz = await yetkili(app, ekip.sekreter).post('/hastalar').send({ ...hastaGovdesi(), aydinlatma: undefined });
    expect(aydinlatmasiz.status).toBe(400);
    expect((aydinlatmasiz.body.ayrinti as { alan: string }[]).map((a) => a.alan)).toContain('aydinlatma');

    const gecersiz = await yetkili(app, ekip.sekreter).post('/hastalar').send(hastaGovdesi({ kimlik: { tur: 'tc', no: '10000000147' } }));
    expect(gecersiz.status).toBe(400);
  });

  it('aynı kimlik numarası mevcut kayda yönlendirir', async () => {
    const yanit = await yetkili(app, ekip.sekreter).post('/hastalar').send(hastaGovdesi());
    expect(yanit.status).toBe(409);
    expect(yanit.body).toMatchObject({ kod: 'HASTA_ZATEN_KAYITLI', ayrinti: { hastaId } });
  });

  it('benzer kayıt (ad-soyad-doğum tarihi) uyarı verir; onaylanırsa kaydedilir', async () => {
    const govde = hastaGovdesi({ kimlik: { tur: 'kimliksiz' }, telefon: undefined });
    const uyari = await yetkili(app, ekip.sekreter).post('/hastalar').send(govde);
    expect(uyari.status).toBe(409);
    expect(uyari.body.kod).toBe('BENZER_KAYIT_VAR');
    expect(uyari.body.ayrinti.benzerler[0]).toMatchObject({ id: hastaId, kimlikNoMaske: '100******46' });

    const onayli = await yetkili(app, ekip.sekreter).post('/hastalar').send({ ...govde, yinedeKaydet: true });
    expect(onayli.status).toBe(201);
  });

  it('kimlik numarası, Türkçe ad ve telefonla aranabilir', async () => {
    const tcIle = await yetkili(app, ekip.sekreter).get(`/hastalar?q=${GECERLI_TC}`);
    expect(tcIle.body.map((h: { id: string }) => h.id)).toEqual([hastaId]);
    for (const q of ['ILKER IŞI', 'ilker isik', 'İlker']) {
      const adIle = await yetkili(app, ekip.sekreter).get(`/hastalar?q=${encodeURIComponent(q)}`);
      expect({ q, bulundu: adIle.body.map((h: { id: string }) => h.id).includes(hastaId) }).toEqual({ q, bulundu: true });
    }
    const telIle = await yetkili(app, ekip.sekreter).get(`/hastalar?q=${encodeURIComponent('532 123')}`);
    expect(telIle.body.map((h: { id: string }) => h.id)).toContain(hastaId);
  });

  it('kurum sahibi hasta bilgisini görür ama hasta kaydedemez', async () => {
    expect((await yetkili(app, ekip.sahip).get(`/hastalar/${hastaId}`)).status).toBe(200);
    expect((await yetkili(app, ekip.sahip).post('/hastalar').send(hastaGovdesi({ kimlik: { tur: 'pasaport', no: 'U1234567' } }))).status).toBe(403);
  });

  it('güncelleme yalnızca değişen alanları değiştirir ve aramaya yansır', async () => {
    const yanit = await yetkili(app, ekip.sekreter).patch(`/hastalar/${hastaId}`).send({ telefon: '0555 000 11 22' });
    expect(yanit.status).toBe(200);
    const kart = await yetkili(app, ekip.sekreter).get(`/hastalar/${hastaId}`);
    expect(kart.body).toMatchObject({ telefon: '05550001122', ad: 'İlker' });
    const ara = await yetkili(app, ekip.sekreter).get('/hastalar?q=05550001122');
    expect(ara.body.map((h: { id: string }) => h.id)).toContain(hastaId);
  });

  it('rıza geri çekilebilir; güncel durum son kayıttır', async () => {
    const geri = await yetkili(app, ekip.sekreter).post(`/hastalar/${hastaId}/rizalar`).send({ tur: 'pazarlama_iletisim', verildi: false, kanal: 'yuz_yuze_islak' });
    expect(geri.status).toBe(201);
    const kart = await yetkili(app, ekip.sekreter).get(`/hastalar/${hastaId}`);
    expect((kart.body.rizalar as { tur: string; verildi: boolean }[]).find((r) => r.tur === 'pazarlama_iletisim')?.verildi).toBe(false);
  });

  describe('uyarı bayrakları', () => {
    it('klinik uyarıyı hemşire ekler, sekreter ekleyemez', async () => {
      const hemsire = await yetkili(app, ekip.hemsire, ekip.subeId).post(`/hastalar/${hastaId}/uyarilar`).send({ tur: 'alerji', aciklama: 'Penisilin' });
      expect(hemsire.status).toBe(201);
      const sekreter = await yetkili(app, ekip.sekreter).post(`/hastalar/${hastaId}/uyarilar`).send({ tur: 'alerji', aciklama: 'Aspirin' });
      expect(sekreter.status).toBe(403);
      expect(sekreter.body.ayrinti.eksikIzinler).toEqual(['tibbi.kayit.yaz']);
    });

    it('herkes yalnızca kendi görebileceği uyarıları görür', async () => {
      expect((await yetkili(app, ekip.sekreter).post(`/hastalar/${hastaId}/uyarilar`).send({ tur: 'odeme_sorunu' })).status).toBe(201);
      expect((await yetkili(app, ekip.sekreter).post(`/hastalar/${hastaId}/uyarilar`).send({ tur: 'siddet_gecmisi' })).status).toBe(201);

      const turler = async (token: string, subeId?: string) =>
        ((await yetkili(app, token, subeId).get(`/hastalar/${hastaId}`)).body.uyarilar as { tur: string }[]).map((u) => u.tur).sort();

      expect(await turler(ekip.hemsire, ekip.subeId)).toEqual(['alerji', 'siddet_gecmisi']);
      expect(await turler(ekip.sekreter)).toEqual(['odeme_sorunu', 'siddet_gecmisi']);
      expect(await turler(ekip.sahip)).toEqual(['siddet_gecmisi']);
    });

    it('uyarı kaldırılınca listeden çıkar; klinik uyarıyı sekreter kaldıramaz', async () => {
      const kart = await yetkili(app, ekip.hemsire, ekip.subeId).get(`/hastalar/${hastaId}`);
      const alerji = (kart.body.uyarilar as { id: string; tur: string }[]).find((u) => u.tur === 'alerji')!;
      expect((await yetkili(app, ekip.sekreter).post(`/hastalar/${hastaId}/uyarilar/${alerji.id}/kaldir`)).status).toBe(403);
      expect((await yetkili(app, ekip.hemsire, ekip.subeId).post(`/hastalar/${hastaId}/uyarilar/${alerji.id}/kaldir`)).status).toBe(201);
      const sonra = await yetkili(app, ekip.hemsire, ekip.subeId).get(`/hastalar/${hastaId}`);
      expect((sonra.body.uyarilar as { tur: string }[]).map((u) => u.tur)).toEqual(['siddet_gecmisi']);
    });
  });

  it('başka bir kurum bu hastayı göremez', async () => {
    const baska = await kurumKaydet(app, { meslek: 'hekim' });
    const baskaSube = ((await yetkili(app, baska.token).get('/ben')).body as { subeler: { id: string }[] }).subeler[0]!.id;
    expect((await yetkili(app, baska.token, baskaSube).get(`/hastalar/${hastaId}`)).status).toBe(404);
    expect((await yetkili(app, baska.token, baskaSube).get(`/hastalar?q=${GECERLI_TC}`)).body).toEqual([]);
  });
});

describe('hayvan kaydı', () => {
  it('veteriner şubesi olmayan kurumda hayvan kaydedilemez', async () => {
    const ekip = await ekipKur(['tip_merkezi']);
    const sahip = await yetkili(app, ekip.sekreter).post('/hastalar').send(hastaGovdesi({ kimlik: { tur: 'kimliksiz' }, ad: 'Sahip', soyad: 'Bir' }));
    const yanit = await yetkili(app, ekip.sekreter).post(`/hastalar/${sahip.body.id}/hayvanlar`).send({ ad: 'Pamuk', tur: 'kedi' });
    expect(yanit.status).toBe(422);
    expect(yanit.body.kod).toBe('VETERINER_SUBE_YOK');
  });

  it('veteriner kurumunda sahibe hayvan eklenir; mikroçip tekildir', async () => {
    const ekip = await ekipKur(['veteriner']);
    const sahip = await yetkili(app, ekip.sekreter).post('/hastalar').send(hastaGovdesi({ kimlik: { tur: 'kimliksiz' }, ad: 'Ayşe', soyad: 'Kaya' }));
    const hayvan = { ad: 'Pamuk', tur: 'kedi', irk: 'Van', cinsiyet: 'disi', kisirlastirilmis: true, mikrocipNo: '900123456789012' };
    const ilk = await yetkili(app, ekip.sekreter).post(`/hastalar/${sahip.body.id}/hayvanlar`).send(hayvan);
    expect(ilk.status).toBe(201);
    const tekrar = await yetkili(app, ekip.sekreter).post(`/hastalar/${sahip.body.id}/hayvanlar`).send({ ...hayvan, ad: 'Tekir' });
    expect(tekrar.status).toBe(409);

    const kart = await yetkili(app, ekip.sekreter).get(`/hastalar/${sahip.body.id}`);
    expect(kart.body.hayvanlar).toEqual([expect.objectContaining({ ad: 'Pamuk', tur: 'kedi', mikrocipNo: '900123456789012', uyarilar: [] })]);
  });
});
