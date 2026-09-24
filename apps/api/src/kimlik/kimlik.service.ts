import { randomUUID } from 'node:crypto';
import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hash, verify } from '@node-rs/argon2';
import { HEKIM_MESLEKLERI, KURUM_TIPLERI, type KurumTipi, type Meslek, type RolKodu, subelereAyir } from '@dc/shared';
import { VeritabaniService } from '../db/veritabani.service';
import { isletmeler, kullanicilar, rolAtamalari, subeler } from '../db/sema';
import { DenetimService } from '../denetim/denetim.service';
import { ApiHatasi, benzersizlikIhlaliMi } from '../ortak/dogrulama';
import type { TokenIcerigi } from '../yetki/erisim.guard';
import type { GirisIstegi, KayitIstegi } from './kimlik.dto';

export interface OturumYaniti {
  token: string;
  kullaniciId: string;
  isletmeId: string;
}

/** Bulunamayan kullanıcıda da aynı sürede cevap vermek için (kullanıcı varlığı sızmasın). */
const SAHTE_OZET = hash('dc-doktor-klinik-sahte-parola');

export function parolaOzeti(parola: string): Promise<string> {
  return hash(parola);
}

@Injectable()
export class KimlikService {
  constructor(
    private readonly db: VeritabaniService,
    private readonly jwt: JwtService,
    private readonly denetim: DenetimService,
  ) {}

  /**
   * Yeni kurum kaydı: işletme, şube(ler), sahip kullanıcı ve rolleri tek işlemde oluşturulur.
   * Veteriner ve insan sağlığı birlikte seçildiyse iki ayrı şube açılır.
   * Sahip hekimse, mesleğine uygun şubede mesul müdür ve hekim rolü de verilir.
   */
  async kayit(istek: KayitIstegi, ip: string | null): Promise<OturumYaniti> {
    const isletmeId = randomUUID();
    const ozet = await parolaOzeti(istek.sahip.parola);
    const gruplar = subelereAyir(istek.kurumTipleri);

    try {
      const kullaniciId = await this.db.kiraciIslemi({ isletmeId }, async (tx) => {
        await tx.insert(isletmeler).values({ id: isletmeId, unvan: istek.kurum.unvan, vergiNo: istek.kurum.vergiNo ?? null });
        const olusanSubeler = await tx
          .insert(subeler)
          .values(
            gruplar.map((tipler) => ({
              isletmeId,
              kurumTipleri: tipler,
              ad: gruplar.length > 1 && !KURUM_TIPLERI[tipler[0]!].insanSagligi ? `${istek.sube.ad} (Veteriner)` : istek.sube.ad,
            })),
          )
          .returning({ id: subeler.id, kurumTipleri: subeler.kurumTipleri });

        const [sahip] = await tx
          .insert(kullanicilar)
          .values({ isletmeId, eposta: istek.sahip.eposta, adSoyad: istek.sahip.adSoyad, meslek: istek.sahip.meslek, parolaOzeti: ozet })
          .returning({ id: kullanicilar.id });

        const roller: { rolKodu: RolKodu; subeId: string | null }[] = [{ rolKodu: 'kurum_sahibi', subeId: null }];
        for (const sube of olusanSubeler) {
          if (sahipBuSubedeHekimOlabilir(istek.sahip.meslek, sube.kurumTipleri as KurumTipi[])) {
            roller.push({ rolKodu: 'mesul_mudur', subeId: sube.id }, { rolKodu: 'hekim', subeId: sube.id });
          }
        }
        await tx.insert(rolAtamalari).values(roller.map((r) => ({ ...r, isletmeId, kullaniciId: sahip!.id, atayanId: sahip!.id })));

        await this.denetim.kaydet(tx, {
          isletmeId,
          kullaniciId: sahip!.id,
          eylem: 'kurum.kayit',
          varlikTipi: 'isletme',
          varlikId: isletmeId,
          ip,
          ayrinti: { kurumTipleri: istek.kurumTipleri, subeSayisi: olusanSubeler.length, roller: roller.map((r) => r.rolKodu) },
        });
        return sahip!.id;
      });
      return this.oturumAc(kullaniciId, isletmeId);
    } catch (hata) {
      if (benzersizlikIhlaliMi(hata)) {
        throw new ApiHatasi(HttpStatus.CONFLICT, 'EPOSTA_KULLANIMDA', 'Bu e-posta adresiyle kayıtlı bir kullanıcı var.');
      }
      throw hata;
    }
  }

  async giris(istek: GirisIstegi, ip: string | null): Promise<OturumYaniti> {
    const bilgi = await this.db.girisBilgisi(istek.eposta);
    const parolaDogru = await verify(bilgi?.parolaOzeti ?? (await SAHTE_OZET), istek.parola);

    if (bilgi) {
      await this.db.kiraciIslemi({ isletmeId: bilgi.isletmeId, kullaniciId: bilgi.id }, (tx) =>
        this.denetim.kaydet(tx, {
          isletmeId: bilgi.isletmeId,
          kullaniciId: bilgi.id,
          eylem: parolaDogru && bilgi.aktif ? 'giris.basarili' : 'giris.basarisiz',
          ip,
        }),
      );
    }
    if (!bilgi || !parolaDogru || !bilgi.aktif) {
      throw new ApiHatasi(HttpStatus.UNAUTHORIZED, 'GIRIS_BASARISIZ', 'E-posta veya parola hatalı.');
    }
    return this.oturumAc(bilgi.id, bilgi.isletmeId);
  }

  private async oturumAc(kullaniciId: string, isletmeId: string): Promise<OturumYaniti> {
    const icerik: TokenIcerigi = { sub: kullaniciId, isl: isletmeId };
    return { token: await this.jwt.signAsync(icerik), kullaniciId, isletmeId };
  }
}

/**
 * Hekim ve diş hekimi insan sağlığı şubesinde, veteriner hekim veteriner şubesinde
 * mesul müdür ve hekim olabilir.
 */
function sahipBuSubedeHekimOlabilir(meslek: Meslek, tipler: KurumTipi[]): boolean {
  if (!HEKIM_MESLEKLERI.has(meslek)) return false;
  const insanSagligi = tipler.some((t) => KURUM_TIPLERI[t].insanSagligi);
  return meslek === 'veteriner_hekim' ? !insanSagligi : insanSagligi;
}
