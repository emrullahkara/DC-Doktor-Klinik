import { DURUM_GECISLERI, durumGecisiGecerliMi, type RandevuDurumu } from './randevu';

describe('randevu durum geçişleri', () => {
  it('olağan akış: bekleniyor → geldi → muayenede → tamamlandı', () => {
    expect(durumGecisiGecerliMi('planlandi', 'geldi')).toBe(true);
    expect(durumGecisiGecerliMi('geldi', 'muayenede')).toBe(true);
    expect(durumGecisiGecerliMi('muayenede', 'tamamlandi')).toBe(true);
  });

  it('kapanmış randevu değiştirilemez; adım atlanamaz', () => {
    for (const kapali of ['tamamlandi', 'gelmedi', 'iptal'] as RandevuDurumu[]) {
      expect(DURUM_GECISLERI[kapali]).toEqual([]);
    }
    expect(durumGecisiGecerliMi('planlandi', 'tamamlandi')).toBe(false);
    expect(durumGecisiGecerliMi('muayenede', 'iptal')).toBe(false);
  });
});
