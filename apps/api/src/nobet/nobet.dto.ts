import { GOREV_AZAMI_SAAT, IZIN_TURLERI, type IzinTuru } from '@dc/shared';
import { z } from 'zod';

export const aySemasi = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Ay YYYY-AA biçiminde olmalı.');

export const cizelgeSemasi = z.object({ ay: aySemasi });

export const gorevSemasi = z
  .object({
    kullaniciId: z.uuid(),
    tur: z.enum(['vardiya', 'nobet', 'icap']),
    baslangic: z.iso.datetime({ offset: true }),
    bitis: z.iso.datetime({ offset: true }),
    notu: z.string().trim().max(200).default(''),
  })
  .refine((g) => Date.parse(g.bitis) > Date.parse(g.baslangic), { message: 'Bitiş, başlangıçtan sonra olmalı.', path: ['bitis'] })
  .refine((g) => Date.parse(g.bitis) - Date.parse(g.baslangic) <= GOREV_AZAMI_SAAT * 3_600_000, { message: `Bir görev en çok ${GOREV_AZAMI_SAAT} saat olabilir.`, path: ['bitis'] });
export type GorevIstegi = z.infer<typeof gorevSemasi>;

export const kararSemasi = z
  .object({
    onay: z.boolean(),
    gerekce: z.string().trim().max(500).optional(),
    redNedeni: z.string().trim().max(500).optional(),
  })
  .refine((k) => k.onay || (k.redNedeni?.length ?? 0) >= 3, { message: 'Red nedeni yazın.', path: ['redNedeni'] });
export type KararIstegi = z.infer<typeof kararSemasi>;

export const ayarSemasi = z.object({
  haftalikAzamiSaat: z.number().int().min(1).max(168),
  nobetSonrasiDinlenmeSaat: z.number().int().min(0).max(72),
  ardisikGeceAzami: z.number().int().min(1).max(14),
});
export type AyarIstegi = z.infer<typeof ayarSemasi>;

export const izinSemasi = z
  .object({
    tur: z.enum(Object.keys(IZIN_TURLERI) as [IzinTuru, ...IzinTuru[]]),
    baslangic: z.iso.date(),
    bitis: z.iso.date(),
    aciklama: z.string().trim().max(300).default(''),
  })
  .refine((i) => i.bitis >= i.baslangic, { message: 'Bitiş, başlangıçtan önce olamaz.', path: ['bitis'] });
export type IzinIstegi = z.infer<typeof izinSemasi>;
