import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ayarlariOku } from './ayarlar';

export async function uygulamaOlustur(ayarlar = ayarlariOku()) {
  const app = await NestFactory.create<NestExpressApplication>(AppModule.kur(ayarlar), { logger: ['error', 'warn'] });
  app.setGlobalPrefix('api/v1');
  // Sunucu yazılımını ifşa etme; gerçek istemci IP'si (deneme sınırı, denetim izi) için vekil ayarı
  app.disable('x-powered-by');
  app.set('trust proxy', ayarlar.guvenilenVekil ?? 0);
  // API yanıtları: tarayıcı içerik türünü tahmin etmesin, çerçevelenmesin, önbelleğe alınmasın
  app.use((_istek: unknown, yanit: { setHeader(ad: string, deger: string): void }, sonraki: () => void) => {
    yanit.setHeader('X-Content-Type-Options', 'nosniff');
    yanit.setHeader('X-Frame-Options', 'DENY');
    yanit.setHeader('Referrer-Policy', 'no-referrer');
    yanit.setHeader('Cache-Control', 'no-store');
    yanit.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    yanit.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    sonraki();
  });
  app.enableShutdownHooks();
  return app;
}

if (require.main === module) {
  const ayarlar = ayarlariOku();
  uygulamaOlustur(ayarlar)
    .then((app) => app.listen(ayarlar.port))
    .then(() => console.log(`DC Doktor Klinik API: http://localhost:${ayarlar.port}/api/v1`))
    .catch((hata: Error) => {
      console.error(hata);
      process.exit(1);
    });
}
