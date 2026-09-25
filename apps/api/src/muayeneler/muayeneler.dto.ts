import { ACIL_ERISIM_GEREKCELERI, type AcilErisimGerekcesi, VITALLER, type VitalKodu } from '@dc/shared';
import { z } from 'zod';

const vitalSemasi = z.object(
  Object.fromEntries(
    (Object.entries(VITALLER) as [VitalKodu, (typeof VITALLER)[VitalKodu]][]).map(([kod, t]) => [
      kod,
      z.number().min(t.en, `${t.ad} en az ${t.en} olabilir.`).max(t.enFazla, `${t.ad} en fazla ${t.enFazla} olabilir.`).nullable().optional(),
    ]),
  ) as Record<VitalKodu, z.ZodOptional<z.ZodNullable<z.ZodNumber>>>,
);

const taniSemasi = z.object({
  kod: z.string().trim().toUpperCase().regex(/^[A-Z]\d{2}(\.\d{1,2})?$/, 'Geçersiz ICD-10 kodu.'),
  ad: z.string().trim().min(1).max(200),
  tur: z.enum(['on', 'kesin']),
  birincil: z.boolean(),
});

const receteKalemiSemasi = z.object({
  ilac: z.string().trim().min(2).max(200),
  doz: z.string().trim().max(100).default(''),
  kullanim: z.string().trim().min(1, 'Kullanım şekli zorunlu.').max(200),
  sureGun: z.number().int().min(1).max(365),
  kutu: z.number().int().min(1).max(20),
});

export const muayeneOlusturSemasi = z.object({ randevuId: z.uuid() });

export const muayeneGuncelleSemasi = z
  .object({
    sikayet: z.string().max(5000),
    vitaller: vitalSemasi,
    fizikMuayene: z.string().max(10000),
    plan: z.string().max(5000),
    tanilar: z
      .array(taniSemasi)
      .max(20)
      .refine((l) => l.length === 0 || l.filter((t) => t.birincil).length === 1, 'Tam olarak bir birincil tanı seçin.')
      .refine((l) => new Set(l.map((t) => t.kod)).size === l.length, 'Aynı tanı iki kez eklenemez.'),
    recete: z.array(receteKalemiSemasi).max(10),
    kontrolTarihi: z.iso.date().nullable(),
  })
  .partial()
  .refine((g) => Object.keys(g).length > 0, 'Güncellenecek en az bir alan gönderin.');
export type MuayeneGuncelleIstegi = z.infer<typeof muayeneGuncelleSemasi>;

export const imzaSemasi = z.object({ parola: z.string().min(1).max(200) });
export const ekNotSemasi = z.object({ metin: z.string().trim().min(1).max(5000) });

export const acilErisimSemasi = z.object({
  gerekce: z.enum(Object.keys(ACIL_ERISIM_GEREKCELERI) as [AcilErisimGerekcesi, ...AcilErisimGerekcesi[]]),
  aciklama: z.string().trim().min(10, 'Gerekçeyi en az 10 karakterle açıklayın.').max(500),
});
export type AcilErisimIstegi = z.infer<typeof acilErisimSemasi>;
