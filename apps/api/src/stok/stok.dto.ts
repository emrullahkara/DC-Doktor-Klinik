import { KONTROL_DURUMLARI, type KontrolDurumu, SAKLAMA_KOSULLARI, type SaklamaKosulu, URUN_TIPLERI, type UrunTipi } from '@dc/shared';
import { z } from 'zod';

const miktar = z.number().positive('Miktar sıfırdan büyük olmalı.').max(1_000_000).refine((m) => Math.abs(m * 1000 - Math.round(m * 1000)) < 1e-6, 'En çok 3 ondalık.');

export const urunSemasi = z.object({
  kod: z.string().trim().toUpperCase().regex(/^[A-Z0-9._-]{1,30}$/, 'Kod harf, rakam ve - _ . içerebilir.'),
  ad: z.string().trim().min(2).max(200),
  tip: z.enum(Object.keys(URUN_TIPLERI) as [UrunTipi, ...UrunTipi[]]),
  birim: z.string().trim().min(1).max(20),
  kontrol: z.enum(Object.keys(KONTROL_DURUMLARI) as [KontrolDurumu, ...KontrolDurumu[]]).default('normal'),
  saklama: z.enum(Object.keys(SAKLAMA_KOSULLARI) as [SaklamaKosulu, ...SaklamaKosulu[]]).default('oda'),
  barkod: z.string().trim().max(60).optional(),
  minSeviye: z.number().min(0).max(1_000_000).default(0),
});
export type UrunIstegi = z.infer<typeof urunSemasi>;

export const urunGuncelleSemasi = z.object({ minSeviye: z.number().min(0).max(1_000_000).optional(), aktif: z.boolean().optional() });
export type UrunGuncelleIstegi = z.infer<typeof urunGuncelleSemasi>;

export const hareketSemasi = z.discriminatedUnion('tur', [
  z.object({ tur: z.literal('giris'), lot: z.string().trim().min(1).max(60), skt: z.iso.date().optional(), miktar, aciklama: z.string().trim().max(300).default('') }),
  z.object({ tur: z.literal('kullanim'), lot: z.string().trim().min(1).max(60), miktar, kisiId: z.uuid(), sahitId: z.uuid().optional(), aciklama: z.string().trim().max(300).default('') }),
  z.object({ tur: z.enum(['fire', 'iade']), lot: z.string().trim().min(1).max(60), miktar, sahitId: z.uuid().optional(), aciklama: z.string().trim().min(3, 'Açıklama zorunlu.').max(300) }),
  z.object({ tur: z.literal('sayim'), lot: z.string().trim().min(1).max(60), sayilan: z.number().min(0).max(1_000_000), sahitId: z.uuid().optional(), aciklama: z.string().trim().min(3, 'Açıklama zorunlu.').max(300) }),
]);
export type HareketIstegi = z.infer<typeof hareketSemasi>;
