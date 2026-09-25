import { Body, Controller, DefaultValuePipe, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ZodPipe } from '../ortak/dogrulama';
import { HerhangiIzin, istemciIp, IzinGerekli, type Kimlik, KimlikBilgisi, Yetki, type YetkiBaglami } from '../yetki/baglam';
import { type AcilErisimIstegi, acilErisimSemasi, ekNotSemasi, imzaSemasi, type MuayeneGuncelleIstegi, muayeneGuncelleSemasi, muayeneOlusturSemasi } from './muayeneler.dto';
import { MuayenelerService } from './muayeneler.service';

const Id = () => Param('id', new ParseUUIDPipe());

/**
 * Klinik kayıt uç noktaları. İzinler ilk kapıdır; ayrıca her istekte hastayla tedavi ilişkisi
 * (veya denetim yetkisi ya da acil erişim) serviste denetlenir.
 */
@Controller()
export class MuayenelerController {
  constructor(private readonly muayeneler: MuayenelerService) {}

  @Post('muayeneler')
  @IzinGerekli('tibbi.kayit.yaz')
  olustur(@KimlikBilgisi() kimlik: Kimlik, @Yetki() yetki: YetkiBaglami, @Body(new ZodPipe(muayeneOlusturSemasi)) govde: { randevuId: string }, @Req() istek: Request) {
    return this.muayeneler.olustur(kimlik, yetki, govde.randevuId, istemciIp(istek));
  }

  @Get('muayeneler/:id')
  @HerhangiIzin('tibbi.kayit.goruntule', 'tibbi.kayit.denetim')
  getir(@KimlikBilgisi() kimlik: Kimlik, @Yetki() yetki: YetkiBaglami, @Id() id: string, @Req() istek: Request) {
    return this.muayeneler.getir(kimlik, yetki, id, istemciIp(istek));
  }

  @Patch('muayeneler/:id')
  @IzinGerekli('tibbi.kayit.yaz')
  guncelle(@KimlikBilgisi() kimlik: Kimlik, @Yetki() yetki: YetkiBaglami, @Id() id: string, @Body(new ZodPipe(muayeneGuncelleSemasi)) govde: MuayeneGuncelleIstegi, @Req() istek: Request) {
    return this.muayeneler.guncelle(kimlik, yetki, id, govde, istemciIp(istek));
  }

  @Post('muayeneler/:id/imzala')
  @IzinGerekli('tani.koy')
  imzala(@KimlikBilgisi() kimlik: Kimlik, @Yetki() yetki: YetkiBaglami, @Id() id: string, @Body(new ZodPipe(imzaSemasi)) govde: { parola: string }, @Req() istek: Request) {
    return this.muayeneler.imzala(kimlik, yetki, id, govde.parola, istemciIp(istek));
  }

  @Post('muayeneler/:id/ek-not')
  @IzinGerekli('tibbi.kayit.yaz')
  ekNot(@KimlikBilgisi() kimlik: Kimlik, @Yetki() yetki: YetkiBaglami, @Id() id: string, @Body(new ZodPipe(ekNotSemasi)) govde: { metin: string }, @Req() istek: Request) {
    return this.muayeneler.ekNot(kimlik, yetki, id, govde.metin, istemciIp(istek));
  }

  @Get('hastalar/:id/muayeneler')
  @HerhangiIzin('tibbi.kayit.goruntule', 'tibbi.kayit.denetim')
  gecmis(@KimlikBilgisi() kimlik: Kimlik, @Yetki() yetki: YetkiBaglami, @Id() id: string, @Req() istek: Request) {
    return this.muayeneler.hastaGecmisi(kimlik, yetki, id, istemciIp(istek));
  }

  @Post('hastalar/:id/acil-erisim')
  @IzinGerekli('tibbi.kayit.goruntule')
  acilErisim(@KimlikBilgisi() kimlik: Kimlik, @Yetki() yetki: YetkiBaglami, @Id() id: string, @Body(new ZodPipe(acilErisimSemasi)) govde: AcilErisimIstegi, @Req() istek: Request) {
    return this.muayeneler.acilErisim(kimlik, yetki, id, govde, istemciIp(istek));
  }

  @Get('icd10')
  @IzinGerekli('tani.koy')
  icd10(@Query('q', new DefaultValuePipe('')) q: string) {
    return this.muayeneler.icd10Ara(String(q).slice(0, 50));
  }
}
