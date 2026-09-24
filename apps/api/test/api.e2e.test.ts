import type { INestApplication } from '@nestjs/common';
import { Client } from 'pg';
import request from 'supertest';
import { benzersizEposta, kurumKaydet, testUygulamasi, veritabaniniSifirla, yetkili } from './yardimci';

let app: INestApplication;

beforeAll(async () => {
  await veritabaniniSifirla();
  app = await testUygulamasi();
});

afterAll(async () => {
  await app.close();
});

interface Ben {
  kullanici: { id: string };
  subeler: { id: string; ad: string; kurumTipleri: string[] }[];
  roller: { rolKodu: string; subeId: string | null }[];
  izinler: string[];
}

async function ben(token: string, subeId?: string): Promise<Ben> {
  const yanit = await yetkili(app, token, subeId).get('/ben');
  expect(yanit.status).toBe(200);
  return yanit.body as Ben;
}

async function kullaniciEkle(token: string, meslek: string) {
  const eposta = benzersizEposta(meslek);
  const yanit = await yetkili(app, token).post('/kullanicilar').send({ eposta, adSoyad: `Deneme ${meslek}`, meslek, geciciParola: 'gecici-parola-123' });
  expect(yanit.status).toBe(201);
  return { id: (yanit.body as { id: string }).id, eposta };
}

async function girisYap(eposta: string, parola = 'gecici-parola-123'): Promise<string> {
  const yanit = await request(app.getHttpServer()).post('/api/v1/kimlik/giris').send({ eposta, parola });
  expect(yanit.status).toBe(200);
  return (yanit.body as { token: string }).token;
}

describe('kurum kaydı', () => {
  it('hekim olmayan sahip: işletme verisini görür, tıbbi kaydı göremez', async () => {
    const kayit = await kurumKaydet(app, { meslek: 'idari' });
    const profil = await ben(kayit.token);
    expect(profil.roller).toEqual([{ rolKodu: 'kurum_sahibi', subeId: null, ad: 'Kurum sahibi / ortak' }]);
    expect(profil.izinler).toContain('finans.goruntule');
    expect(profil.izinler).toContain('tibbi.istatistik.anonim');
    expect(profil.izinler).not.toContain('tibbi.kayit.goruntule');
  });

  it('veteriner ve insan sağlığı birlikte seçilince iki ayrı şube açılır; hekim sahip yalnızca insan sağlığı şubesinde mesul müdür olur', async () => {
    const kayit = await kurumKaydet(app, { kurumTipleri: ['tip_merkezi', 'veteriner'], meslek: 'hekim' });
    const profil = await ben(kayit.token);
    expect(profil.subeler.map((s) => [s.ad, s.kurumTipleri])).toEqual([
      ['Merkez', ['tip_merkezi']],
      ['Merkez (Veteriner)', ['veteriner']],
    ]);
    const insanSubesi = profil.subeler[0]!.id;
    expect(profil.roller.filter((r) => r.subeId === insanSubesi).map((r) => r.rolKodu).sort()).toEqual(['hekim', 'mesul_mudur']);
    expect(profil.roller.filter((r) => r.subeId === profil.subeler[1]!.id)).toEqual([]);

    const insanSubesinde = await ben(kayit.token, insanSubesi);
    expect(insanSubesinde.izinler).toContain('recete.yaz');
    const vetSubesinde = await ben(kayit.token, profil.subeler[1]!.id);
    expect(vetSubesinde.izinler).not.toContain('recete.yaz');
  });

  it('aynı e-posta ile ikinci kayıt reddedilir', async () => {
    const kayit = await kurumKaydet(app);
    const yanit = await request(app.getHttpServer())
      .post('/api/v1/kimlik/kayit')
      .send({ kurum: { unvan: 'Başka' }, sube: { ad: 'Şube' }, kurumTipleri: ['dis'], sahip: { adSoyad: 'X', eposta: kayit.eposta, parola: 'guclu-parola-123', meslek: 'idari' } });
    expect(yanit.status).toBe(409);
    expect(yanit.body.kod).toBe('EPOSTA_KULLANIMDA');
  });

  it('geçersiz istek alan bazında hata döner', async () => {
    const yanit = await request(app.getHttpServer())
      .post('/api/v1/kimlik/kayit')
      .send({ kurum: { unvan: '' }, sube: { ad: 'Şube' }, kurumTipleri: [], sahip: { adSoyad: 'X', eposta: 'gecersiz', parola: 'kisa', meslek: 'pilot' } });
    expect(yanit.status).toBe(400);
    expect(yanit.body.kod).toBe('GECERSIZ_ISTEK');
    const alanlar = (yanit.body.ayrinti as { alan: string }[]).map((a) => a.alan);
    expect(alanlar).toEqual(expect.arrayContaining(['kurum.unvan', 'kurumTipleri', 'sahip.eposta', 'sahip.parola', 'sahip.meslek']));
  });
});

