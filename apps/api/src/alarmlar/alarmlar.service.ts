import { Injectable } from '@nestjs/common';
import { ALARM_SIRASI, alarmGorulebilirMi, KURUM_SAAT_DILIMI } from '@dc/shared';
import { sql } from 'drizzle-orm';
import { VeritabaniService } from '../db/veritabani.service';
import { BelgelerService } from '../belgeler/belgeler.service';
import { NobetService } from '../nobet/nobet.service';
import { StokService } from '../stok/stok.service';
import { KaliteService } from '../kalite/kalite.service';
import type { Kimlik, YetkiBaglami } from '../yetki/baglam';
import type { Alarm } from './alarm';

/**
 * Alarm motoru (docs/03-komuta-merkezi.md §3): modüllerin alarm kaynaklarını toplar,
 * izleyenin yetkisine göre eskalasyon kuralıyla süzer ve önem sırasına dizer.
 */
@Injectable()
export class AlarmlarService {
  constructor(
    private readonly db: VeritabaniService,
    private readonly belgeler: BelgelerService,
    private readonly nobet: NobetService,
    private readonly stok: StokService,
    private readonly kalite: KaliteService,
  ) {}

  async liste(kimlik: Kimlik, yetki: YetkiBaglami): Promise<Alarm[]> {
    return this.db.kiraciIslemi(kimlik, async (tx) => {
      const gun = (await tx.execute<{ gun: string }>(sql`SELECT (now() AT TIME ZONE ${KURUM_SAAT_DILIMI})::date::text AS gun`)).rows[0]!.gun;
      // Aynı işlem (bağlantı) üzerinde sırayla
      const kaynaklar = [
        await this.belgeler.belgeAlarmlari(tx, gun, yetki.subeId),
        await this.nobet.nobetAlarmlari(tx, gun, yetki.subeId),
        await this.stok.stokAlarmlari(tx, gun, yetki.subeId),
        await this.kalite.kaliteAlarmlari(tx, gun, yetki.subeId),
      ];
      const izleyen = { kullaniciId: kimlik.kullaniciId, izinler: yetki.izinler };
      return kaynaklar
        .flat()
        .filter((a) => alarmGorulebilirMi(a, izleyen))
        .sort((a, b) => ALARM_SIRASI[a.seviye] - ALARM_SIRASI[b.seviye] || (a.kalanGun ?? 0) - (b.kalanGun ?? 0) || a.turAd.localeCompare(b.turAd, 'tr'));
    });
  }
}
