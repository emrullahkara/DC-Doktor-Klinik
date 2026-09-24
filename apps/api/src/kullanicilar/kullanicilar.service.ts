import { HttpStatus, Injectable } from '@nestjs/common';
import { atamaIcinGerekenIzin, etkinIzinler, meslekMi, ROLLER, rolAtanabilirMi, rolAtayabilirMi, rolKoduMu } from '@dc/shared';
import { asc, eq } from 'drizzle-orm';
import { VeritabaniService } from '../db/veritabani.service';
import { kullanicilar, rolAtamalari, subeler } from '../db/sema';
import { DenetimService } from '../denetim/denetim.service';
import { parolaOzeti } from '../kimlik/kimlik.service';
import { ApiHatasi, benzersizlikIhlaliMi } from '../ortak/dogrulama';
import type { Kimlik, YetkiBaglami } from '../yetki/baglam';
import { YetkiService } from '../yetki/yetki.service';
import type { KullaniciOlusturIstegi, RolAtaIstegi } from './kullanicilar.dto';

@Injectable()
export class KullanicilarService {
  constructor(
    private readonly db: VeritabaniService,
    private readonly yetki: YetkiService,
    private readonly denetim: DenetimService,
  ) {}

  /** Oturumdaki kullanıcı: kimlik, şubeler, roller ve istenen şube bağlamındaki izinler. */
  async ben(kimlik: Kimlik, yetki: YetkiBaglami) {
    return this.db.kiraciIslemi(kimlik, async (tx) => {
      const [kullanici] = await tx
        .select({ id: kullanicilar.id, eposta: kullanicilar.eposta, adSoyad: kullanicilar.adSoyad, meslek: kullanicilar.meslek })
        .from(kullanicilar)
        .where(eq(kullanicilar.id, kimlik.kullaniciId));
      const tumSubeler = await tx
        .select({ id: subeler.id, ad: subeler.ad, kurumTipleri: subeler.kurumTipleri })
        .from(subeler)
        .orderBy(asc(subeler.olusturmaZamani));
      const roller = await tx
        .select({ rolKodu: rolAtamalari.rolKodu, subeId: rolAtamalari.subeId })
        .from(rolAtamalari)
        .where(eq(rolAtamalari.kullaniciId, kimlik.kullaniciId));
      return {
        kullanici,
        subeler: tumSubeler,
        roller: roller.map((r) => ({ ...r, ad: rolKoduMu(r.rolKodu) ? ROLLER[r.rolKodu].ad : r.rolKodu })),
        subeBaglami: yetki.subeId,
        izinler: [...yetki.izinler].sort(),
      };
    });
  }

  async listele(kimlik: Kimlik) {
    return this.db.kiraciIslemi(kimlik, async (tx) => {
      const liste = await tx
        .select({ id: kullanicilar.id, eposta: kullanicilar.eposta, adSoyad: kullanicilar.adSoyad, meslek: kullanicilar.meslek, aktif: kullanicilar.aktif })
        .from(kullanicilar)
        .orderBy(asc(kullanicilar.adSoyad));
      const atamalar = await tx.select({ kullaniciId: rolAtamalari.kullaniciId, rolKodu: rolAtamalari.rolKodu, subeId: rolAtamalari.subeId }).from(rolAtamalari);
      return liste.map((k) => ({ ...k, roller: atamalar.filter((a) => a.kullaniciId === k.id).map(({ rolKodu, subeId }) => ({ rolKodu, subeId })) }));
    });
  }

  async olustur(kimlik: Kimlik, istek: KullaniciOlusturIstegi, ip: string | null) {
    const ozet = await parolaOzeti(istek.geciciParola);
    try {
      return await this.db.kiraciIslemi(kimlik, async (tx) => {
        const [yeni] = await tx
          .insert(kullanicilar)
          .values({ isletmeId: kimlik.isletmeId, eposta: istek.eposta, adSoyad: istek.adSoyad, meslek: istek.meslek, parolaOzeti: ozet })
          .returning({ id: kullanicilar.id, eposta: kullanicilar.eposta, adSoyad: kullanicilar.adSoyad, meslek: kullanicilar.meslek });
        await this.denetim.kaydet(tx, { ...kimlik, eylem: 'kullanici.olusturuldu', varlikTipi: 'kullanici', varlikId: yeni!.id, ip, ayrinti: { meslek: istek.meslek } });
        return yeni!;
      });
    } catch (hata) {
      if (benzersizlikIhlaliMi(hata)) {
        throw new ApiHatasi(HttpStatus.CONFLICT, 'EPOSTA_KULLANIMDA', 'Bu e-posta adresiyle kayıtlı bir kullanıcı var.');
      }
      throw hata;
    }
  }

