import { KURUM_TIPLERI, type KurumTipi, MESLEKLER, type Meslek } from '@dc/shared';
import { z } from 'zod';

const kurumTipiSemasi = z.enum(Object.keys(KURUM_TIPLERI) as [KurumTipi, ...KurumTipi[]]);
export const meslekSemasi = z.enum(Object.keys(MESLEKLER) as [Meslek, ...Meslek[]]);
export const epostaSemasi = z.string().trim().toLowerCase().pipe(z.email({ message: 'Geçerli bir e-posta girin.' }));
export const parolaSemasi = z
  .string()
  .min(10, 'Parola en az 10 karakter olmalı.')
  .max(200, 'Parola çok uzun.');
const metin = (azami: number) => z.string().trim().min(1, 'Bu alan zorunlu.').max(azami);

export const kayitSemasi = z.object({
  kurum: z.object({
    unvan: metin(200),
    vergiNo: z.string().trim().regex(/^\d{10,11}$/, 'Vergi/T.C. kimlik no 10 veya 11 haneli olmalı.').optional(),
  }),
  sube: z.object({ ad: metin(120) }),
  kurumTipleri: z.array(kurumTipiSemasi).min(1, 'En az bir kurum tipi seçin.'),
  sahip: z.object({
    adSoyad: metin(120),
    eposta: epostaSemasi,
    parola: parolaSemasi,
    meslek: meslekSemasi,
  }),
});
export type KayitIstegi = z.infer<typeof kayitSemasi>;

export const girisSemasi = z.object({
  eposta: epostaSemasi,
  parola: z.string().min(1).max(200),
});
export type GirisIstegi = z.infer<typeof girisSemasi>;
