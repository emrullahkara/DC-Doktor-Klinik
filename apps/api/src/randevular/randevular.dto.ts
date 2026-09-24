import { KAYNAK_TURLERI, type KaynakTuru, RANDEVU_DURUMLARI, RANDEVU_TURLERI, type RandevuDurumu, type RandevuTuru } from '@dc/shared';
import { z } from 'zod';

const secenek = <T extends string>(nesne: Record<T, unknown>) => z.enum(Object.keys(nesne) as [T, ...T[]]);

export const tarihSemasi = z.iso.date('Tarih YYYY-AA-GG biçiminde olmalı.');

export const kaynakSemasi = z.object({
  ad: z.string().trim().min(1).max(80),
  tur: secenek<KaynakTuru>(KAYNAK_TURLERI),
});
export type KaynakIstegi = z.infer<typeof kaynakSemasi>;

const zamanAraligi = {
  /** Saat dilimi içeren ISO zaman: 2026-09-24T14:30:00+03:00 */
  baslangic: z.iso.datetime({ offset: true, message: 'Başlangıç saat dilimiyle birlikte ISO biçiminde olmalı.' }),
  sureDakika: z.number().int().min(5, 'Süre en az 5 dakika.').max(720, 'Süre en fazla 12 saat.').refine((d) => d % 5 === 0, 'Süre 5 dakikanın katı olmalı.'),
};

export const randevuSemasi = z.object({
  kisiId: z.uuid(),
  hayvanId: z.uuid().optional(),
  hekimId: z.uuid(),
  kaynakId: z.uuid().optional(),
  ...zamanAraligi,
  tur: secenek<RandevuTuru>(RANDEVU_TURLERI),
  notlar: z.string().trim().max(500).default(''),
});
export type RandevuIstegi = z.infer<typeof randevuSemasi>;

export const durumSemasi = z
  .object({
    durum: secenek<RandevuDurumu>(RANDEVU_DURUMLARI),
    neden: z.string().trim().max(300).optional(),
  })
  .refine((d) => d.durum !== 'iptal' || !!d.neden, { message: 'İptal nedeni zorunlu.', path: ['neden'] });
export type DurumIstegi = z.infer<typeof durumSemasi>;

export const tasiSemasi = z.object({ ...zamanAraligi, hekimId: z.uuid().optional(), kaynakId: z.uuid().nullable().optional() });
export type TasiIstegi = z.infer<typeof tasiSemasi>;
