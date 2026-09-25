import {
  DOF_KAYNAKLARI,
  type DofKaynagi,
  OLAY_SIDDETLERI,
  OLAY_TURLERI,
  type OlaySiddeti,
  type OlayTuru,
  SIKAYET_KANALLARI,
  SIKAYET_KATEGORILERI,
  type SikayetKanali,
  type SikayetKategorisi,
} from '@dc/shared';
import { z } from 'zod';

const metin = (en: number, max: number) => z.string().trim().min(en).max(max);

export const olaySemasi = z.object({
  tur: z.enum(Object.keys(OLAY_TURLERI) as [OlayTuru, ...OlayTuru[]]),
  siddet: z.enum(Object.keys(OLAY_SIDDETLERI) as [OlaySiddeti, ...OlaySiddeti[]]),
  olayZamani: z.iso.datetime({ offset: true }),
  yer: metin(0, 120).default(''),
  aciklama: metin(10, 3000),
  ilkMudahale: metin(0, 1000).default(''),
  kisiId: z.uuid().optional(),
  isimsiz: z.boolean().default(false),
});
export type OlayIstegi = z.infer<typeof olaySemasi>;

export const olayGuncelleSemasi = z.object({
  durum: z.enum(['inceleniyor', 'kapatildi']).optional(),
  sorumluId: z.uuid().optional(),
  kokNeden: metin(0, 2000).optional(),
  alinanOnlem: metin(0, 2000).optional(),
  resmiBildirim: metin(0, 500).optional(),
});
export type OlayGuncelleIstegi = z.infer<typeof olayGuncelleSemasi>;

export const sikayetSemasi = z.object({
  kanal: z.enum(Object.keys(SIKAYET_KANALLARI) as [SikayetKanali, ...SikayetKanali[]]),
  kategori: z.enum(Object.keys(SIKAYET_KATEGORILERI) as [SikayetKategorisi, ...SikayetKategorisi[]]),
  resmiNo: metin(0, 60).default(''),
  kisiId: z.uuid().optional(),
  basvuran: metin(2, 120),
  iletisim: metin(0, 200).default(''),
  konu: metin(3, 200),
  aciklama: metin(0, 3000).default(''),
  alinisGunu: z.iso.date(),
});
export type SikayetIstegi = z.infer<typeof sikayetSemasi>;

export const cevapSemasi = z.object({ cevap: metin(10, 3000) });
export const notSemasi = z.object({ not: metin(5, 2000) });

export const dofSemasi = z
  .object({
    kaynak: z.enum(Object.keys(DOF_KAYNAKLARI) as [DofKaynagi, ...DofKaynagi[]]),
    olayId: z.uuid().optional(),
    sikayetId: z.uuid().optional(),
    baslik: metin(3, 200),
    kokNeden: metin(0, 2000).default(''),
    aksiyon: metin(3, 2000),
    sorumluId: z.uuid(),
    termin: z.iso.date(),
  })
  .refine((d) => d.kaynak !== 'olay' || !!d.olayId, { message: 'Olay seçin.', path: ['olayId'] })
  .refine((d) => d.kaynak !== 'sikayet' || !!d.sikayetId, { message: 'Şikâyet seçin.', path: ['sikayetId'] });
export type DofIstegi = z.infer<typeof dofSemasi>;
