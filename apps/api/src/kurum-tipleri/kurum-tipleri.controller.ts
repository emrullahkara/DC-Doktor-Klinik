import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { CEKIRDEK_MODULLER, KURUM_TIPLERI, type KurumTipi, profilBirlestir, subelereAyir } from '@dc/shared';
import { z } from 'zod';
import { ZodPipe } from '../ortak/dogrulama';
import { Acik } from '../yetki/baglam';

const onizlemeSemasi = z.object({
  kurumTipleri: z.array(z.enum(Object.keys(KURUM_TIPLERI) as [KurumTipi, ...KurumTipi[]])).min(1, 'En az bir kurum tipi seçin.'),
});

/** Kayıt sihirbazının 1. adımı: kurum tipleri ve seçime göre hazırlanacaklar. */
@Controller('kurum-tipleri')
export class KurumTipleriController {
  @Acik()
  @Get()
  listele() {
    return {
      cekirdekModuller: CEKIRDEK_MODULLER,
      tipler: Object.entries(KURUM_TIPLERI).map(([kod, p]) => ({ kod, ad: p.ad, aciklama: p.aciklama, insanSagligi: p.insanSagligi })),
    };
  }

  @Acik()
  @Post('onizleme')
  @HttpCode(200)
  onizleme(@Body(new ZodPipe(onizlemeSemasi)) govde: z.infer<typeof onizlemeSemasi>) {
    const subeGruplari = subelereAyir(govde.kurumTipleri);
    return { ...profilBirlestir(govde.kurumTipleri), subeGruplari, ayriSubeGerekli: subeGruplari.length > 1 };
  }
}
