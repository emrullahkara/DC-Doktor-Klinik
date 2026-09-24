import { ROLLER, type RolKodu } from '@dc/shared';
import { z } from 'zod';
import { epostaSemasi, meslekSemasi, parolaSemasi } from '../kimlik/kimlik.dto';

export const kullaniciOlusturSemasi = z.object({
  eposta: epostaSemasi,
  adSoyad: z.string().trim().min(1).max(120),
  meslek: meslekSemasi,
  // Faz 0: yönetici geçici parola belirler. E-posta ile davet ve ilk girişte parola değişimi sonraki adımda.
  geciciParola: parolaSemasi,
});
export type KullaniciOlusturIstegi = z.infer<typeof kullaniciOlusturSemasi>;

export const rolAtaSemasi = z.object({
  rolKodu: z.enum(Object.keys(ROLLER) as [RolKodu, ...RolKodu[]]),
  subeId: z.uuid().nullable(),
});
export type RolAtaIstegi = z.infer<typeof rolAtaSemasi>;
