import { Controller, DefaultValuePipe, Get, ParseIntPipe, Query } from '@nestjs/common';
import { VeritabaniService } from '../db/veritabani.service';
import { IzinGerekli, type Kimlik, KimlikBilgisi } from '../yetki/baglam';
import { DenetimService } from './denetim.service';

@Controller('denetim-izi')
export class DenetimController {
  constructor(
    private readonly db: VeritabaniService,
    private readonly denetim: DenetimService,
  ) {}

  @Get()
  @IzinGerekli('denetim.goruntule')
  listele(@KimlikBilgisi() kimlik: Kimlik, @Query('adet', new DefaultValuePipe(50), ParseIntPipe) adet: number) {
    return this.db.kiraciIslemi(kimlik, (tx) => this.denetim.sonKayitlar(tx, Math.min(Math.max(adet, 1), 500)));
  }
}
