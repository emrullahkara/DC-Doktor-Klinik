import { Controller, Get } from '@nestjs/common';
import { IzinGerekli, type Kimlik, KimlikBilgisi, Yetki, type YetkiBaglami } from '../yetki/baglam';
import { KomutaService } from './komuta.service';

@Controller('komuta')
export class KomutaController {
  constructor(private readonly komuta: KomutaService) {}

  @Get('ozet')
  @IzinGerekli('komuta.goruntule')
  ozet(@KimlikBilgisi() kimlik: Kimlik, @Yetki() yetki: YetkiBaglami) {
    return this.komuta.ozet(kimlik, yetki);
  }
}
