import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ZodPipe } from '../ortak/dogrulama';
import { Acik, istemciIp } from '../yetki/baglam';
import { type GirisIstegi, girisSemasi, type KayitIstegi, kayitSemasi } from './kimlik.dto';
import { KimlikService } from './kimlik.service';

@Controller('kimlik')
export class KimlikController {
  constructor(private readonly kimlik: KimlikService) {}

  /** Yeni kurum kaydı (kayıt sihirbazının sonucu). */
  @Acik()
  @Post('kayit')
  kayit(@Body(new ZodPipe(kayitSemasi)) govde: KayitIstegi, @Req() istek: Request) {
    return this.kimlik.kayit(govde, istemciIp(istek));
  }

  @Acik()
  @Post('giris')
  @HttpCode(200)
  giris(@Body(new ZodPipe(girisSemasi)) govde: GirisIstegi, @Req() istek: Request) {
    return this.kimlik.giris(govde, istemciIp(istek));
  }
}
