import { sql } from 'drizzle-orm';
import { bigint, boolean, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Tablo tanımları migrations/ altındaki SQL ile birebir aynıdır; şema değişikliği
// her zaman yeni bir migration dosyasıyla yapılır.

export const isletmeler = pgTable('isletmeler', {
  id: uuid('id').primaryKey(),
  unvan: text('unvan').notNull(),
  vergiNo: text('vergi_no'),
  olusturmaZamani: timestamp('olusturma_zamani', { withTimezone: true }).notNull().defaultNow(),
});

export const subeler = pgTable('subeler', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  isletmeId: uuid('isletme_id').notNull(),
  ad: text('ad').notNull(),
  kurumTipleri: text('kurum_tipleri').array().notNull(),
  olusturmaZamani: timestamp('olusturma_zamani', { withTimezone: true }).notNull().defaultNow(),
});

export const kullanicilar = pgTable('kullanicilar', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  isletmeId: uuid('isletme_id').notNull(),
  eposta: text('eposta').notNull(),
  adSoyad: text('ad_soyad').notNull(),
  meslek: text('meslek').notNull(),
  parolaOzeti: text('parola_ozeti').notNull(),
  aktif: boolean('aktif').notNull().default(true),
  olusturmaZamani: timestamp('olusturma_zamani', { withTimezone: true }).notNull().defaultNow(),
});

export const rolAtamalari = pgTable('rol_atamalari', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  isletmeId: uuid('isletme_id').notNull(),
  kullaniciId: uuid('kullanici_id').notNull(),
  rolKodu: text('rol_kodu').notNull(),
  subeId: uuid('sube_id'),
  atayanId: uuid('atayan_id'),
  olusturmaZamani: timestamp('olusturma_zamani', { withTimezone: true }).notNull().defaultNow(),
});

export const denetimIzi = pgTable('denetim_izi', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  isletmeId: uuid('isletme_id').notNull(),
  zaman: timestamp('zaman', { withTimezone: true }).notNull(),
  kullaniciId: uuid('kullanici_id'),
  eylem: text('eylem').notNull(),
  varlikTipi: text('varlik_tipi'),
  varlikId: text('varlik_id'),
  subeId: uuid('sube_id'),
  ip: text('ip'),
  ayrinti: jsonb('ayrinti').$type<Record<string, unknown>>().notNull(),
  oncekiOzet: text('onceki_ozet'),
  // Tetikleyici hesaplar; uygulama boş gönderir.
  ozet: text('ozet').notNull().default(''),
});
