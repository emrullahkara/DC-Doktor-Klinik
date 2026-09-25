import { Injectable } from '@nestjs/common';
import { desc } from 'drizzle-orm';
import type { Islem } from '../db/veritabani.service';
import { denetimIzi } from '../db/sema';

export interface DenetimKaydi {
  isletmeId: string;
  kullaniciId?: string | null;
  eylem: string;
  varlikTipi?: string;
  varlikId?: string;
  subeId?: string | null;
  ip?: string | null;
  ayrinti?: Record<string, unknown>;
}

@Injectable()
export class DenetimService {
  /** Kaydı, işi yapan işlemle aynı veritabanı işlemi içinde yazar: iş geri alınırsa kayıt da geri alınır. */
  async kaydet(tx: Islem, kayit: DenetimKaydi): Promise<void> {
    await tx.insert(denetimIzi).values({
      isletmeId: kayit.isletmeId,
      zaman: new Date(),
      kullaniciId: kayit.kullaniciId ?? null,
      eylem: kayit.eylem,
      varlikTipi: kayit.varlikTipi ?? null,
      varlikId: kayit.varlikId ?? null,
      subeId: kayit.subeId ?? null,
      ip: kayit.ip ?? null,
      ayrinti: kayit.ayrinti ?? {},
    });
  }

  async sonKayitlar(tx: Islem, adet: number) {
    return tx.select().from(denetimIzi).orderBy(desc(denetimIzi.id)).limit(adet);
  }
}