describe('giriş', () => {
  it('doğru parola ile oturum açılır, yanlış parola aynı genel hatayı verir ve denetim izine yazılır', async () => {
    const kayit = await kurumKaydet(app);
    await girisYap(kayit.eposta, 'guclu-parola-123');

    const yanlis = await request(app.getHttpServer()).post('/api/v1/kimlik/giris').send({ eposta: kayit.eposta, parola: 'yanlis-parola' });
    expect(yanlis.status).toBe(401);
    expect(yanlis.body.kod).toBe('GIRIS_BASARISIZ');

    const olmayan = await request(app.getHttpServer()).post('/api/v1/kimlik/giris').send({ eposta: 'yok@ornek.test', parola: 'yanlis-parola' });
    expect(olmayan.status).toBe(401);
    expect(olmayan.body).toEqual(yanlis.body);

    const iz = await yetkili(app, kayit.token).get('/denetim-izi');
    const eylemler = (iz.body as { eylem: string }[]).map((k) => k.eylem);
    expect(eylemler).toEqual(expect.arrayContaining(['kurum.kayit', 'giris.basarili', 'giris.basarisiz']));
  });

  it('tarayıcı için oturum httpOnly ve SameSite=Strict çerezle açılır, çıkışta silinir', async () => {
    const kayit = await kurumKaydet(app);
    const ajan = request.agent(app.getHttpServer());
    const giris = await ajan.post('/api/v1/kimlik/giris').send({ eposta: kayit.eposta, parola: 'guclu-parola-123' });
    const cerez = String(giris.headers['set-cookie']);
    expect(cerez).toMatch(/dc_oturum=/);
    expect(cerez).toMatch(/HttpOnly/);
    expect(cerez).toMatch(/SameSite=Strict/);

    expect((await ajan.get('/api/v1/ben')).status).toBe(200);
    expect((await ajan.post('/api/v1/kimlik/cikis')).status).toBe(204);
    expect((await ajan.get('/api/v1/ben')).status).toBe(401);
  });

  it('token olmadan veya bozuk token ile korumalı uç noktaya erişilemez', async () => {
    expect((await request(app.getHttpServer()).get('/api/v1/ben')).status).toBe(401);
    expect((await yetkili(app, 'bozuk.token.degeri').get('/ben')).status).toBe(401);
  });
});

describe('rol atama ve yasal kurallar', () => {
  it('sahip → mesul müdür atar; mesul müdür → hemşire atar; sahip sağlık rolünü doğrudan atayamaz', async () => {
    const sahip = await kurumKaydet(app, { meslek: 'idari' });
    const subeId = (await ben(sahip.token)).subeler[0]!.id;

    const hemsire = await kullaniciEkle(sahip.token, 'hemsire');
    const reddedilen = await yetkili(app, sahip.token).post(`/kullanicilar/${hemsire.id}/roller`).send({ rolKodu: 'hemsire', subeId });
    expect(reddedilen.status).toBe(403);
    expect(reddedilen.body.ayrinti.eksikIzinler).toEqual(['yetki.saglik.onayla']);

    const doktor = await kullaniciEkle(sahip.token, 'hekim');
    const mesul = await yetkili(app, sahip.token).post(`/kullanicilar/${doktor.id}/roller`).send({ rolKodu: 'mesul_mudur', subeId });
    expect(mesul.status).toBe(201);

    const doktorToken = await girisYap(doktor.eposta);
    // Mesul müdür (yalnızca şubede) kullanıcı listesini görür ama yeni kullanıcı ekleyemez
    expect((await yetkili(app, doktorToken, subeId).get('/kullanicilar')).status).toBe(200);
    expect((await yetkili(app, doktorToken, subeId).post('/kullanicilar').send({ eposta: benzersizEposta('x'), adSoyad: 'X', meslek: 'idari', geciciParola: 'gecici-parola-123' })).status).toBe(403);
    const onaylanan = await yetkili(app, doktorToken).post(`/kullanicilar/${hemsire.id}/roller`).send({ rolKodu: 'hemsire', subeId });
    expect(onaylanan.status).toBe(201);

    const tekrar = await yetkili(app, doktorToken).post(`/kullanicilar/${hemsire.id}/roller`).send({ rolKodu: 'hemsire', subeId });
    expect(tekrar.status).toBe(409);

    // Şubeye özel rol: şube bağlamı verilmeden izin yok, verilince tıbbi kayıt izni var
    const hemsireToken = await girisYap(hemsire.eposta);
    expect((await ben(hemsireToken)).izinler).toEqual([]);
    const subede = await ben(hemsireToken, subeId);
    expect(subede.izinler).toContain('tibbi.kayit.goruntule');
    expect(subede.izinler).not.toContain('recete.yaz');
  });

  it('hekim rolü idari personele atanamaz (kilitli kural)', async () => {
    const sahip = await kurumKaydet(app, { meslek: 'hekim' });
    const subeId = (await ben(sahip.token)).subeler[0]!.id;
    const sekreter = await kullaniciEkle(sahip.token, 'idari');
    const yanit = await yetkili(app, sahip.token).post(`/kullanicilar/${sekreter.id}/roller`).send({ rolKodu: 'hekim', subeId });
    expect(yanit.status).toBe(422);
    expect(yanit.body.kod).toBe('MESLEK_UYGUN_DEGIL');
  });

  it('kimse kendine rol atayamaz', async () => {
    const sahip = await kurumKaydet(app, { meslek: 'idari' });
    const yanit = await yetkili(app, sahip.token).post(`/kullanicilar/${sahip.kullaniciId}/roller`).send({ rolKodu: 'genel_mudur', subeId: null });
    expect(yanit.status).toBe(403);
    expect(yanit.body.kod).toBe('KENDI_YETKISI');
  });

  it('sekreter kullanıcı listesini göremez; reddedilen erişim denetim izine yazılır', async () => {
    const sahip = await kurumKaydet(app, { meslek: 'idari' });
    const sekreter = await kullaniciEkle(sahip.token, 'idari');
    expect((await yetkili(app, sahip.token).post(`/kullanicilar/${sekreter.id}/roller`).send({ rolKodu: 'sekreter', subeId: null })).status).toBe(201);

    const sekreterToken = await girisYap(sekreter.eposta);
    const yanit = await yetkili(app, sekreterToken).get('/kullanicilar');
    expect(yanit.status).toBe(403);
    expect(yanit.body.kod).toBe('YETKI_YOK');

    const iz = await yetkili(app, sahip.token).get('/denetim-izi');
    const red = (iz.body as { eylem: string; kullaniciId: string }[]).find((k) => k.eylem === 'erisim.reddedildi');
    expect(red?.kullaniciId).toBe(sekreter.id);
  });
});

