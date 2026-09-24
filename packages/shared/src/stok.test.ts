import { bindeMiktar, fefoSirala, miktarBinde, sktDurumu, stokSeviyesi } from './stok';

describe('stok kuralları', () => {
  const bugun = '2026-09-25';

  it('FEFO: en yakın SKT önce; geçmiş ve boş lotlar önerilmez', () => {
    const lotlar = [
      { lot: 'C', skt: '2027-06-01', bakiye: 5 },
      { lot: 'A', skt: '2026-12-01', bakiye: 2 },
      { lot: 'X', skt: '2026-09-01', bakiye: 9 },
      { lot: 'B', skt: '2026-11-01', bakiye: 0 },
      { lot: 'D', skt: null, bakiye: 1 },
    ];
    expect(fefoSirala(lotlar, bugun).map((l) => l.lot)).toEqual(['A', 'C', 'D']);
  });

  it('SKT eşikleri 90 ve 30 gün; geçmiş kritik', () => {
    expect(sktDurumu('2026-12-10', bugun).seviye).toBe('uyari');
    expect(sktDurumu('2026-10-10', bugun).seviye).toBe('ciddi');
    expect(sktDurumu('2026-09-24', bugun)).toMatchObject({ durum: 'dolmus', seviye: 'kritik' });
    expect(sktDurumu('2027-09-24', bugun).seviye).toBeNull();
  });

  it('kritik stok seviyesi', () => {
    expect(stokSeviyesi(10, 5)).toBeNull();
    expect(stokSeviyesi(3, 5)).toBe('ciddi');
    expect(stokSeviyesi(0, 5)).toBe('kritik');
    expect(stokSeviyesi(0, 0)).toBeNull();
  });

  it('miktar binde birimle kayıpsız saklanır', () => {
    expect(miktarBinde(0.1 + 0.2)).toBe(300);
    expect(bindeMiktar(miktarBinde(2.5))).toBe(2.5);
  });
});
