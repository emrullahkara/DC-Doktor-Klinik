import {
  alarmGorulebilirMi,
  askidakiIzinler,
  belgeDurumu,
  eksikKurumBelgeleri,
  eksikPersonelBelgeleri,
  guncelBelgeler,
  KURUM_UYARI_GUNLERI,
} from './belge';
import type { Izin } from './izinler';
import { etkinIzinler } from './kurallar';

describe('belge durumu ve alarm seviyesi', () => {
  const bugun = '2026-09-25';
  it('eşiklere göre seviye verir; bitiş günü dahil geçerlidir', () => {
    expect(belgeDurumu(null, bugun)).toEqual({ durum: 'suresiz', kalanGun: null, seviye: null });
    expect(belgeDurumu('2027-09-25', bugun).durum).toBe('gecerli');
    expect(belgeDurumu('2026-12-20', bugun)).toEqual({ durum: 'yaklasiyor', kalanGun: 86, seviye: 'uyari' });
    expect(belgeDurumu('2026-10-20', bugun).seviye).toBe('ciddi');
    expect(belgeDurumu('2026-09-30', bugun).seviye).toBe('kritik');
    expect(belgeDurumu('2026-09-25', bugun)).toEqual({ durum: 'yaklasiyor', kalanGun: 0, seviye: 'kritik' });
    expect(belgeDurumu('2026-09-24', bugun)).toEqual({ durum: 'dolmus', kalanGun: -1, seviye: 'kritik' });
  });

  it('kurum belgelerinde ilk eşik 120 gündür', () => {
    expect(belgeDurumu('2027-01-10', bugun).seviye).toBeNull();
    expect(belgeDurumu('2027-01-10', bugun, KURUM_UYARI_GUNLERI).seviye).toBe('uyari');
  });
});

describe('güncel belge ve eksikler', () => {
  it('yenilenen belgede bitişi en geç olan geçerlidir', () => {
    const g = guncelBelgeler([
      { tur: 'oda_kaydi', bitis: '2026-01-01', id: 1 },
      { tur: 'oda_kaydi', bitis: '2027-01-01', id: 2 },
      { tur: 'oda_kaydi', bitis: '2026-06-01', id: 3 },
    ]);
    expect(g.get('oda_kaydi')?.id).toBe(2);
  });

  it('zorunlu belgeler mesleğe ve kurum tipine göre belirlenir', () => {
    const hekim = eksikPersonelBelgeleri('hekim', ['diploma_tescil']);
    expect(hekim).toContain('malpraktis_sigortasi');
    expect(hekim).toContain('calisma_belgesi');
    expect(hekim).not.toContain('diploma_tescil');
    const sekreter = eksikPersonelBelgeleri('idari', []);
    expect(sekreter).not.toContain('diploma_tescil');
    expect(sekreter).toContain('gizlilik_taahhudu');
    // Veteriner hekim Sağlık Bakanlığı ÇKYS'ye tabi değildir
    expect(eksikPersonelBelgeleri('veteriner_hekim', [])).not.toContain('calisma_belgesi');

    expect(eksikKurumBelgeleri(['dis'], ['ruhsat'])).toEqual(expect.arrayContaining(['ndk_lisansi', 'tibbi_atik_sozlesmesi']));
    expect(eksikKurumBelgeleri(['veteriner'], [])).toEqual(['veteriner_ruhsat', 'tibbi_atik_sozlesmesi']);
  });
});

describe('süresi geçen belge izinleri askıya alır', () => {
  const bugun = '2026-09-25';
  it('malpraktis sigortası dolunca klinik işlem izinleri askıya alınır, görüntüleme kalır', () => {
    const aski = askidakiIzinler([{ tur: 'malpraktis_sigortasi', bitis: '2026-09-24' }], bugun);
    expect(aski.map((a) => a.izin)).toEqual(expect.arrayContaining(['tani.koy', 'recete.yaz', 'tibbi.kayit.yaz']));
    expect(aski.map((a) => a.izin)).not.toContain('tibbi.kayit.goruntule');
  });

  it('yenilenmiş poliçe varsa askıya alma kalkar; hiç yüklenmemiş belge askıya almaz', () => {
    expect(askidakiIzinler([
      { tur: 'malpraktis_sigortasi', bitis: '2026-09-24' },
      { tur: 'malpraktis_sigortasi', bitis: '2027-09-24' },
    ], bugun)).toEqual([]);
    expect(askidakiIzinler([], bugun)).toEqual([]);
    expect(askidakiIzinler([{ tur: 'oda_kaydi', bitis: '2020-01-01' }], bugun)).toEqual([]);
  });
});

describe('alarm eskalasyonu', () => {
  const izin = (...i: Izin[]) => new Set<Izin>(i);
  const sahip = { kullaniciId: 's', izinler: etkinIzinler([{ rolKodu: 'kurum_sahibi', subeId: null }], 'idari', null) };
  const hekim = { kullaniciId: 'h', izinler: izin('tani.koy') };
  const baskaHekim = { kullaniciId: 'x', izinler: izin('tani.koy') };
  const bashekim = { kullaniciId: 'b', izinler: izin('komuta.goruntule') };

  it('kişi kendi belge alarmını her seviyede görür; başkası göremez', () => {
    const a = { kapsam: 'personel' as const, seviye: 'uyari' as const, kullaniciId: 'h' };
    expect(alarmGorulebilirMi(a, hekim)).toBe(true);
    expect(alarmGorulebilirMi(a, baskaHekim)).toBe(false);
  });

  it('personel yönetimi her seviyeyi, komuta yetkilisi yalnızca kritik ve eksikleri görür', () => {
    expect(alarmGorulebilirMi({ kapsam: 'personel', seviye: 'uyari', kullaniciId: 'h' }, sahip)).toBe(true);
    expect(alarmGorulebilirMi({ kapsam: 'personel', seviye: 'ciddi', kullaniciId: 'h' }, bashekim)).toBe(false);
    expect(alarmGorulebilirMi({ kapsam: 'personel', seviye: 'kritik', kullaniciId: 'h' }, bashekim)).toBe(true);
  });

  it('kurum belgesi: yönetici her seviyede, komuta yetkilisi ciddi ve üstünde', () => {
    expect(alarmGorulebilirMi({ kapsam: 'kurum', seviye: 'uyari' }, sahip)).toBe(true);
    expect(alarmGorulebilirMi({ kapsam: 'kurum', seviye: 'uyari' }, bashekim)).toBe(false);
    expect(alarmGorulebilirMi({ kapsam: 'kurum', seviye: 'ciddi' }, bashekim)).toBe(true);
    expect(alarmGorulebilirMi({ kapsam: 'kurum', seviye: 'kritik' }, hekim)).toBe(false);
  });
});
