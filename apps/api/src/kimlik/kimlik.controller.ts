import { Body, Controller, HttpCode, Inject, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AYARLAR, type Ayarlar } from '../ayarlar';
import { ZodPipe } from '../ortak/dogrulama';
import { Acik, istemciIp, OTURUM_CEREZI } from '../yetki/baglam';
import { type GirisIstegi, girisSemasi, type KayitIstegi, kayitSemasi } from './kimlik.dto';
import { KimlikService, type OturumYaniti } from './kimlik.service';

const OTURUM_SURESI_MS = 8 * 60 * 60 * 1000;

@Controller('kimlik')
export class KimlikController {
  constructor(
    private readonly kimlik: KimlikService,
    @Inject(AYARLAR) private readonly ayarlar: Ayarlar,
  ) {}

  /** Yeni kurum kaydı (kayıt sihirbazının sonucu). */
  @Acik()
  @Post('kayit')
  async kayit(@Body(new ZodPipe(kayitSemasi)) govde: KayitIstegi, @Req() istek: Request, @Res({ passthrough: true }) yanit: Response) {
    return this.oturumCereziYaz(yanit, await this.kimlik.kayit(govde, istemciIp(istek)));
  }

  @Acik()
  @Post('giris')
  @HttpCode(200)
  async giris(@Body(new ZodPipe(girisSemasi)) govde: GirisIstegi, @Req() istek: Request, @Res({ passthrough: true }) yanit: Response) {
    return this.oturumCereziYaz(yanit, await this.kimlik.giris(govde, istemciIp(istek)));
  }

  @Acik()
  @Post('cikis')
  @HttpCode(204)
  cikis(@Res({ passthrough: true }) yanit: Response): void {
    yanit.clearCookie(OTURUM_CEREZI, this.cerezSecenekleri());
  }

  /**
   * Tarayıcı için oturum anahtarı httpOnly çerezde tutulur: sayfadaki betikler okuyamaz.
   * SameSite=Strict, başka sitelerden gelen isteklerde çerezin gönderilmesini engeller.
   */
  private oturumCereziYaz(yanit: Response, oturum: OturumYaniti): OturumYaniti {
    yanit.cookie(OTURUM_CEREZI, oturum.token, { ...this.cerezSecenekleri(), maxAge: OTURUM_SURESI_MS });
    return oturum;
  }

  private cerezSecenekleri() {
    return { httpOnly: true, sameSite: 'strict' as const, secure: this.ayarlar.guvenliCerez, path: '/' };
  }
}
