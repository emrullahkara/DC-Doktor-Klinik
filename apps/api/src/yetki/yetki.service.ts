import { Injectable } from '@nestjs/common';
import { etkinIzinler, type Izin, meslekMi, type Meslek, rolKoduMu, type RolAtamasi } from '@dc/shared';
import { eq } from 'drizzle-orm';
import type { Islem } from '../db/veritabani.service';
import { kullanicilar, rolAtamalari } from '../db/sema';

export interface KullaniciYetkiVerisi {
  aktif: boolean;
  meslek: Meslek;
  atamalar: RolAtamasi[];
}

@Injectable()
export class YetkiService {
  /** Kullanıcının mesleğini ve rol atamalarını yükler (kiracı işlemi içinde çağrılır). */
  async yukle(tx: Islem, kullaniciId: string): Promise<KullaniciYetkiVerisi | null> {
    const [kullanici] = await tx
      .select({ aktif: kullanicilar.aktif, meslek: kullanicilar.meslek })
      .from(kullanicilar)
      .where(eq(kullanicilar.id, kullaniciId));
    if (!kullanici || !meslekMi(kullanici.meslek)) return null;
    const satirlar = await tx
      .select({ rolKodu: rolAtamalari.rolKodu, subeId: rolAtamalari.subeId })
      .from(rolAtamalari)
      .where(eq(rolAtamalari.kullaniciId, kullaniciId));
    // Katalogda olmayan (ör. kaldırılmış) rol kodları yok sayılır.
    const atamalar = satirlar.flatMap((s) => (rolKoduMu(s.rolKodu) ? [{ rolKodu: s.rolKodu, subeId: s.subeId }] : []));
    return { aktif: kullanici.aktif, meslek: kullanici.meslek, atamalar };
  }

  izinler(veri: KullaniciYetkiVerisi, subeId: string | null): Set<Izin> {
    return etkinIzinler(veri.atamalar, veri.meslek, subeId);
  }
}
