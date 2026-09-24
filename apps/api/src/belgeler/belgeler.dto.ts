import { CALISMA_SEKILLERI, type CalismaSekli } from '@dc/shared';
import { z } from 'zod';

/** Çok parçalı formdan gelen boş metni “yok” sayar */
const bosIseYok = (d: unknown) => (d === '' || d === null ? undefined : d);
const tarih = z.preprocess(bosIseYok, z.iso.date().optional());
const metin = (azami: number) => z.preprocess(bosIseYok, z.string().trim().max(azami).optional()).transform((d) => d ?? '');

export const belgeEkleSemasi = z
  .object({
    kapsam: z.enum(['personel', 'kurum']),
    kullaniciId: z.preprocess(bosIseYok, z.uuid().optional()),
    subeId: z.preprocess(bosIseYok, z.uuid().optional()),
    tur: z.string().min(1).max(60),
    belgeNo: metin(100),
    verenKurum: metin(200),
    baslangic: tarih,
    bitis: tarih,
    aciklama: metin(500),
  })
  .refine((b) => !b.baslangic || !b.bitis || b.bitis >= b.baslangic, { message: 'Bitiş, başlangıçtan önce olamaz.', path: ['bitis'] })
  .refine((b) => (b.kapsam === 'personel') === !!b.kullaniciId, { message: 'Personel belgesi bir kişiye bağlanmalı.', path: ['kullaniciId'] })
  .refine((b) => b.kapsam === 'kurum' || !b.subeId, { message: 'Personel belgesi şubeye bağlanmaz.', path: ['subeId'] });
export type BelgeEkleIstegi = z.infer<typeof belgeEkleSemasi>;

export const kaldirSemasi = z.object({ neden: z.string().trim().min(3).max(300) });

export const personelBilgiSemasi = z.object({
  unvanBrans: z.string().trim().max(120).default(''),
  calismaSekli: z.enum(Object.keys(CALISMA_SEKILLERI) as [CalismaSekli, ...CalismaSekli[]]),
  iseGiris: z.iso.date().nullable().default(null),
  telefon: z.string().trim().regex(/^0?5\d{9}$/, 'Cep telefonu 05XXXXXXXXX biçiminde olmalı.').nullable().default(null),
});
export type PersonelBilgiIstegi = z.infer<typeof personelBilgiSemasi>;
