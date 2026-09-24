import type { INestApplication } from '@nestjs/common';
import { Client } from 'pg';
import request from 'supertest';
import type { Ayarlar } from '../src/ayarlar';
import { migrationlariCalistir } from '../src/db/migrate';
import { uygulamaOlustur } from '../src/main';

export const TEST_AYARLARI: Ayarlar = {
  veritabaniUrl: process.env.TEST_DATABASE_URL!,
  jwtGizli: 'test-icin-en-az-otuz-iki-karakterlik-gizli-deger',
  port: 0,
};

/** Test veritabanını sıfırlar ve tüm migration'ları baştan uygular. */
export async function veritabaniniSifirla(): Promise<void> {
  const istemci = new Client({ connectionString: process.env.TEST_MIGRATION_DATABASE_URL });
  await istemci.connect();
  try {
    await istemci.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  } finally {
    await istemci.end();
  }
  await migrationlariCalistir(process.env.TEST_MIGRATION_DATABASE_URL!);
}

export async function testUygulamasi(): Promise<INestApplication> {
  const app = await uygulamaOlustur(TEST_AYARLARI);
  await app.init();
  return app;
}

let sayac = 0;
export function benzersizEposta(on: string): string {
  sayac += 1;
  return `${on}.${Date.now()}.${sayac}@ornek.test`;
}

export interface KayitSecenekleri {
  kurumTipleri?: string[];
  meslek?: string;
  eposta?: string;
}

export async function kurumKaydet(app: INestApplication, secenek: KayitSecenekleri = {}) {
  const eposta = secenek.eposta ?? benzersizEposta('sahip');
  const yanit = await request(app.getHttpServer())
    .post('/api/v1/kimlik/kayit')
    .send({
      kurum: { unvan: 'Örnek Sağlık Hizmetleri Ltd. Şti.' },
      sube: { ad: 'Merkez' },
      kurumTipleri: secenek.kurumTipleri ?? ['tip_merkezi'],
      sahip: { adSoyad: 'Deneme Sahip', eposta, parola: 'guclu-parola-123', meslek: secenek.meslek ?? 'idari' },
    });
  if (yanit.status !== 201) throw new Error(`Kayıt başarısız: ${yanit.status} ${JSON.stringify(yanit.body)}`);
  return { ...(yanit.body as { token: string; kullaniciId: string; isletmeId: string }), eposta };
}

export function yetkili(app: INestApplication, token: string, subeId?: string) {
  const sunucu = app.getHttpServer();
  const ekle = (r: request.Test) => {
    r.set('Authorization', `Bearer ${token}`);
    if (subeId) r.set('x-sube-id', subeId);
    return r;
  };
  return {
    get: (yol: string) => ekle(request(sunucu).get(`/api/v1${yol}`)),
    post: (yol: string) => ekle(request(sunucu).post(`/api/v1${yol}`)),
  };
}
