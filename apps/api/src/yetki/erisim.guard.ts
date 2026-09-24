import { type CanActivate, type ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Izin } from '@dc/shared';
import { eq } from 'drizzle-orm';
import { VeritabaniService } from '../db/veritabani.service';
import { subeler } from '../db/sema';
import { DenetimService } from '../denetim/denetim.service';
import { ApiHatasi } from '../ortak/dogrulama';
import { ACIK_ANAHTARI, cerezOku, HERHANGI_IZIN_ANAHTARI, IZIN_ANAHTARI, istemciIp, type KimlikliIstek, OTURUM_CEREZI } from './baglam';
import { YetkiService } from './yetki.service';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface TokenIcerigi {
  sub: string;
  isl: string;
}

/**
 * Her isteğe uygulanan erişim denetimi:
 *  1. Kimlik (Bearer token) doğrulanır.
 *  2. Kullanıcının rol atamaları ve mesleği veritabanından okunur (token'a güvenilmez;
 *     rol değişikliği veya hesabın kapatılması bir sonraki istekte geçerli olur).
 *  3. İstenen şube bağlamında etkin izinler hesaplanır, uç noktanın istediği izinler aranır.
 * Reddedilen istekler denetim izine yazılır.
 */
@Injectable()
export class ErisimGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly db: VeritabaniService,
    private readonly yetki: YetkiService,
    private readonly denetim: DenetimService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const hedefler = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(ACIK_ANAHTARI, hedefler)) return true;

    const istek = ctx.switchToHttp().getRequest<KimlikliIstek>();
    const token = this.tokenAl(istek);
    let icerik: TokenIcerigi;
    try {
      icerik = await this.jwt.verifyAsync<TokenIcerigi>(token);
    } catch {
      throw new ApiHatasi(HttpStatus.UNAUTHORIZED, 'KIMLIK_GEREKLI', 'Oturumunuz geçersiz veya süresi dolmuş.');
    }

    const subeBasligi = istek.header('x-sube-id');
    if (subeBasligi !== undefined && !UUID.test(subeBasligi)) {
      throw new ApiHatasi(HttpStatus.BAD_REQUEST, 'GECERSIZ_SUBE', 'Şube kimliği geçersiz.');
    }
    const subeId = subeBasligi ?? null;
    const gerekenler = this.reflector.getAllAndOverride<Izin[] | undefined>(IZIN_ANAHTARI, hedefler) ?? [];
    const herhangiBiri = this.reflector.getAllAndOverride<Izin[] | undefined>(HERHANGI_IZIN_ANAHTARI, hedefler) ?? [];
    const baglam = { isletmeId: icerik.isl, kullaniciId: icerik.sub };

    const sonuc = await this.db.kiraciIslemi(baglam, async (tx) => {
      const veri = await this.yetki.yukle(tx, icerik.sub);
      if (!veri || !veri.aktif) return { durum: 'hesap' as const };
      if (subeId) {
        const [sube] = await tx.select({ id: subeler.id }).from(subeler).where(eq(subeler.id, subeId));
        if (!sube) return { durum: 'sube' as const };
      }
      const izinler = this.yetki.izinler(veri, subeId);
      const eksik = gerekenler.filter((i) => !izinler.has(i));
      if (herhangiBiri.length > 0 && !herhangiBiri.some((i) => izinler.has(i))) eksik.push(...herhangiBiri);
      if (eksik.length > 0) {
        await this.denetim.kaydet(tx, {
          ...baglam,
          eylem: 'erisim.reddedildi',
          subeId,
          ip: istemciIp(istek),
          ayrinti: { yol: `${istek.method} ${istek.path}`, eksikIzinler: eksik },
        });
        return { durum: 'yetki' as const, eksik };
      }
      return { durum: 'tamam' as const, meslek: veri.meslek, izinler };
    });

    switch (sonuc.durum) {
      case 'hesap':
        throw new ApiHatasi(HttpStatus.UNAUTHORIZED, 'KIMLIK_GEREKLI', 'Hesabınız kapalı veya bulunamadı.');
      case 'sube':
        throw new ApiHatasi(HttpStatus.NOT_FOUND, 'SUBE_BULUNAMADI', 'Şube bulunamadı.');
      case 'yetki':
        throw new ApiHatasi(HttpStatus.FORBIDDEN, 'YETKI_YOK', 'Bu işlem için yetkiniz yok.', { eksikIzinler: sonuc.eksik });
      case 'tamam':
        istek.kimlik = baglam;
        istek.yetki = { meslek: sonuc.meslek, subeId, izinler: sonuc.izinler };
        return true;
    }
  }

  /** Önce `Authorization: Bearer` başlığı (API istemcileri), yoksa tarayıcının httpOnly oturum çerezi. */
  private tokenAl(istek: KimlikliIstek): string {
    const [tur, deger] = (istek.header('authorization') ?? '').split(' ');
    if (tur === 'Bearer' && deger) return deger;
    const cerez = cerezOku(istek.header('cookie'), OTURUM_CEREZI);
    if (cerez) return cerez;
    throw new ApiHatasi(HttpStatus.UNAUTHORIZED, 'KIMLIK_GEREKLI', 'Giriş yapmanız gerekiyor.');
  }
}
