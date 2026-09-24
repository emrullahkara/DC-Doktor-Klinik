import { BadRequestException, HttpException, HttpStatus, type PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';

/** API hatalarının ortak biçimi: makine için `kod`, kullanıcı için `mesaj`. */
export class ApiHatasi extends HttpException {
  constructor(durum: HttpStatus, kod: string, mesaj: string, ayrinti?: unknown) {
    super({ kod, mesaj, ...(ayrinti === undefined ? {} : { ayrinti }) }, durum);
  }
}

/** İstek gövdesini zod şemasıyla doğrular. */
export class ZodPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly sema: ZodType<T>) {}

  transform(deger: unknown): T {
    const sonuc = this.sema.safeParse(deger);
    if (!sonuc.success) {
      throw new BadRequestException({
        kod: 'GECERSIZ_ISTEK',
        mesaj: 'İstekteki bazı alanlar geçersiz.',
        ayrinti: sonuc.error.issues.map((h) => ({ alan: h.path.join('.'), mesaj: h.message })),
      });
    }
    return sonuc.data;
  }
}

/** PostgreSQL benzersizlik ihlali mi? (drizzle hatayı `cause` içine sarar) */
export function benzersizlikIhlaliMi(hata: unknown): boolean {
  let h: unknown = hata;
  for (let i = 0; i < 3 && h; i++) {
    if ((h as { code?: string }).code === '23505') return true;
    h = (h as { cause?: unknown }).cause;
  }
  return false;
}
