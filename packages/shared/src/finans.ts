/**
 * Finans yardımcıları. Tüm tutarlar kuruş cinsinden tam sayı olarak tutulur (yuvarlama hatası olmasın).
 */

export const ODEME_TURLERI = {
  nakit: 'Nakit',
  kredi_karti: 'Kredi / banka kartı',
  havale: 'Havale / EFT',
  diger: 'Diğer',
} as const;
export type OdemeTuru = keyof typeof ODEME_TURLERI;

/** Sağlık hizmetlerinde kullanılabilecek KDV oranları (%). Hizmete göre değişir; mali müşavirle teyit edilmelidir. */
export const KDV_ORANLARI = [0, 1, 10, 20] as const;
export type KdvOrani = (typeof KDV_ORANLARI)[number];

export const HIZMET_KATEGORILERI = {
  muayene: 'Muayene',
  islem: 'İşlem / girişim',
  tetkik: 'Tetkik',
  seans: 'Seans / paket',
  malzeme: 'Malzeme / ilaç',
  diger: 'Diğer',
} as const;
export type HizmetKategorisi = keyof typeof HIZMET_KATEGORILERI;

/**
 * Bu oranın üzerindeki indirimi yalnızca iade/indirim onay yetkisi olan (genel müdür, kurum sahibi)
 * uygulayabilir. İleride kurum ayarı olacak.
 */
export const INDIRIM_ONAY_ESIGI_YUZDE = 20;

/** Gün sonu kasa farkı bu tutarı (kuruş) aşarsa açıklama zorunludur. */
export const KASA_FARK_ACIKLAMA_ESIGI_KURUS = 0;

export function tlKurus(tl: number): number {
  return Math.round(tl * 100);
}

const TL = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 });

export function kurusBicimle(kurus: number): string {
  return TL.format(kurus / 100);
}

/** İndirim sonrası kalem tutarı (kuruş). */
export function kalemTutari(birimFiyatKurus: number, adet: number, indirimYuzde: number): { brut: number; indirim: number; net: number } {
  const brut = birimFiyatKurus * adet;
  const indirim = Math.round((brut * indirimYuzde) / 100);
  return { brut, indirim, net: brut - indirim };
}
