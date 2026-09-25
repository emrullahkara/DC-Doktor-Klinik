import { ICD10_BASLANGIC, vitalOlaganDisiMi, vkiHesapla } from './klinik';

describe('klinik yardımcılar', () => {
  it('olağan dışı vital değerler işaretlenir', () => {
    expect(vitalOlaganDisiMi('tansiyonSistolik', 148)).toBe(true);
    expect(vitalOlaganDisiMi('tansiyonSistolik', 120)).toBe(false);
    expect(vitalOlaganDisiMi('ates', 38.2)).toBe(true);
    expect(vitalOlaganDisiMi('kilo', 250)).toBe(false);
  });

  it('VKİ hesaplanır', () => {
    expect(vkiHesapla(174, 88)).toBe(29.1);
    expect(vkiHesapla(undefined, 88)).toBeNull();
  });

  it('ICD-10 başlangıç listesinde kodlar tekil ve biçimi doğru', () => {
    const kodlar = ICD10_BASLANGIC.map((t) => t.kod);
    expect(new Set(kodlar).size).toBe(kodlar.length);
    for (const kod of kodlar) expect(kod).toMatch(/^[A-Z]\d{2}(\.\d{1,2})?$/);
  });
});
