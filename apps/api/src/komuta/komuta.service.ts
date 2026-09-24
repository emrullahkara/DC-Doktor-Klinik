import { Injectable } from '@nestjs/common';
import { KURUM_SAAT_DILIMI } from '@dc/shared';
import { sql } from 'drizzle-orm';
import { VeritabaniService } from '../db/veritabani.service';
import type { Kimlik, YetkiBaglami } from '../yetki/baglam';

/**
 * Komuta Merkezi göstergeleri. Yalnızca toplu sayılar döner (hasta adı veya tıbbi içerik yok);
 * şube seçiliyse o şube, değilse tüm şubeler.
 */
@Injectable()
export class KomutaService {
  constructor(private readonly db: VeritabaniService) {}

  async ozet(kimlik: Kimlik, yetki: YetkiBaglami) {
    const sube = yetki.subeId;
    const subeKosulu = (sutun: string) => (sube ? sql`AND ${sql.raw(sutun)} = ${sube}` : sql``);
    const bugun = sql`(now() AT TIME ZONE ${KURUM_SAAT_DILIMI})::date`;

    return this.db.kiraciIslemi(kimlik, async (tx) => {
      const randevu = await tx.execute<{ toplam: number; gelen: number; gelmedi: number; bekleniyor: number; salonda: number; bekleme_dk: number | null }>(sql`
        SELECT count(*) FILTER (WHERE durum <> 'iptal')::int AS toplam,
               count(*) FILTER (WHERE durum IN ('geldi', 'muayenede', 'tamamlandi'))::int AS gelen,
               count(*) FILTER (WHERE durum = 'gelmedi')::int AS gelmedi,
               count(*) FILTER (WHERE durum = 'planlandi')::int AS bekleniyor,
               count(*) FILTER (WHERE durum = 'geldi')::int AS salonda,
               round(avg(extract(epoch FROM muayene_zamani - geldi_zamani) / 60) FILTER (WHERE muayene_zamani IS NOT NULL))::int AS bekleme_dk
          FROM randevular
         WHERE (baslangic AT TIME ZONE ${KURUM_SAAT_DILIMI})::date = ${bugun} ${subeKosulu('sube_id')}`);

      const ciro = await tx.execute<{ gun: string; net: number }>(sql`
        SELECT g.gun::date::text AS gun, coalesce(sum(t.tutar_kurus), 0)::bigint AS net
          FROM generate_series(${bugun} - 13, ${bugun}, interval '1 day') AS g(gun)
          LEFT JOIN tahsilatlar t ON t.kasa_gunu = g.gun::date ${subeKosulu('t.sube_id')}
         GROUP BY g.gun ORDER BY g.gun`);

      const alacak = await tx.execute<{ toplam: number; hasta: number }>(sql`
        WITH borc AS (
          SELECT kisi_id, sum(tutar_kurus) AS tutar FROM hesap_kalemleri WHERE iptal_zamani IS NULL ${subeKosulu('sube_id')} GROUP BY kisi_id
        ), odeme AS (
          SELECT kisi_id, sum(tutar_kurus) AS tutar FROM tahsilatlar WHERE true ${subeKosulu('sube_id')} GROUP BY kisi_id
        )
        SELECT coalesce(sum(b.tutar - coalesce(o.tutar, 0)), 0)::bigint AS toplam, count(*)::int AS hasta
          FROM borc b LEFT JOIN odeme o USING (kisi_id)
         WHERE b.tutar - coalesce(o.tutar, 0) > 0`);

      const r = randevu.rows[0]!;
      const seri = ciro.rows.map((s) => ({ gun: s.gun, netKurus: Number(s.net) }));
      return {
        subeId: sube,
        randevu: { toplam: r.toplam, gelen: r.gelen, gelmedi: r.gelmedi, bekleniyor: r.bekleniyor, salonda: r.salonda },
        ortalamaBeklemeDk: r.bekleme_dk,
        bugunCiroKurus: seri.at(-1)?.netKurus ?? 0,
        ciro14Gun: seri,
        alacak: { toplamKurus: Number(alacak.rows[0]?.toplam ?? 0), hastaSayisi: alacak.rows[0]?.hasta ?? 0 },
      };
    });
  }
}
