import { IZINLER, TUM_IZINLER } from './izinler';
import { HEKIM_MESLEKLERI, MESLEKLER, type Meslek } from './meslekler';
import { ROLLER, type RolKodu } from './roller';
import { atamaIcinGerekenIzin, etkinIzinler, izinMeslegeUygunMu, rolAtanabilirMi, saglikRoluMu } from './kurallar';

const tumMeslekler = Object.keys(MESLEKLER) as Meslek[];
const tumRoller = Object.keys(ROLLER) as RolKodu[];

describe('kilitli yasal kurallar', () => {
  it('hekim seviyeli izinler yalnızca hekim mesleklerine verilir', () => {
    for (const izin of TUM_IZINLER.filter((i) => IZINLER[i].seviye === 'hekim')) {
      for (const meslek of tumMeslekler) {
        expect(izinMeslegeUygunMu(izin, meslek)).toBe(HEKIM_MESLEKLERI.has(meslek));
      }
    }
  });

  it('idari, destek ve estetisyen tıbbi kayda erişemez', () => {
    for (const meslek of ['idari', 'destek', 'estetisyen'] as Meslek[]) {
      expect(izinMeslegeUygunMu('tibbi.kayit.goruntule', meslek)).toBe(false);
      expect(izinMeslegeUygunMu('recete.yaz', meslek)).toBe(false);
    }
  });

  it('hemşire tıbbi kayda yazabilir ama reçete yazamaz, tanı koyamaz', () => {
    expect(izinMeslegeUygunMu('tibbi.kayit.yaz', 'hemsire')).toBe(true);
    expect(izinMeslegeUygunMu('recete.yaz', 'hemsire')).toBe(false);
    expect(izinMeslegeUygunMu('tani.koy', 'hemsire')).toBe(false);
  });

  it('meslek kısıtı olmayan her rol, yalnızca meslekten bağımsız izinler içerir', () => {
    for (const rol of tumRoller) {
      const tanim = ROLLER[rol];
      if ('meslekler' in tanim) continue;
      const tibbi = tanim.izinler.filter((i) => IZINLER[i].seviye !== 'serbest');
      expect({ rol, tibbi }).toEqual({ rol, tibbi: [] });
    }
  });

  it('meslek kısıtlı rollerin izinleri, izin verilen her meslek için uygundur', () => {
    for (const rol of tumRoller) {
      const tanim = ROLLER[rol];
      if (!('meslekler' in tanim)) continue;
      for (const meslek of tanim.meslekler) {
        for (const izin of tanim.izinler) {
          expect({ rol, meslek, izin, uygun: izinMeslegeUygunMu(izin, meslek) }).toEqual({ rol, meslek, izin, uygun: true });
        }
      }
    }
  });
});

describe('rolAtanabilirMi', () => {
  it('hekim rolü idari personele atanamaz', () => {
    expect(rolAtanabilirMi('hekim', 'idari')).toMatchObject({ uygun: false, neden: 'MESLEK_UYGUN_DEGIL' });
  });

  it('mesul müdür yalnızca hekim, diş hekimi veya veteriner hekim olabilir', () => {
    expect(rolAtanabilirMi('mesul_mudur', 'dis_hekimi').uygun).toBe(true);
    expect(rolAtanabilirMi('mesul_mudur', 'hemsire').uygun).toBe(false);
  });

  it('idari roller her mesleğe atanabilir', () => {
    expect(rolAtanabilirMi('kurum_sahibi', 'idari').uygun).toBe(true);
    expect(rolAtanabilirMi('kurum_sahibi', 'hekim').uygun).toBe(true);
  });
});

describe('atamaIcinGerekenIzin', () => {
  it('mesul müdürü kurum sahibi, diğer sağlık rollerini mesul müdür, idari rolleri kullanıcı yöneticisi atar', () => {
    expect(atamaIcinGerekenIzin('mesul_mudur')).toBe('mesul.mudur.ata');
    expect(atamaIcinGerekenIzin('hekim')).toBe('yetki.saglik.onayla');
    expect(atamaIcinGerekenIzin('hemsire')).toBe('yetki.saglik.onayla');
    expect(atamaIcinGerekenIzin('sekreter')).toBe('kullanici.yonet');
    expect(saglikRoluMu('muhasebe')).toBe(false);
  });

  it('kurum sahibi mesul müdür atayabilir, ama hekim rolünü doğrudan atayamaz', () => {
    const sahip = etkinIzinler([{ rolKodu: 'kurum_sahibi', subeId: null }], 'idari', null);
    expect(sahip.has('mesul.mudur.ata')).toBe(true);
    expect(sahip.has('yetki.saglik.onayla')).toBe(false);
  });
});

describe('etkinIzinler', () => {
  it('hekim olmayan kurum sahibi tıbbi kaydı göremez, yalnızca anonim istatistik görür', () => {
    const izinler = etkinIzinler([{ rolKodu: 'kurum_sahibi', subeId: null }], 'idari', null);
    expect(izinler.has('tibbi.kayit.goruntule')).toBe(false);
    expect(izinler.has('tibbi.istatistik.anonim')).toBe(true);
    expect(izinler.has('finans.goruntule')).toBe(true);
  });

  it('şubeye özel atama yalnızca o şubede geçerlidir', () => {
    const atamalar = [{ rolKodu: 'sekreter' as const, subeId: 'sube-a' }];
    expect(etkinIzinler(atamalar, 'idari', 'sube-a').has('randevu.yonet')).toBe(true);
    expect(etkinIzinler(atamalar, 'idari', 'sube-b').has('randevu.yonet')).toBe(false);
    expect(etkinIzinler(atamalar, 'idari', null).has('randevu.yonet')).toBe(false);
  });

  it('veritabanına hatalı yazılmış bir atama bile meslek kuralını delemez', () => {
    const izinler = etkinIzinler([{ rolKodu: 'hekim', subeId: null }], 'idari', null);
    expect(izinler.size).toBe(0);
  });

  it('birden fazla rol birleşir (hekim olan sahip)', () => {
    const izinler = etkinIzinler(
      [
        { rolKodu: 'kurum_sahibi', subeId: null },
        { rolKodu: 'hekim', subeId: null },
      ],
      'hekim',
      null,
    );
    expect(izinler.has('recete.yaz')).toBe(true);
    expect(izinler.has('finans.goruntule')).toBe(true);
  });
});
