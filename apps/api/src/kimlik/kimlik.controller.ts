import { Body, Controller, HttpCode, Inject, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AYARLAR, type Ayarlar } from '../ayarlar';
import { DenemeSiniriService } from '../ortak/deneme-siniri.service';
import { ApiHatasi, ZodPipe } from '../ortak/dogrulama';
import { Acik, istemciIp, OTURUM_CEREZI } from '../yetki/baglam';
import { type GirisIstegi, girisSemasi, type KayitIstegi, kayitSemasi } from './kimlik.dto';
import { KimlikService, type OturumYaniti } from './kimlik.service';

const OTURUM_SURESI_MS = 8 * 60 * 60 * 1000;
const DAKIKA = 60_000;
/** Başarısız giriş: aynı e-postaya 15 dakikada 5, aynı IP'den 15 dakikada 30 deneme */
const GIRIS_EPOSTA_SINIRI = 5;
const GIRIS_IP_SINIRI = 30;
const GIRIS_PENCERESI = 15 * DAKIKA;
/** Kurum kaydı: aynı IP'den saatte 5 (KAYIT_SINIRI ile değiştirilebilir) */
const KAYIT_IP_SINIRI = 5;
const KAYIT_PENCERESI = 60 * DAKIKA;

@Controller('kimlik')
export class KimlikController {
  constructor(
    private readonly kimlik: KimlikService,
    private readonly sinir: DenemeSiniriService,
    @Inject(AYARLAR) private readonly ayarlar: Ayarlar,
  ) {}

  /** Yeni kurum kaydı (kayıt sihirbazının sonucu). */
  @Acik()
  @Post('kayit')
  async kayit(@Body(new ZodPipe(kayitSemasi)) govde: KayitIstegi, @Req() istek: Request, @Res({ passthrough: true }) yanit: Response) {
    const ipAnahtari = `kayit:${istemciIp(istek) ?? '?'}`;
    this.sinir.kontrol(ipAnahtari, this.ayarlar.kayitSiniri ?? KAYIT_IP_SINIRI);
    this.sinir.artir(ipAnahtari, KAYIT_PENCERESI);
    return this.oturumCereziYaz(yanit, await this.kimlik.kayit(govde, istemciIp(istek)));
  }

  @Acik()
  @Post('giris')
  @HttpCode(200)
  async giris(@Body(new ZodPipe(girisSemasi)) govde: GirisIstegi, @Req() istek: Request, @Res({ passthrough: true }) yanit: Response) {
    const ipAnahtari = `giris-ip:${istemciIp(istek) ?? '?'}`;
    const epostaAnahtari = `giris-eposta:${govde.eposta.toLowerCase()}`;
    this.sinir.kontrol(ipAnahtari, GIRIS_IP_SINIRI);
    this.sinir.kontrol(epostaAnahtari, GIRIS_EPOSTA_SINIRI);
    try {
      const oturum = await this.kimlik.giris(govde, istemciIp(istek));
      this.sinir.sifirla(epostaAnahtari);
      return this.oturumCereziYaz(yanit, oturum);
    } catch (hata) {
      if (hata instanceof ApiHatasi && hata.getStatus() === 401) {
        this.sinir.artir(ipAnahtari, GIRIS_PENCERESI);
        this.sinir.artir(epostaAnahtari, GIRIS_PENCERESI);
      }
      throw hata;
    }
  }

  @Acik()
  @Post('cikis')
  @HttpCode(204)
  cikis(@Res({ passthrough: true }) yanit: Response): void {
    yanit.clearCookie(OTURUM_CEREZI, this.cerezSecenekleri());
  }

  /**
   * Tarayıcı için oturum anahtarı httpOnly çerezde tutulur: sayfadaki betikler okuyamaz.
   * SameSite=Strict, başka sitelerden gelen isteklerde çerezin gönderilmesini engeller.
   */
  private oturumCereziYaz(yanit: Response, oturum: OturumYaniti): OturumYaniti {
    yanit.cookie(OTURUM_CEREZI, oturum.token, { ...this.cerezSecenekleri(), maxAge: OTURUM_SURESI_MS });
    return oturum;
  }

  private cerezSecenekleri() {
    return { httpOnly: true, sameSite: 'strict' as const, secure: this.ayarlar.guvenliCerez, path: '/' };
  }
}
