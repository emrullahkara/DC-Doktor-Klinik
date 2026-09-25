import { Controller, Get } from '@nestjs/common';
import { type Kimlik, KimlikBilgisi, Yetki, type YetkiBaglami } from '../yetki/baglam';
import { AlarmlarService } from './alarmlar.service';

@Controller()
export class AlarmlarController {
  constructor(private readonly alarmlar: AlarmlarService) {}

  /** Her kullanıcı kendi görebileceği alarmları alır (eskalasyon kuralı serviste). */
  @Get('alarmlar')
  liste(@KimlikBilgisi() kimlik: Kimlik, @Yetki() yetki: YetkiBaglami) {
    return this.alarmlar.liste(kimlik, yetki);
  }
}
