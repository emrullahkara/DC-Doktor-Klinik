import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ayarlariOku } from './ayarlar';

export async function uygulamaOlustur(ayarlar = ayarlariOku()) {
  const app = await NestFactory.create<NestExpressApplication>(AppModule.kur(ayarlar), { logger: ['error', 'warn'] });
  app.setGlobalPrefix('api/v1');
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
