import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ZodPipe } from '../ortak/dogrulama';
import { HerhangiIzin, istemciIp, IzinGerekli, type Kimlik, KimlikBilgisi, Yetki, type YetkiBaglami } from '../yetki/baglam';
import { type KullaniciOlusturIstegi, kullaniciOlusturSemasi, type RolAtaIstegi, rolAtaSemasi } from './kullanicilar.dto';
import { KullanicilarService } from './kullanicilar.service';

@Controller()
export class KullanicilarController {
  constructor(private readonly kullanicilar: KullanicilarService) {}

  @Get('ben')
  ben(@KimlikBilgisi() kimlik: Kimlik, @Yetki() yetki: YetkiBaglami) {
    return this.kullanicilar.ben(kimlik, yetki);
  }

  /** Rol atayabilen herkes (idari yönetici, mesul müdür, sahip) kullanıcıları görebilir. */
  @Get('kullanicilar')
  @HerhangiIzin('kullanici.yonet', 'yetki.saglik.onayla', 'mesul.mudur.ata')
  listele(@KimlikBilgisi() kimlik: Kimlik) {
    return this.kullanicilar.listele(kimlik);
  }

  @Post('kullanicilar')
  @IzinGerekli('kullanici.yonet')
  olustur(@KimlikBilgisi() kimlik: Kimlik, @Body(new ZodPipe(kullaniciOlusturSemasi)) govde: KullaniciOlusturIstegi, @Req() istek: Request) {
    return this.kullanicilar.olustur(kimlik, govde, istemciIp(istek));
  }

  /** Hangi izin gerektiği role göre değişir; kontrol serviste yapılır. */
  @Post('kullanicilar/:id/roller')
  rolAta(
    @KimlikBilgisi() kimlik: Kimlik,
    @Param('id', new ParseUUIDPipe()) hedefId: string,
    @Body(new ZodPipe(rolAtaSemasi)) govde: RolAtaIstegi,
    @Req() istek: Request,
  ) {
    return this.kullanicilar.rolAta(kimlik, hedefId, govde, istemciIp(istek));
  }
}
