import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ZodPipe } from '../ortak/dogrulama';
import { istemciIp, IzinGerekli, type Kimlik, KimlikBilgisi, Yetki, type YetkiBaglami } from '../yetki/baglam';
import {
  type DurumIstegi,
  durumSemasi,
  type KaynakIstegi,
  kaynakSemasi,
  type RandevuIstegi,
  randevuSemasi,
  tarihSemasi,
  type TasiIstegi,
  tasiSemasi,
} from './randevular.dto';
import { RandevularService } from './randevular.service';

/** Tüm uç noktalar şube bağlamında çalışır (x-sube-id). */
@Controller()
export class RandevularController {
  constructor(private readonly randevular: RandevularService) {}

  @Get('kaynaklar')
  @IzinGerekli('randevu.goruntule')
  kaynaklar(@KimlikBilgisi() kimlik: Kimlik, @Yetki() yetki: YetkiBaglami) {
    return this.randevular.kaynaklariListele(kimlik, yetki);
  }

  @Post('kaynaklar')
  @IzinGerekli('ayar.yonet')
  kaynakEkle(@KimlikBilgisi() kimlik: Kimlik, @Yetki() yetki: YetkiBaglami, @Body(new ZodPipe(kaynakSemasi)) govde: KaynakIstegi, @Req() istek: Request) {
    return this.randevular.kaynakEkle(kimlik, yetki, govde, istemciIp(istek));
  }

  @Get('randevular/takvim')
  @IzinGerekli('randevu.goruntule')
  takvim(@KimlikBilgisi() kimlik: Kimlik, @Yetki() yetki: YetkiBaglami, @Query('tarih', new ZodPipe(tarihSemasi)) tarih: string) {
    return this.randevular.takvim(kimlik, yetki, tarih);
  }

  @Post('randevular')
  @IzinGerekli('randevu.yonet')
  olustur(@KimlikBilgisi() kimlik: Kimlik, @Yetki() yetki: YetkiBaglami, @Body(new ZodPipe(randevuSemasi)) govde: RandevuIstegi, @Req() istek: Request) {
    return this.randevular.olustur(kimlik, yetki, govde, istemciIp(istek));
  }

  /** Gereken izin hedef duruma göre değişir; serviste denetlenir. */
  @Post('randevular/:id/durum')
  @IzinGerekli('randevu.goruntule')
  durum(@KimlikBilgisi() kimlik: Kimlik, @Yetki() yetki: YetkiBaglami, @Param('id', new ParseUUIDPipe()) id: string, @Body(new ZodPipe(durumSemasi)) govde: DurumIstegi, @Req() istek: Request) {
    return this.randevular.durumDegistir(kimlik, yetki, id, govde, istemciIp(istek));
  }

  @Post('randevular/:id/tasi')
  @IzinGerekli('randevu.yonet')
  tasi(@KimlikBilgisi() kimlik: Kimlik, @Yetki() yetki: YetkiBaglami, @Param('id', new ParseUUIDPipe()) id: string, @Body(new ZodPipe(tasiSemasi)) govde: TasiIstegi, @Req() istek: Request) {
    return this.randevular.tasi(kimlik, yetki, id, govde, istemciIp(istek));
  }
}
