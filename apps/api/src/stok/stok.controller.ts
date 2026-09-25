import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { ZodPipe } from '../ortak/dogrulama';
import { HerhangiIzin, istemciIp, IzinGerekli, type Kimlik, KimlikBilgisi, Yetki, type YetkiBaglami } from '../yetki/baglam';
import { type HareketIstegi, hareketSemasi, urunGuncelleSemasi, type UrunGuncelleIstegi, type UrunIstegi, urunSemasi } from './stok.dto';
import { StokService } from './stok.service';

const Id = () => Param('id', new ParseUUIDPipe());

@Controller()
export class StokController {
  constructor(private readonly stok: StokService) {}

  /** Hemşire de hastaya kullanım kaydı için ürünleri görür. */
  @Get('urunler')
  @HerhangiIzin('stok.goruntule', 'stok.yonet', 'tibbi.kayit.yaz', 'narkotik.yonet')
  urunler(@KimlikBilgisi() kimlik: Kimlik, @Yetki() yetki: YetkiBaglami) {
    return this.stok.urunler(kimlik, yetki);
  }

  @Post('urunler')
  @IzinGerekli('stok.yonet')
  ekle(@KimlikBilgisi() kimlik: Kimlik, @Body(new ZodPipe(urunSemasi)) govde: UrunIstegi, @Req() istek: Request) {
    return this.stok.urunEkle(kimlik, govde, istemciIp(istek));
  }

  @Patch('urunler/:id')
  @IzinGerekli('stok.yonet')
  guncelle(@KimlikBilgisi() kimlik: Kimlik, @Id() id: string, @Body(new ZodPipe(urunGuncelleSemasi)) govde: UrunGuncelleIstegi, @Req() istek: Request) {
    return this.stok.urunGuncelle(kimlik, id, govde, istemciIp(istek));
  }

  @Get('stok/sahitler')
  @IzinGerekli('narkotik.yonet')
  sahitler(@KimlikBilgisi() kimlik: Kimlik) {
    return this.stok.sahitler(kimlik);
  }

  @Get('urunler/:id')
  @HerhangiIzin('stok.goruntule', 'stok.yonet', 'tibbi.kayit.yaz', 'narkotik.yonet')
  kart(@KimlikBilgisi() kimlik: Kimlik, @Yetki() yetki: YetkiBaglami, @Id() id: string) {
    return this.stok.urunKarti(kimlik, yetki, id);
  }

  /** İzin serviste: narkotik/psikotrop → narkotik sorumlusu; kullanım → stok veya tıbbi kayıt; diğerleri → stok yönetimi. */
  @Post('urunler/:id/hareketler')
  @HerhangiIzin('stok.yonet', 'tibbi.kayit.yaz', 'narkotik.yonet')
  hareket(@KimlikBilgisi() kimlik: Kimlik, @Yetki() yetki: YetkiBaglami, @Id() id: string, @Body(new ZodPipe(hareketSemasi)) govde: HareketIstegi, @Req() istek: Request) {
    return this.stok.hareket(kimlik, yetki, id, govde, istemciIp(istek));
  }

  @Get('urunler/:id/lot-izleme')
  @IzinGerekli('stok.goruntule', 'hasta.demografik.goruntule')
  lotIzleme(@KimlikBilgisi() kimlik: Kimlik, @Id() id: string, @Query('lot', new ZodPipe(z.string().trim().min(1).max(60))) lot: string, @Req() istek: Request) {
    return this.stok.lotIzleme(kimlik, id, lot, istemciIp(istek));
  }
}