  /**
   * Rol atama kuralları:
   *  - Kimse kendine rol atayamaz (görevler ayrılığı).
   *  - Rol, hedef kişinin mesleğine uygun olmalıdır (kilitli yasal kural).
   *  - Atayan, atamanın yapıldığı kapsamda gereken izne sahip olmalıdır
   *    (mesul müdür → mesul.mudur.ata, sağlık rolleri → yetki.saglik.onayla, diğerleri → kullanici.yonet);
   *    istisna için bkz. rolAtayabilirMi.
   */
  async rolAta(kimlik: Kimlik, hedefId: string, istek: RolAtaIstegi, ip: string | null) {
    if (hedefId === kimlik.kullaniciId) {
      throw new ApiHatasi(HttpStatus.FORBIDDEN, 'KENDI_YETKISI', 'Kendinize rol atayamazsınız; başka bir yetkili atamalıdır.');
    }
    try {
      return await this.db.kiraciIslemi(kimlik, async (tx) => {
        const [hedef] = await tx.select({ meslek: kullanicilar.meslek }).from(kullanicilar).where(eq(kullanicilar.id, hedefId));
        if (!hedef || !meslekMi(hedef.meslek)) throw new ApiHatasi(HttpStatus.NOT_FOUND, 'KULLANICI_BULUNAMADI', 'Kullanıcı bulunamadı.');

        if (istek.subeId) {
          const [sube] = await tx.select({ id: subeler.id }).from(subeler).where(eq(subeler.id, istek.subeId));
          if (!sube) throw new ApiHatasi(HttpStatus.NOT_FOUND, 'SUBE_BULUNAMADI', 'Şube bulunamadı.');
        }

        const uygunluk = rolAtanabilirMi(istek.rolKodu, hedef.meslek);
        if (!uygunluk.uygun) throw new ApiHatasi(HttpStatus.UNPROCESSABLE_ENTITY, uygunluk.neden, uygunluk.mesaj);

        const atayan = await this.yetki.yukle(tx, kimlik.kullaniciId);
        const hedefVerisi = await this.yetki.yukle(tx, hedefId);
        const { uygun, gereken } = atayan
          ? rolAtayabilirMi(istek.rolKodu, etkinIzinler(atayan.atamalar, atayan.meslek, istek.subeId), hedefVerisi?.atamalar ?? [], istek.subeId)
          : { uygun: false, gereken: atamaIcinGerekenIzin(istek.rolKodu) };
        if (!uygun) {
          await this.denetim.kaydet(tx, { ...kimlik, eylem: 'rol.atama.reddedildi', varlikTipi: 'kullanici', varlikId: hedefId, subeId: istek.subeId, ip, ayrinti: { rolKodu: istek.rolKodu, gerekenIzin: gereken } });
          return { reddedildi: gereken };
        }

        const [atama] = await tx
          .insert(rolAtamalari)
          .values({ isletmeId: kimlik.isletmeId, kullaniciId: hedefId, rolKodu: istek.rolKodu, subeId: istek.subeId, atayanId: kimlik.kullaniciId })
          .returning({ id: rolAtamalari.id, rolKodu: rolAtamalari.rolKodu, subeId: rolAtamalari.subeId });
        await this.denetim.kaydet(tx, { ...kimlik, eylem: 'rol.atandi', varlikTipi: 'kullanici', varlikId: hedefId, subeId: istek.subeId, ip, ayrinti: { rolKodu: istek.rolKodu } });
        return { atama: atama! };
      }).then((sonuc) => {
        if ('reddedildi' in sonuc) {
          throw new ApiHatasi(HttpStatus.FORBIDDEN, 'YETKI_YOK', 'Bu rolü atama yetkiniz yok.', { eksikIzinler: [sonuc.reddedildi] });
        }
        return sonuc.atama;
      });
    } catch (hata) {
      if (benzersizlikIhlaliMi(hata)) {
        throw new ApiHatasi(HttpStatus.CONFLICT, 'ROL_ZATEN_ATANMIS', 'Bu rol bu kapsamda zaten atanmış.');
      }
      throw hata;
    }
  }
}
