import { kalemTutari, kurusBicimle, tlKurus } from './finans';

describe('finans yardımcıları', () => {
  it('TL kuruşa yuvarlama hatası olmadan çevrilir', () => {
    expect(tlKurus(0.1 + 0.2)).toBe(30);
    expect(tlKurus(1250.5)).toBe(125050);
  });

  it('indirimli kalem tutarı hesaplanır', () => {
    expect(kalemTutari(150000, 2, 10)).toEqual({ brut: 300000, indirim: 30000, net: 270000 });
    expect(kalemTutari(99999, 1, 15)).toEqual({ brut: 99999, indirim: 15000, net: 84999 });
  });

  it('tutar Türk lirası olarak biçimlenir', () => {
    expect(kurusBicimle(184250_00).replace(/\s/g, ' ')).toBe('₺184.250,00');
  });
});
