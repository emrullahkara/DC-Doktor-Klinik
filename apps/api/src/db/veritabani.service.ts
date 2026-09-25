import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { AYARLAR, type Ayarlar } from '../ayarlar';
import * as sema from './sema';

export type Islem = NodePgDatabase<typeof sema>;

export interface KiraciBaglami {
  isletmeId: string;
  kullaniciId?: string | null;
}

@Injectable()
export class VeritabaniService implements OnModuleDestroy {
  private readonly havuz: Pool;

  constructor(@Inject(AYARLAR) ayarlar: Ayarlar) {
    this.havuz = new Pool({ connectionString: ayarlar.veritabaniUrl, max: 10 });
  }

  /**
   * Bir işletme bağlamında veritabanı işlemi çalıştırır. İşlem boyunca
   * `app.isletme_id` ayarlanır; RLS politikaları yalnızca bu işletmenin satırlarını gösterir.
   * Hata olursa işlem geri alınır.
   */
  async kiraciIslemi<T>(baglam: KiraciBaglami, is: (tx: Islem) => Promise<T>): Promise<T> {
    const istemci = await this.havuz.connect();
    try {
      await istemci.query('BEGIN');
      await istemci.query(
        "SELECT set_config('app.isletme_id', $1, true), set_config('app.kullanici_id', $2, true)",
        [baglam.isletmeId, baglam.kullaniciId ?? ''],
      );
      const sonuc = await is(drizzle(istemci, { schema: sema }));
      await istemci.query('COMMIT');
      return sonuc;
    } catch (hata) {
      await istemci.query('ROLLBACK').catch(() => undefined);
      throw hata;
    } finally {
      istemci.release();
    }
  }

  /** Giriş için kullanıcıyı işletme bağlamı olmadan (SECURITY DEFINER fonksiyonla) bulur. */
  async girisBilgisi(eposta: string): Promise<{ id: string; isletmeId: string; parolaOzeti: string; aktif: boolean } | null> {
    const { rows } = await this.havuz.query<{ id: string; isletme_id: string; parola_ozeti: string; aktif: boolean }>(
      'SELECT id, isletme_id, parola_ozeti, aktif FROM giris_bilgisi($1)',
      [eposta],
    );
    const satir = rows[0];
    return satir ? { id: satir.id, isletmeId: satir.isletme_id, parolaOzeti: satir.parola_ozeti, aktif: satir.aktif } : null;
  }

  async onModuleDestroy(): Promise<void> {
    await this.havuz.end();
  }
}
