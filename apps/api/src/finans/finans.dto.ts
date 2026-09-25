import { HIZMET_KATEGORILERI, type HizmetKategorisi, KDV_ORANLARI, ODEME_TURLERI, type OdemeTuru } from '@dc/shared';
import { z } from 'zod';

/** TL tutarı: en fazla iki ondalık, üst sınır 10 milyon TL */
const tl = z
  .number()
  .min(0, 'Tutar negatif olamaz.')
  .max(10_000_000, 'Tutar çok yüksek.')
  .refine((d) => Math.abs(d * 100 - Math.round(d * 100)) < 1e-6, 'Tutar en fazla iki ondalık içerebilir.');
const pozitifTl = tl.refine((d) => d > 0, 'Tutar sıfırdan büyük olmalı.');

export const hizmetSemasi = z.object({
  kod: z.string().trim().toUpperCase().regex(/^[A-Z0-9._-]{1,20}$/, 'Kod harf, rakam ve - _ . içerebilir (en fazla 20).'),
  ad: z.string().trim().min(2).max(200),
  kategori: z.enum(Object.keys(HIZMET_KATEGORILERI) as [HizmetKategorisi, ...HizmetKategorisi[]]),
  kdvOrani: z.union(KDV_ORANLARI.map((k) => z.literal(k)) as unknown as [z.ZodLiteral<0>, z.ZodLiteral<1>, z.ZodLiteral<10>, z.ZodLiteral<20>]),
  fiyatTl: tl,
});
export type HizmetIstegi = z.infer<typeof hizmetSemasi>;

export const fiyatSemasi = z.object({ fiyatTl: tl });
export const kararSemasi = z.object({ onay: z.boolean() });

export const kalemSemasi = z
  .object({
    hizmetId: z.uuid(),
    adet: z.number().int().min(1).max(100).default(1),
    randevuId: z.uuid().optional(),
    indirimYuzde: z.number().min(0).max(100).default(0),
    indirimNedeni: z.string().trim().max(200).optional(),
  })
  .refine((k) => k.indirimYuzde === 0 || !!k.indirimNedeni, { message: 'İndirim nedeni zorunlu.', path: ['indirimNedeni'] });
export type KalemIstegi = z.infer<typeof kalemSemasi>;

export const iptalSemasi = z.object({ neden: z.string().trim().min(3).max(300) });

const odemeTuru = z.enum(Object.keys(ODEME_TURLERI) as [OdemeTuru, ...OdemeTuru[]]);

export const tahsilatSemasi = z.object({
  tutarTl: pozitifTl,
  odemeTuru,
  aciklama: z.string().trim().max(300).default(''),
});
export type TahsilatIstegi = z.infer<typeof tahsilatSemasi>;

export const iadeSemasi = z.object({ tutarTl: pozitifTl, neden: z.string().trim().min(3).max(300) });

export const kapanisSemasi = z.object({
  gun: z.iso.date(),
  sayilanNakitTl: tl,
  aciklama: z.string().trim().max(500).default(''),
});
export type KapanisIstegi = z.infer<typeof kapanisSemasi>;
