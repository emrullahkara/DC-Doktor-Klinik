import {
  AYDINLATMA_KANALLARI,
  type AydinlatmaKanali,
  CINSIYETLER,
  type Cinsiyet,
  HAYVAN_TURLERI,
  type HayvanTuru,
  ILETISIM_TERCIHLERI,
  type IletisimTercihi,
  KAN_GRUPLARI,
  RIZA_TURLERI,
  type RizaTuru,
  tcKimlikNoGecerliMi,
  UYARI_TURLERI,
  type UyariTuru,
  yabanciKimlikNoGecerliMi,
} from '@dc/shared';
import { z } from 'zod';

const secenek = <T extends string>(nesne: Record<T, unknown>) => z.enum(Object.keys(nesne) as [T, ...T[]]);
const bosIseYok = (s: z.ZodString) => s.trim().max(300).optional().transform((d) => (d ? d : undefined));
const telefon = z
  .string()
  .trim()
  .transform((d) => d.replace(/[\s()-]/g, ''))
  .pipe(z.string().regex(/^\+?\d{10,15}$/, 'Geçerli bir telefon numarası girin.'))
  .optional();
const tarih = z.iso.date('Tarih YYYY-AA-GG biçiminde olmalı.').refine((d) => d <= new Date().toISOString().slice(0, 10), 'Tarih gelecekte olamaz.');

export const kimlikSemasi = z
  .discriminatedUnion('tur', [
    z.object({ tur: z.literal('tc'), no: z.string().trim().refine(tcKimlikNoGecerliMi, 'Geçersiz T.C. kimlik numarası.') }),
    z.object({ tur: z.literal('yabanci'), no: z.string().trim().refine(yabanciKimlikNoGecerliMi, 'Geçersiz yabancı kimlik numarası.') }),
    z.object({ tur: z.literal('pasaport'), no: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{5,20}$/, 'Geçersiz pasaport numarası.') }),
    z.object({ tur: z.literal('kimliksiz') }),
  ]);

const hastaAlanlari = {
  ad: z.string().trim().min(1, 'Ad zorunlu.').max(100),
  soyad: z.string().trim().min(1, 'Soyad zorunlu.').max(100),
  dogumTarihi: tarih.optional(),
  cinsiyet: secenek<Cinsiyet>(CINSIYETLER).optional(),
  uyruk: bosIseYok(z.string()),
  telefon,
  eposta: z.string().trim().toLowerCase().pipe(z.email('Geçerli bir e-posta girin.')).optional(),
  adres: bosIseYok(z.string()),
  kanGrubu: z.enum(KAN_GRUPLARI).optional(),
  iletisimTercihi: secenek<IletisimTercihi>(ILETISIM_TERCIHLERI).optional(),
  acilKisi: z.object({ ad: z.string().trim().min(1).max(100), telefon, yakinlik: bosIseYok(z.string()) }).optional(),
  temsilci: z.object({ ad: z.string().trim().min(1).max(100), telefon, yakinlik: bosIseYok(z.string()) }).optional(),
};

export const hastaOlusturSemasi = z.object({
  kimlik: kimlikSemasi,
  ...hastaAlanlari,
  /** KVKK: aydınlatma metni sunulmadan kayıt tamamlanamaz. */
  aydinlatma: z.object({ kanal: secenek<AydinlatmaKanali>(AYDINLATMA_KANALLARI) }),
  rizalar: z.partialRecord(secenek<RizaTuru>(RIZA_TURLERI), z.boolean()).optional(),
  /** Benzer kayıt uyarısı görüldükten sonra yine de kaydetmek için */
  yinedeKaydet: z.boolean().optional(),
});
export type HastaOlusturIstegi = z.infer<typeof hastaOlusturSemasi>;

export const hastaGuncelleSemasi = z
  .object(hastaAlanlari)
  .partial()
  .refine((g) => Object.keys(g).length > 0, 'Güncellenecek en az bir alan gönderin.');
export type HastaGuncelleIstegi = z.infer<typeof hastaGuncelleSemasi>;

export const rizaSemasi = z.object({
  tur: secenek<RizaTuru>(RIZA_TURLERI),
  verildi: z.boolean(),
  kanal: secenek<AydinlatmaKanali>(AYDINLATMA_KANALLARI),
});
export type RizaIstegi = z.infer<typeof rizaSemasi>;

export const uyariSemasi = z.object({
  tur: secenek<UyariTuru>(UYARI_TURLERI),
  aciklama: z.string().trim().max(500).default(''),
  hayvanId: z.uuid().optional(),
});
export type UyariIstegi = z.infer<typeof uyariSemasi>;

export const hayvanSemasi = z.object({
  ad: z.string().trim().min(1).max(100),
  tur: secenek<HayvanTuru>(HAYVAN_TURLERI),
  irk: bosIseYok(z.string()),
  cinsiyet: z.enum(['disi', 'erkek', 'bilinmiyor']).optional(),
  kisirlastirilmis: z.boolean().optional(),
  dogumTarihi: tarih.optional(),
  renk: bosIseYok(z.string()),
  mikrocipNo: z.string().trim().regex(/^\d{15}$/, 'Mikroçip numarası 15 haneli olmalı.').optional(),
});
export type HayvanIstegi = z.infer<typeof hayvanSemasi>;
