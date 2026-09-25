import { cevapSonTarihi, olayKapatilabilirMi } from './kalite';

describe('kalite kuralları', () => {
  it('orta ve ciddi olay kök neden ve önlem olmadan kapatılamaz', () => {
    expect(olayKapatilabilirMi('hafif', null, null)).toBe(true);
    expect(olayKapatilabilirMi('orta', 'Etiket', null)).toBe(false);
    expect(olayKapatilabilirMi('ciddi', 'LASA ilaç etiketi benzerliği', 'Raf ayrımı ve uyarı etiketi')).toBe(true);
  });

  it('resmî kanalda 30, kurum içinde 7 gün cevap süresi', () => {
    expect(cevapSonTarihi('cimer', '2026-09-25')).toBe('2026-10-25');
    expect(cevapSonTarihi('telefon', '2026-09-25')).toBe('2026-10-02');
  });
});
