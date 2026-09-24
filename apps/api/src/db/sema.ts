import { sql } from 'drizzle-orm';
import { bigint, boolean, date, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

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

export const kisiler = pgTable('kisiler', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  isletmeId: uuid('isletme_id').notNull(),
  kimlikTuru: text('kimlik_turu').notNull(),
  kimlikNoSifreli: text('kimlik_no_sifreli'),
  kimlikNoOzet: text('kimlik_no_ozet'),
  kimlikNoMaske: text('kimlik_no_maske'),
  ad: text('ad').notNull(),
  soyad: text('soyad').notNull(),
  dogumTarihi: date('dogum_tarihi', { mode: 'string' }),
  cinsiyet: text('cinsiyet'),
  uyruk: text('uyruk'),
  telefon: text('telefon'),
  eposta: text('eposta'),
  adres: text('adres'),
  kanGrubu: text('kan_grubu'),
  iletisimTercihi: text('iletisim_tercihi'),
  acilKisiAd: text('acil_kisi_ad'),
  acilKisiTelefon: text('acil_kisi_telefon'),
  acilKisiYakinlik: text('acil_kisi_yakinlik'),
  temsilciAd: text('temsilci_ad'),
  temsilciTelefon: text('temsilci_telefon'),
  temsilciYakinlik: text('temsilci_yakinlik'),
  aramaMetni: text('arama_metni').notNull(),
  kayitSubesiId: uuid('kayit_subesi_id'),
  olusturanId: uuid('olusturan_id'),
  olusturmaZamani: timestamp('olusturma_zamani', { withTimezone: true }).notNull().defaultNow(),
  guncellemeZamani: timestamp('guncelleme_zamani', { withTimezone: true }).notNull().defaultNow(),
});

export const hayvanlar = pgTable('hayvanlar', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  isletmeId: uuid('isletme_id').notNull(),
  sahipKisiId: uuid('sahip_kisi_id').notNull(),
  ad: text('ad').notNull(),
  tur: text('tur').notNull(),
  irk: text('irk'),
  cinsiyet: text('cinsiyet'),
  kisirlastirilmis: boolean('kisirlastirilmis'),
  dogumTarihi: date('dogum_tarihi', { mode: 'string' }),
  renk: text('renk'),
  mikrocipNo: text('mikrocip_no'),
  olusturanId: uuid('olusturan_id'),
  olusturmaZamani: timestamp('olusturma_zamani', { withTimezone: true }).notNull().defaultNow(),
});

export const hastaUyarilari = pgTable('hasta_uyarilari', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  isletmeId: uuid('isletme_id').notNull(),
  kisiId: uuid('kisi_id'),
  hayvanId: uuid('hayvan_id'),
  tur: text('tur').notNull(),
  aciklama: text('aciklama').notNull().default(''),
  olusturanId: uuid('olusturan_id'),
  olusturmaZamani: timestamp('olusturma_zamani', { withTimezone: true }).notNull().defaultNow(),
  kaldiranId: uuid('kaldiran_id'),
  kaldirmaZamani: timestamp('kaldirma_zamani', { withTimezone: true }),
});

export const aydinlatmaKayitlari = pgTable('aydinlatma_kayitlari', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  isletmeId: uuid('isletme_id').notNull(),
  kisiId: uuid('kisi_id').notNull(),
  metinKodu: text('metin_kodu').notNull(),
  metinSurumu: text('metin_surumu').notNull(),
  kanal: text('kanal').notNull(),
  sunanId: uuid('sunan_id'),
  zaman: timestamp('zaman', { withTimezone: true }).notNull().defaultNow(),
});

export const rizalar = pgTable('rizalar', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  isletmeId: uuid('isletme_id').notNull(),
  kisiId: uuid('kisi_id').notNull(),
  rizaTuru: text('riza_turu').notNull(),
  verildi: boolean('verildi').notNull(),
  kanal: text('kanal').notNull(),
  metinSurumu: text('metin_surumu').notNull(),
  kaydedenId: uuid('kaydeden_id'),
  zaman: timestamp('zaman', { withTimezone: true }).notNull().defaultNow(),
});

export const kaynaklar = pgTable('kaynaklar', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  isletmeId: uuid('isletme_id').notNull(),
  subeId: uuid('sube_id').notNull(),
  ad: text('ad').notNull(),
  tur: text('tur').notNull(),
  aktif: boolean('aktif').notNull().default(true),
  olusturmaZamani: timestamp('olusturma_zamani', { withTimezone: true }).notNull().defaultNow(),
});

export const randevular = pgTable('randevular', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  isletmeId: uuid('isletme_id').notNull(),
  subeId: uuid('sube_id').notNull(),
  kisiId: uuid('kisi_id').notNull(),
  hayvanId: uuid('hayvan_id'),
  hekimId: uuid('hekim_id').notNull(),
  kaynakId: uuid('kaynak_id'),
  baslangic: timestamp('baslangic', { withTimezone: true }).notNull(),
  bitis: timestamp('bitis', { withTimezone: true }).notNull(),
  tur: text('tur').notNull(),
  durum: text('durum').notNull().default('planlandi'),
  notlar: text('notlar').notNull().default(''),
  siraNo: integer('sira_no'),
  geldiZamani: timestamp('geldi_zamani', { withTimezone: true }),
  muayeneZamani: timestamp('muayene_zamani', { withTimezone: true }),
  tamamlanmaZamani: timestamp('tamamlanma_zamani', { withTimezone: true }),
  iptalNedeni: text('iptal_nedeni'),
  olusturanId: uuid('olusturan_id'),
  olusturmaZamani: timestamp('olusturma_zamani', { withTimezone: true }).notNull().defaultNow(),
  guncellemeZamani: timestamp('guncelleme_zamani', { withTimezone: true }).notNull().defaultNow(),
});
