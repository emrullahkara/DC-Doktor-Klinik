import { Body, Controller, DefaultValuePipe, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ZodPipe } from '../ortak/dogrulama';
import { istemciIp, IzinGerekli, type Kimlik, KimlikBilgisi, Yetki, type YetkiBaglami } from '../yetki/baglam';
import {
  type HastaGuncelleIstegi,
  hastaGuncelleSemasi,
  type HastaOlusturIstegi,
  hastaOlusturSemasi,
  type HayvanIstegi,
  hayvanSemasi,
  type RizaIstegi,
  rizaSemasi,
  type UyariIstegi,
  uyariSemasi,
} from './hastalar.dto';
import { HastalarService } from './hastalar.service';

const Id = () => Param('id', new ParseUUIDPipe());

@Controller('hastalar')
export class HastalarController {
  constructor(private readonly hastalar: HastalarService) {}

  @Get()
  @IzinGerekli('hasta.demografik.goruntule')
  ara(@KimlikBilgisi() kimlik: Kimlik, @Yetki() yetki: YetkiBaglami, @Query('q', new DefaultValuePipe('')) q: string, @Req() istek: Request) {
    return this.hastalar.ara(kimlik, yetki, String(q).slice(0, 100), istemciIp(istek));
  }

  @Post()
  @IzinGerekli('hasta.kaydet')
  olustur(@KimlikBilgisi() kimlik: Kimlik, @Yetki() yetki: YetkiBaglami, @Body(new ZodPipe(hastaOlusturSemasi)) govde: HastaOlusturIstegi, @Req() istek: Request) {
    return this.hastalar.olustur(kimlik, yetki, govde, istemciIp(istek));
  }

  @Get(':id')
  @IzinGerekli('hasta.demografik.goruntule')
  kart(@KimlikBilgisi() kimlik: Kimlik, @Yetki() yetki: YetkiBaglami, @Id() id: string, @Req() istek: Request) {
    return this.hastalar.kart(kimlik, yetki, id, istemciIp(istek));
  }

  @Patch(':id')
  @IzinGerekli('hasta.kaydet')
  guncelle(@KimlikBilgisi() kimlik: Kimlik, @Yetki() yetki: YetkiBaglami, @Id() id: string, @Body(new ZodPipe(hastaGuncelleSemasi)) govde: HastaGuncelleIstegi, @Req() istek: Request) {
    return this.hastalar.guncelle(kimlik, yetki, id, govde, istemciIp(istek));
  }

  @Get(':id/kimlik-no')
  @IzinGerekli('hasta.kaydet')
  kimlikNo(@KimlikBilgisi() kimlik: Kimlik, @Yetki() yetki: YetkiBaglami, @Id() id: string, @Req() istek: Request) {
    return this.hastalar.kimlikNoGoster(kimlik, yetki, id, istemciIp(istek));
  }

  @Post(':id/rizalar')
  @IzinGerekli('hasta.kaydet')
  riza(@KimlikBilgisi() kimlik: Kimlik, @Yetki() yetki: YetkiBaglami, @Id() id: string, @Body(new ZodPipe(rizaSemasi)) govde: RizaIstegi, @Req() istek: Request) {
    return this.hastalar.rizaKaydet(kimlik, yetki, id, govde, istemciIp(istek));
  }

  /** Gereken izin uyarının türüne göre değişir (klinik uyarıyı yalnızca sağlık personeli ekler); serviste denetlenir. */
  @Post(':id/uyarilar')
  @IzinGerekli('hasta.demografik.goruntule')
  uyariEkle(@KimlikBilgisi() kimlik: Kimlik, @Yetki() yetki: YetkiBaglami, @Id() id: string, @Body(new ZodPipe(uyariSemasi)) govde: UyariIstegi, @Req() istek: Request) {
    return this.hastalar.uyariEkle(kimlik, yetki, id, govde, istemciIp(istek));
  }

  @Post(':id/uyarilar/:uyariId/kaldir')
  @IzinGerekli('hasta.demografik.goruntule')
  uyariKaldir(@KimlikBilgisi() kimlik: Kimlik, @Yetki() yetki: YetkiBaglami, @Id() id: string, @Param('uyariId', new ParseUUIDPipe()) uyariId: string, @Req() istek: Request) {
    return this.hastalar.uyariKaldir(kimlik, yetki, id, uyariId, istemciIp(istek));
  }

  @Post(':id/hayvanlar')
  @IzinGerekli('hasta.kaydet')
  hayvanEkle(@KimlikBilgisi() kimlik: Kimlik, @Yetki() yetki: YetkiBaglami, @Id() id: string, @Body(new ZodPipe(hayvanSemasi)) govde: HayvanIstegi, @Req() istek: Request) {
    return this.hastalar.hayvanEkle(kimlik, yetki, id, govde, istemciIp(istek));
  }
}
