import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { Client } from 'pg';

/** apps/api/migrations klasörü (kaynaktan da derlenmiş dist/ içinden de bulunur). */
function migrationKlasoru(): string {
  let dizin = __dirname;
  while (!existsSync(join(dizin, 'package.json'))) {
    const ust = dirname(dizin);
    if (ust === dizin) throw new Error('migrations klasörü bulunamadı');
    dizin = ust;
  }
  return join(dizin, 'migrations');
}

const MIGRATION_KLASORU = migrationKlasoru();

/**
 * migrations/ klasöründeki .sql dosyalarını ad sırasıyla, her biri kendi işleminde,
 * yalnızca bir kez çalıştırır. Tablo sahibi kullanıcıyla çağrılmalıdır.
 */
export async function migrationlariCalistir(baglantiUrl: string, log: (m: string) => void = () => {}): Promise<string[]> {
  const istemci = new Client({ connectionString: baglantiUrl });
  await istemci.connect();
  try {
    await istemci.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      ad text PRIMARY KEY, calisma_zamani timestamptz NOT NULL DEFAULT now())`);
    const { rows } = await istemci.query<{ ad: string }>('SELECT ad FROM schema_migrations');
    const yapilanlar = new Set(rows.map((r) => r.ad));
    const dosyalar = (await readdir(MIGRATION_KLASORU)).filter((d) => d.endsWith('.sql')).sort();
    const calisanlar: string[] = [];
    for (const dosya of dosyalar) {
      if (yapilanlar.has(dosya)) continue;
      const icerik = await readFile(join(MIGRATION_KLASORU, dosya), 'utf8');
      await istemci.query('BEGIN');
      try {
        await istemci.query(icerik);
        await istemci.query('INSERT INTO schema_migrations (ad) VALUES ($1)', [dosya]);
        await istemci.query('COMMIT');
      } catch (hata) {
        await istemci.query('ROLLBACK');
        throw new Error(`${dosya} çalıştırılamadı: ${(hata as Error).message}`);
      }
      log(`uygulandı: ${dosya}`);
      calisanlar.push(dosya);
    }
    return calisanlar;
  } finally {
    await istemci.end();
  }
}
