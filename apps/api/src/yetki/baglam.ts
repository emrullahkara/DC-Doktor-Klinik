import { createParamDecorator, type ExecutionContext, SetMetadata } from '@nestjs/common';
import type { AskiyaAlma, Izin, Meslek } from '@dc/shared';
import type { Request } from 'express';

export interface Kimlik {
  kullaniciId: string;
  isletmeId: string;
}

export interface YetkiBaglami {
  meslek: Meslek;
  /** İsteğin şube bağlamı (x-sube-id başlığı). null: tüm şubeler düzeyi. */
  subeId: string | null;
  izinler: ReadonlySet<Izin>;
  /** Süresi geçmiş belge nedeniyle askıya alınmış izinler (bilgi amaçlı; `izinler`den zaten düşülmüştür) */
  askilar: readonly AskiyaAlma[];
}

export interface KimlikliIstek extends Request {
  kimlik?: Kimlik;
  yetki?: YetkiBaglami;
}

export const ACIK_ANAHTARI = 'acik';
export const IZIN_ANAHTARI = 'izinler';
export const HERHANGI_IZIN_ANAHTARI = 'herhangiIzin';

/** Kimlik doğrulaması gerektirmeyen uç nokta. */
export const Acik = () => SetMetadata(ACIK_ANAHTARI, true);

/** Uç noktanın gerektirdiği izinler (hepsi gerekir). */
export const IzinGerekli = (...izinler: Izin[]) => SetMetadata(IZIN_ANAHTARI, izinler);

/** Uç nokta için bu izinlerden en az biri yeterli. */
export const HerhangiIzin = (...izinler: Izin[]) => SetMetadata(HERHANGI_IZIN_ANAHTARI, izinler);

export const KimlikBilgisi = createParamDecorator((_: unknown, ctx: ExecutionContext): Kimlik => {
  const istek = ctx.switchToHttp().getRequest<KimlikliIstek>();
  if (!istek.kimlik) throw new Error('Kimlik bağlamı yok: uç nokta @Acik() ile işaretlenmiş olmamalı');
  return istek.kimlik;
});

export const Yetki = createParamDecorator((_: unknown, ctx: ExecutionContext): YetkiBaglami => {
  const istek = ctx.switchToHttp().getRequest<KimlikliIstek>();
  if (!istek.yetki) throw new Error('Yetki bağlamı yok');
  return istek.yetki;
});

export function istemciIp(istek: Request): string | null {
  return istek.ip ?? null;
}

export const OTURUM_CEREZI = 'dc_oturum';

export function cerezOku(baslik: string | undefined, ad: string): string | null {
  if (!baslik) return null;
  for (const parca of baslik.split(';')) {
    const esit = parca.indexOf('=');
    if (esit > 0 && parca.slice(0, esit).trim() === ad) {
      const deger = parca.slice(esit + 1).trim();
      try {
        return decodeURIComponent(deger) || null;
      } catch {
        return null;
      }
    }
  }
  return null;
}
