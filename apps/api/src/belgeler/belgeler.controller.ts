import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Req, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BELGE_DOSYA_AZAMI_BAYT } from '@dc/shared';
import type { Request, Response } from 'express';
import { ZodPipe } from '../ortak/dogrulama';
import { HerhangiIzin, istemciIp, IzinGerekli, type Kimlik, KimlikBilgisi, Yetki, type YetkiBaglami } from '../yetki/baglam';
import { type BelgeEkleIstegi, belgeEkleSemasi, kaldirSemasi, personelBilgiSemasi, type PersonelBilgiIstegi } from './belgeler.dto';
import { BelgelerService, type YuklenenDosya } from './belgeler.service';

const Id = () => Param('id', new ParseUUIDPipe());

@Controller()
export class BelgelerController {
  constructor(private readonly belgeler: BelgelerService) {}

  @Get('personel')
  @HerhangiIzin('personel.goruntule', 'personel.yonet')
  personel(@KimlikBilgisi() kimlik: Kimlik) {
    return this.belgeler.personelListesi(kimlik);
  }

  /** Kişi kendi kartını her zaman görür; başkasınınki için personel izni gerekir (serviste). */
  @Get('personel/:id')
  kart(@KimlikBilgisi() kimlik: Kimlik, @Yetki() yetki: YetkiBaglami, @Id() id: string, @Req() istek: Request) {
    return this.belgeler.personelKarti(kimlik, yetki, id, istemciIp(istek));
  }

  @Patch('personel/:id')
  @IzinGerekli('personel.yonet')
  bilgi(@KimlikBilgisi() kimlik: Kimlik, @Id() id: string, @Body(new ZodPipe(personelBilgiSemasi)) govde: PersonelBilgiIstegi, @Req() istek: Request) {
    return this.belgeler.bilgiGuncelle(kimlik, id, govde, istemciIp(istek));
  }

  /** Çok parçalı form: belge alanları + isteğe bağlı `dosya` (PDF/JPEG/PNG, ≤10 MB). İzin kapsama göre serviste. */
  @Post('belgeler')
  @HerhangiIzin('personel.yonet', 'belge.kurum.yonet')
  @UseInterceptors(FileInterceptor('dosya', { limits: { fileSize: BELGE_DOSYA_AZAMI_BAYT, files: 1, fields: 20 } }))
  ekle(
    @KimlikBilgisi() kimlik: Kimlik,
    @Yetki() yetki: YetkiBaglami,
    @Body(new ZodPipe(belgeEkleSemasi)) govde: BelgeEkleIstegi,
    @UploadedFile() dosya: YuklenenDosya | undefined,
    @Req() istek: Request,
  ) {
    return this.belgeler.belgeEkle(kimlik, yetki, govde, dosya, istemciIp(istek));
  }

  @Post('belgeler/:id/kaldir')
  @HerhangiIzin('personel.yonet', 'belge.kurum.yonet')
  kaldir(@KimlikBilgisi() kimlik: Kimlik, @Yetki() yetki: YetkiBaglami, @Id() id: string, @Body(new ZodPipe(kaldirSemasi)) govde: { neden: string }, @Req() istek: Request) {
    return this.belgeler.belgeKaldir(kimlik, yetki, id, govde.neden, istemciIp(istek));
  }

  @Get('belgeler/:id/dosya')
  async dosya(@KimlikBilgisi() kimlik: Kimlik, @Yetki() yetki: YetkiBaglami, @Id() id: string, @Req() istek: Request, @Res() yanit: Response) {
    const d = await this.belgeler.dosyaIndir(kimlik, yetki, id, istemciIp(istek));
    yanit.set({
      'Content-Type': d.icerikTuru,
      'Content-Length': String(d.icerik.length),
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(d.ad)}`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
    });
    yanit.end(d.icerik);
  }

  @Get('kurum-belgeleri')
  @HerhangiIzin('belge.kurum.yonet', 'komuta.goruntule')
  kurum(@KimlikBilgisi() kimlik: Kimlik) {
    return this.belgeler.kurumBelgeleri(kimlik);
  }

  /** Her kullanıcı kendi görebileceği alarmları alır (eskalasyon kuralı serviste). */
  @Get('alarmlar')
  alarmlar(@KimlikBilgisi() kimlik: Kimlik, @Yetki() yetki: YetkiBaglami) {
    return this.belgeler.alarmlar(kimlik, yetki);
  }
}
