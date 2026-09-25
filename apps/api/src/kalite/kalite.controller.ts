import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { ZodPipe } from '../ortak/dogrulama';
import { HerhangiIzin, istemciIp, IzinGerekli, type Kimlik, KimlikBilgisi, Yetki, type YetkiBaglami } from '../yetki/baglam';
import { cevapSemasi, type DofIstegi, dofSemasi, notSemasi, olayGuncelleSemasi, type OlayGuncelleIstegi, type OlayIstegi, olaySemasi, type SikayetIstegi, sikayetSemasi } from './kalite.dto';
import { KaliteService } from './kalite.service';

const Id = () => Param('id', new ParseUUIDPipe());

@Controller()
export class KaliteController {
  constructor(private readonly kalite: KaliteService) {}

  @Post('olaylar')
  @IzinGerekli('olay.bildir')
  olayBildir(@KimlikBilgisi() kimlik: Kimlik, @Yetki() yetki: YetkiBaglami, @Body(new ZodPipe(olaySemasi)) govde: OlayIstegi, @Req() istek: Request) {
    return this.kalite.olayBildir(kimlik, yetki, govde, istemciIp(istek));
  }

  @Get('olaylar/takip/:kod')
  olayTakip(@KimlikBilgisi() kimlik: Kimlik, @Param('kod', new ZodPipe(z.string().trim().regex(/^[A-Za-z2-9]{8}$/, 'Takip kodu 8 karakterdir.'))) kod: string) {
    return this.kalite.olayTakip(kimlik, kod);
  }

  @Get('olaylarim')
  olaylarim(@KimlikBilgisi() kimlik: Kimlik) {
    return this.kalite.olaylarim(kimlik);
  }

  @Get('olaylar')
  @IzinGerekli('kalite.yonet')
  olaylar(@KimlikBilgisi() kimlik: Kimlik, @Yetki() yetki: YetkiBaglami) {
    return this.kalite.olaylar(kimlik, yetki);
  }

  @Patch('olaylar/:id')
  @IzinGerekli('kalite.yonet')
  olayGuncelle(@KimlikBilgisi() kimlik: Kimlik, @Id() id: string, @Body(new ZodPipe(olayGuncelleSemasi)) govde: OlayGuncelleIstegi, @Req() istek: Request) {
    return this.kalite.olayGuncelle(kimlik, id, govde, istemciIp(istek));
  }

  /** Hasta kabulde (sekreter) veya kalite biriminde kaydedilir. */
  @Post('sikayetler')
  @HerhangiIzin('kalite.yonet', 'hasta.kaydet')
  sikayetKaydet(@KimlikBilgisi() kimlik: Kimlik, @Yetki() yetki: YetkiBaglami, @Body(new ZodPipe(sikayetSemasi)) govde: SikayetIstegi, @Req() istek: Request) {
    return this.kalite.sikayetKaydet(kimlik, yetki, govde, istemciIp(istek));
  }

  @Get('sikayetler')
  @HerhangiIzin('kalite.yonet', 'komuta.goruntule')
  sikayetler(@KimlikBilgisi() kimlik: Kimlik) {
    return this.kalite.sikayetler(kimlik);
  }

  @Post('sikayetler/:id/cevap')
  @IzinGerekli('kalite.yonet')
  cevap(@KimlikBilgisi() kimlik: Kimlik, @Yetki() yetki: YetkiBaglami, @Id() id: string, @Body(new ZodPipe(cevapSemasi)) govde: { cevap: string }, @Req() istek: Request) {
    return this.kalite.sikayetCevapla(kimlik, yetki, id, govde.cevap, istemciIp(istek));
  }

  @Post('sikayetler/:id/kapat')
  @IzinGerekli('kalite.yonet')
  kapat(@KimlikBilgisi() kimlik: Kimlik, @Id() id: string, @Req() istek: Request) {
    return this.kalite.sikayetKapat(kimlik, id, istemciIp(istek));
  }

  @Post('dofler')
  @IzinGerekli('kalite.yonet')
  dofAc(@KimlikBilgisi() kimlik: Kimlik, @Body(new ZodPipe(dofSemasi)) govde: DofIstegi, @Req() istek: Request) {
    return this.kalite.dofAc(kimlik, govde, istemciIp(istek));
  }

  @Get('dofler')
  dofler(@KimlikBilgisi() kimlik: Kimlik, @Yetki() yetki: YetkiBaglami) {
    return this.kalite.dofler(kimlik, yetki);
  }

  @Post('dofler/:id/tamamla')
  tamamla(@KimlikBilgisi() kimlik: Kimlik, @Yetki() yetki: YetkiBaglami, @Id() id: string, @Body(new ZodPipe(notSemasi)) govde: { not: string }, @Req() istek: Request) {
    return this.kalite.dofTamamla(kimlik, yetki, id, govde.not, istemciIp(istek));
  }

  @Post('dofler/:id/dogrula')
  @IzinGerekli('kalite.yonet')
  dogrula(@KimlikBilgisi() kimlik: Kimlik, @Id() id: string, @Body(new ZodPipe(notSemasi)) govde: { not: string }, @Req() istek: Request) {
    return this.kalite.dofDogrula(kimlik, id, govde.not, istemciIp(istek));
  }

  @Get('kalite/kisiler')
  @IzinGerekli('kalite.yonet')
  kisiler(@KimlikBilgisi() kimlik: Kimlik) {
    return this.kalite.kisiler(kimlik);
  }
}
