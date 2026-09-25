import { ayinGunleri, type Gorev, nobetIhlalleri, sablonZamani } from './nobet';

let sayac = 0;
const gorev = (kullaniciId: string, tur: Gorev['tur'], gun: string, saat: string, sure: number): Gorev => ({
  id: `g${++sayac}`,
  kullaniciId,
  tur,
  ...sablonZamani(gun, saat, sure),
});

describe('nöbet kuralları', () => {
  it('şablon Türkiye saatine göre zaman üretir; ayın günleri doğru', () => {
    expect(sablonZamani('2026-10-05', '16:00', 16)).toEqual({ baslangic: '2026-10-05T13:00:00.000Z', bitis: '2026-10-06T05:00:00.000Z' });
    expect(ayinGunleri('2026-02')).toHaveLength(28);
    expect(ayinGunleri('2028-02').at(-1)).toBe('2028-02-29');
  });

  it('kurala uygun çizelgede ihlal yok', () => {
    // Pazartesi–Cuma gündüz vardiyası: 40 saat
    const liste = ['05', '06', '07', '08', '09'].map((g) => gorev('a', 'vardiya', `2026-10-${g}`, '08:00', 8));
    expect(nobetIhlalleri(liste)).toEqual([]);
  });

  it('haftalık 45 saat aşılırsa ihlal; icap sayılmaz', () => {
    const liste = ['05', '06', '07', '08', '09', '10'].map((g) => gorev('a', 'vardiya', `2026-10-${g}`, '08:00', 8));
    const ihlal = nobetIhlalleri(liste);
    expect(ihlal).toHaveLength(1);
    expect(ihlal[0]).toMatchObject({ kural: 'haftalik_saat', kullaniciId: 'a' });
    expect(ihlal[0]!.aciklama).toContain('48 saat');

    const icapli = [...liste.slice(0, 5), gorev('a', 'icap', '2026-10-10', '16:00', 16)];
    expect(nobetIhlalleri(icapli)).toEqual([]);
  });

  it('nöbet sonrası 24 saat dinlenmeden görev verilirse ihlal', () => {
    const nobet = gorev('a', 'nobet', '2026-10-05', '08:00', 24); // Salı 08:00'de biter
    const erken = gorev('a', 'vardiya', '2026-10-06', '16:00', 8);
    const ihlal = nobetIhlalleri([nobet, erken]);
    expect(ihlal.map((i) => i.kural)).toEqual(['dinlenme']);
    expect(ihlal[0]!.gorevIdleri).toEqual([nobet.id, erken.id]);
    expect(nobetIhlalleri([nobet, gorev('a', 'vardiya', '2026-10-07', '08:00', 8)])).toEqual([]);
  });

  it('en çok 2 gece üst üste; farklı kişiler birbirini etkilemez', () => {
    const uc = ['05', '06', '07'].map((g) => gorev('a', 'vardiya', `2026-10-${g}`, '22:00', 8));
    const ihlal = nobetIhlalleri(uc, { haftalikAzamiSaat: 45, nobetSonrasiDinlenmeSaat: 24, ardisikGeceAzami: 2 });
    expect(ihlal.map((i) => i.kural)).toEqual(['ardisik_gece']);
    expect(ihlal[0]!.aciklama).toContain('3 gece');
    const iki = [gorev('b', 'vardiya', '2026-10-05', '22:00', 8), gorev('c', 'vardiya', '2026-10-06', '22:00', 8), gorev('b', 'vardiya', '2026-10-07', '22:00', 8)];
    expect(nobetIhlalleri(iki)).toEqual([]);
  });

  it('kurum ayarı sınırları değiştirir', () => {
    const liste = ['05', '06', '07', '08', '09'].map((g) => gorev('a', 'vardiya', `2026-10-${g}`, '08:00', 8));
    expect(nobetIhlalleri(liste, { haftalikAzamiSaat: 36, nobetSonrasiDinlenmeSaat: 24, ardisikGeceAzami: 2 })).toHaveLength(1);
  });
});
