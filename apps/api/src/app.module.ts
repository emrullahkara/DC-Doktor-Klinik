import { type DynamicModule, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AYARLAR, type Ayarlar } from './ayarlar';
import { BelgelerController } from './belgeler/belgeler.controller';
import { BelgelerService } from './belgeler/belgeler.service';
import { VeritabaniService } from './db/veritabani.service';
import { DenetimController } from './denetim/denetim.controller';
import { DenetimService } from './denetim/denetim.service';
import { FinansController } from './finans/finans.controller';
import { FinansService } from './finans/finans.service';
import { KomutaController } from './komuta/komuta.controller';
import { KomutaService } from './komuta/komuta.service';
import { HastalarController } from './hastalar/hastalar.controller';
import { HastalarService } from './hastalar/hastalar.service';
import { KimlikController } from './kimlik/kimlik.controller';
import { KimlikService } from './kimlik/kimlik.service';
import { KullanicilarController } from './kullanicilar/kullanicilar.controller';
import { KullanicilarService } from './kullanicilar/kullanicilar.service';
import { KurumTipleriController } from './kurum-tipleri/kurum-tipleri.controller';
import { MuayenelerController } from './muayeneler/muayeneler.controller';
import { MuayenelerService } from './muayeneler/muayeneler.service';
import { AlanSifrelemeService } from './ortak/alan-sifreleme.service';
import { RandevularController } from './randevular/randevular.controller';
import { RandevularService } from './randevular/randevular.service';
import { ErisimGuard } from './yetki/erisim.guard';
import { YetkiService } from './yetki/yetki.service';

@Module({})
export class AppModule {
  static kur(ayarlar: Ayarlar): DynamicModule {
    return {
      module: AppModule,
      imports: [JwtModule.register({ secret: ayarlar.jwtGizli, signOptions: { expiresIn: '8h' } })],
      controllers: [KimlikController, KullanicilarController, KurumTipleriController, DenetimController, HastalarController, RandevularController, MuayenelerController, FinansController, KomutaController, BelgelerController],
      providers: [
        { provide: AYARLAR, useValue: ayarlar },
        VeritabaniService,
        DenetimService,
        YetkiService,
        KimlikService,
        KullanicilarService,
        AlanSifrelemeService,
        HastalarService,
        RandevularService,
        MuayenelerService,
        FinansService,
        KomutaService,
        BelgelerService,
        { provide: APP_GUARD, useClass: ErisimGuard },
      ],
    };
  }
}
