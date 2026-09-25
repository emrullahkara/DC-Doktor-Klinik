import { Injectable } from '@nestjs/common';
import {
  askidakiIzinler,
  type AskiyaAlma,
  etkinIzinler,
  type Izin,
  KURUM_SAAT_DILIMI,
  meslekMi,
  type Meslek,
  PERSONEL_BELGE_TURLERI,
  rolKoduMu,
  type RolAtamasi,
} from '@dc/shared';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { Islem } from '../db/veritabani.service';
import { belgeler, kullanicilar, rolAtamalari } from '../db/sema';

export interface KullaniciYetkiVerisi {
  aktif: boolean;
  meslek: Meslek;
  atamalar: RolAtamasi[];
  /** Süresi geçmiş zorunlu belge nedeniyle askıya alınan izinler */
  askilar: AskiyaAlma[];
}

/** İzin askıya alabilen belge türleri (ör. malpraktis sigortası) */
const ASKIYA_ALAN_TURLER = Object.entries(PERSONEL_BELGE_TURLERI)
  .filter(([, t]) => 'askiyaAlir' in t)
  .map(([k]) => k);

@Injectable()
export class YetkiService {
  /** Kullanıcının mesleğini, rol atamalarını ve belge kaynaklı askıları yükler (kiracı işlemi içinde). */
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

    const belgeSatirlari = await tx
      .select({ tur: belgeler.tur, bitis: belgeler.bitis, bugun: sql<string>`(now() AT TIME ZONE ${KURUM_SAAT_DILIMI})::date::text` })
      .from(belgeler)
      .where(and(eq(belgeler.kullaniciId, kullaniciId), isNull(belgeler.kaldirmaZamani), inArray(belgeler.tur, ASKIYA_ALAN_TURLER)));
    const askilar = belgeSatirlari.length ? askidakiIzinler(belgeSatirlari, belgeSatirlari[0]!.bugun) : [];

    return { aktif: kullanici.aktif, meslek: kullanici.meslek, atamalar, askilar };
  }

  /** Rollerden gelen izinler, eksi süresi geçmiş belge nedeniyle askıya alınanlar. */
  izinler(veri: KullaniciYetkiVerisi, subeId: string | null): Set<Izin> {
    const izinler = etkinIzinler(veri.atamalar, veri.meslek, subeId);
    for (const a of veri.askilar) izinler.delete(a.izin);
    return izinler;
  }
}
