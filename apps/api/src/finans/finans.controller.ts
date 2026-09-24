import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ZodPipe } from '../ortak/dogrulama';
import { HerhangiIzin, istemciIp, IzinGerekli, type Kimlik, KimlikBilgisi, Yetki, type YetkiBaglami } from '../yetki/baglam';
import {
  fiyatSemasi,
  type HizmetIstegi,
  hizmetSemasi,
  iadeSemasi,
  iptalSemasi,
  kalemSemasi,
  type KalemIstegi,
  kapanisSemasi,
  type KapanisIstegi,
  kararSemasi,
  tahsilatSemasi,
  type TahsilatIstegi,
} from './finans.dto';
import { FinansService } from './finans.service';
import { tarihSemasi } from '../randevular/randevular.dto';

const Id = (ad = 'id') => Param(ad, new ParseUUIDPipe());

@Controller()
export class FinansController {
  constructor(private readonly finans: FinansService) {}

  @Get('hizmetler')
  @HerhangiIzin('finans.tahsilat', 'finans.goruntule', 'fiyat.yonet', 'fiyat.onayla')
  hizmetler(@KimlikBilgisi() kimlik: Kimlik) {
    return this.finans.hizmetler(kimlik);
  }

  @Post('hizmetler')
  @IzinGerekli('fiyat.yonet')
  hizmetEkle(@KimlikBilgisi() kimlik: Kimlik, @Yetki() yetki: YetkiBaglami, @Body(new ZodPipe(hizmetSemasi)) govde: HizmetIstegi, @Req() istek: Request) {
    return this.finans.hizmetEkle(kimlik, yetki, govde, istemciIp(istek));
  }

  @Post('hizmetler/:id/fiyat')
  @IzinGerekli('fiyat.yonet')
  fiyat(@KimlikBilgisi() kimlik: Kimlik, @Yetki() yetki: YetkiBaglami, @Id() id: string, @Body(new ZodPipe(fiyatSemasi)) govde: { fiyatTl: number }, @Req() istek: Request) {
    return this.finans.fiyatDegistir(kimlik, yetki, id, govde.fiyatTl, istemciIp(istek));
  }

  @Get('fiyat-talepleri')
  @HerhangiIzin('fiyat.yonet', 'fiyat.onayla')
  talepler(@KimlikBilgisi() kimlik: Kimlik) {
    return this.finans.fiyatTalepleri(kimlik);
  }

  @Post('fiyat-talepleri/:id/karar')
  @IzinGerekli('fiyat.onayla')
  karar(@KimlikBilgisi() kimlik: Kimlik, @Id() id: string, @Body(new ZodPipe(kararSemasi)) govde: { onay: boolean }, @Req() istek: Request) {
    return this.finans.fiyatKarari(kimlik, id, govde.onay, istemciIp(istek));
  }

  @Get('hastalar/:id/hesap')
  @HerhangiIzin('finans.tahsilat', 'finans.goruntule')
  hesap(@KimlikBilgisi() kimlik: Kimlik, @Id() id: string) {
    return this.finans.hesap(kimlik, id);
  }

  @Post('hastalar/:id/hesap/kalemler')
  @IzinGerekli('finans.tahsilat')
  kalem(@KimlikBilgisi() kimlik: Kimlik, @Yetki() yetki: YetkiBaglami, @Id() id: string, @Body(new ZodPipe(kalemSemasi)) govde: KalemIstegi, @Req() istek: Request) {
    return this.finans.kalemEkle(kimlik, yetki, id, govde, istemciIp(istek));
  }

  @Post('hastalar/:id/hesap/kalemler/:kalemId/iptal')
  @IzinGerekli('finans.iade.onayla')
  kalemIptal(@KimlikBilgisi() kimlik: Kimlik, @Yetki() yetki: YetkiBaglami, @Id() id: string, @Id('kalemId') kalemId: string, @Body(new ZodPipe(iptalSemasi)) govde: { neden: string }, @Req() istek: Request) {
    return this.finans.kalemIptal(kimlik, yetki, id, kalemId, govde.neden, istemciIp(istek));
  }

  @Post('hastalar/:id/tahsilatlar')
  @IzinGerekli('finans.tahsilat')
  tahsilat(@KimlikBilgisi() kimlik: Kimlik, @Yetki() yetki: YetkiBaglami, @Id() id: string, @Body(new ZodPipe(tahsilatSemasi)) govde: TahsilatIstegi, @Req() istek: Request) {
    return this.finans.tahsilatAl(kimlik, yetki, id, govde, istemciIp(istek));
  }

  @Post('tahsilatlar/:id/iade')
  @IzinGerekli('finans.iade.onayla')
  iade(@KimlikBilgisi() kimlik: Kimlik, @Yetki() yetki: YetkiBaglami, @Id() id: string, @Body(new ZodPipe(iadeSemasi)) govde: { tutarTl: number; neden: string }, @Req() istek: Request) {
    return this.finans.iade(kimlik, yetki, id, govde.tutarTl, govde.neden, istemciIp(istek));
  }

  @Get('kasa')
  @HerhangiIzin('finans.tahsilat', 'finans.goruntule')
  kasa(@KimlikBilgisi() kimlik: Kimlik, @Yetki() yetki: YetkiBaglami, @Query('gun', new ZodPipe(tarihSemasi.optional())) gun?: string) {
    return this.finans.kasaGunu(kimlik, yetki, gun);
  }

  @Post('kasa/kapanis')
  @IzinGerekli('finans.tahsilat')
  kapanis(@KimlikBilgisi() kimlik: Kimlik, @Yetki() yetki: YetkiBaglami, @Body(new ZodPipe(kapanisSemasi)) govde: KapanisIstegi, @Req() istek: Request) {
    return this.finans.kasaKapat(kimlik, yetki, govde, istemciIp(istek));
  }
}
