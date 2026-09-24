import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ZodPipe } from '../ortak/dogrulama';
import { HerhangiIzin, istemciIp, IzinGerekli, type Kimlik, KimlikBilgisi, Yetki, type YetkiBaglami } from '../yetki/baglam';
import { type AyarIstegi, ayarSemasi, aySemasi, cizelgeSemasi, type GorevIstegi, gorevSemasi, type IzinIstegi, izinSemasi, type KararIstegi, kararSemasi } from './nobet.dto';
import { NobetService } from './nobet.service';

const Id = (ad = 'id') => Param(ad, new ParseUUIDPipe());

@Controller()
export class NobetController {
  constructor(private readonly nobet: NobetService) {}

  @Get('nobet/ayarlar')
  ayarlar(@KimlikBilgisi() kimlik: Kimlik) {
    return this.nobet.ayarlar(kimlik);
  }

  @Patch('nobet/ayarlar')
  @IzinGerekli('ayar.yonet')
  ayarGuncelle(@KimlikBilgisi() kimlik: Kimlik, @Body(new ZodPipe(ayarSemasi)) govde: AyarIstegi, @Req() istek: Request) {
    return this.nobet.ayarGuncelle(kimlik, govde, istemciIp(istek));
  }

  /** Yayındaki çizelgeyi şubedeki herkes görür; taslak ve onay bekleyen yalnızca planlayanlara açıktır (serviste). */
  @Get('cizelge')
  cizelge(@KimlikBilgisi() kimlik: Kimlik, @Yetki() yetki: YetkiBaglami, @Query('ay', new ZodPipe(aySemasi)) ay: string) {
    return this.nobet.cizelge(kimlik, yetki, ay);
  }

  @Post('cizelge')
  @IzinGerekli('nobet.planla')
  olustur(@KimlikBilgisi() kimlik: Kimlik, @Yetki() yetki: YetkiBaglami, @Body(new ZodPipe(cizelgeSemasi)) govde: { ay: string }, @Req() istek: Request) {
    return this.nobet.cizelgeOlustur(kimlik, yetki, govde.ay, istemciIp(istek));
  }

  @Post('cizelge/:id/gorevler')
  @IzinGerekli('nobet.planla')
  gorevEkle(@KimlikBilgisi() kimlik: Kimlik, @Id() id: string, @Body(new ZodPipe(gorevSemasi)) govde: GorevIstegi, @Req() istek: Request) {
    return this.nobet.gorevEkle(kimlik, id, govde, istemciIp(istek));
  }

  @Post('gorevler/:id/sil')
  @IzinGerekli('nobet.planla')
  gorevSil(@KimlikBilgisi() kimlik: Kimlik, @Id() id: string, @Req() istek: Request) {
    return this.nobet.gorevSil(kimlik, id, istemciIp(istek));
  }

  @Post('cizelge/:id/onaya-gonder')
  @IzinGerekli('nobet.planla')
  onayaGonder(@KimlikBilgisi() kimlik: Kimlik, @Id() id: string, @Req() istek: Request) {
    return this.nobet.onayaGonder(kimlik, id, istemciIp(istek));
  }

  @Post('cizelge/:id/karar')
  @IzinGerekli('nobet.onayla')
  karar(@KimlikBilgisi() kimlik: Kimlik, @Id() id: string, @Body(new ZodPipe(kararSemasi)) govde: KararIstegi, @Req() istek: Request) {
    return this.nobet.karar(kimlik, id, govde, istemciIp(istek));
  }

  @Post('cizelge/:id/revizyon')
  @IzinGerekli('nobet.planla')
  revizyon(@KimlikBilgisi() kimlik: Kimlik, @Id() id: string, @Req() istek: Request) {
    return this.nobet.revizyon(kimlik, id, istemciIp(istek));
  }

  @Get('gorevlerim')
  gorevlerim(@KimlikBilgisi() kimlik: Kimlik) {
    return this.nobet.gorevlerim(kimlik);
  }

  /** Kişi kendi izinlerini görür; başkasınınki için personel veya nöbet izni gerekir (serviste). */
  @Get('personel/:id/izinler')
  izinler(@KimlikBilgisi() kimlik: Kimlik, @Yetki() yetki: YetkiBaglami, @Id() id: string) {
    return this.nobet.izinler(kimlik, yetki, id);
  }

  @Post('personel/:id/izinler')
  @IzinGerekli('personel.yonet')
  izinEkle(@KimlikBilgisi() kimlik: Kimlik, @Id() id: string, @Body(new ZodPipe(izinSemasi)) govde: IzinIstegi, @Req() istek: Request) {
    return this.nobet.izinEkle(kimlik, id, govde, istemciIp(istek));
  }

  @Post('izinler/:id/iptal')
  @HerhangiIzin('personel.yonet')
  izinIptal(@KimlikBilgisi() kimlik: Kimlik, @Id() id: string, @Req() istek: Request) {
    return this.nobet.izinIptal(kimlik, id, istemciIp(istek));
  }
}
