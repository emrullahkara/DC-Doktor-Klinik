import { migrationlariCalistir } from './migrate';

const url = process.env.MIGRATION_DATABASE_URL;
if (!url) {
  console.error('MIGRATION_DATABASE_URL tanımlı değil');
  process.exit(1);
}

migrationlariCalistir(url, (m) => console.log(m))
  .then((calisanlar) => console.log(calisanlar.length ? 'Migration tamamlandı.' : 'Yeni migration yok.'))
  .catch((hata: Error) => {
    console.error(hata.message);
    process.exit(1);
  });