describe('kiracı izolasyonu', () => {
  it('bir işletme diğerinin kullanıcılarını ve şubelerini göremez', async () => {
    const a = await kurumKaydet(app);
    const b = await kurumKaydet(app);
    const aSubesi = (await ben(a.token)).subeler[0]!.id;

    const bListesi = await yetkili(app, b.token).get('/kullanicilar');
    expect(bListesi.status).toBe(200);
    expect((bListesi.body as { id: string }[]).map((k) => k.id)).toEqual([b.kullaniciId]);

    const baskaSube = await yetkili(app, b.token, aSubesi).get('/ben');
    expect(baskaSube.status).toBe(404);
    expect(baskaSube.body.kod).toBe('SUBE_BULUNAMADI');
  });

  it('işletme bağlamı ayarlanmadan uygulama kullanıcısı hiçbir satır göremez (RLS)', async () => {
    await kurumKaydet(app);
    const istemci = new Client({ connectionString: process.env.TEST_DATABASE_URL });
    await istemci.connect();
    try {
      const { rows } = await istemci.query('SELECT count(*)::int AS adet FROM kullanicilar');
      expect(rows[0].adet).toBe(0);
    } finally {
      await istemci.end();
    }
  });
});

describe('denetim izi', () => {
  it('kayıtlar hash zinciriyle bağlıdır ve değiştirilemez', async () => {
    const kayit = await kurumKaydet(app);
    await girisYap(kayit.eposta, 'guclu-parola-123');
    const iz = (await yetkili(app, kayit.token).get('/denetim-izi')).body as { id: number; ozet: string; oncekiOzet: string | null }[];
    const artan = [...iz].sort((x, y) => x.id - y.id);
    expect(artan[0]!.oncekiOzet).toBeNull();
    for (let i = 1; i < artan.length; i++) expect(artan[i]!.oncekiOzet).toBe(artan[i - 1]!.ozet);

    const sahip = new Client({ connectionString: process.env.TEST_MIGRATION_DATABASE_URL });
    await sahip.connect();
    try {
      await expect(sahip.query('UPDATE denetim_izi SET eylem = $1 WHERE id = $2', ['degistirildi', artan[0]!.id])).rejects.toThrow(/değiştirilemez/);
      await expect(sahip.query('DELETE FROM denetim_izi WHERE id = $1', [artan[0]!.id])).rejects.toThrow(/değiştirilemez/);
    } finally {
      await sahip.end();
    }
  });
});

describe('kurum tipleri', () => {
  it('önizleme seçime göre modülleri birleştirir ve ayrı şube gerekliliğini bildirir', async () => {
    const yanit = await request(app.getHttpServer()).post('/api/v1/kurum-tipleri/onizleme').send({ kurumTipleri: ['estetik', 'veteriner'] });
    expect(yanit.status).toBe(200);
    expect(yanit.body.ayriSubeGerekli).toBe(true);
    expect(yanit.body.moduller).toEqual(expect.arrayContaining(['Komuta Merkezi', 'Seans ve paket yönetimi', 'Aşı karnesi ve hatırlatma']));
  });
});
