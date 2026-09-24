import { sql } from 'drizzle-orm';
import { bigint, boolean, customType, date, integer, jsonb, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => 'bytea' });

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

export interface TaniKaydi {
  kod: string;
  ad: string;
  tur: 'on' | 'kesin';
  birincil: boolean;
}

export interface ReceteKalemi {
  ilac: string;
  doz: string;
  kullanim: string;
  sureGun: number;
  kutu: number;
}

export const muayeneler = pgTable('muayeneler', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  isletmeId: uuid('isletme_id').notNull(),
  subeId: uuid('sube_id').notNull(),
  kisiId: uuid('kisi_id').notNull(),
  hayvanId: uuid('hayvan_id'),
  randevuId: uuid('randevu_id'),
  hekimId: uuid('hekim_id').notNull(),
  durum: text('durum').notNull().default('taslak'),
  sikayet: text('sikayet').notNull().default(''),
  fizikMuayene: text('fizik_muayene').notNull().default(''),
  plan: text('plan').notNull().default(''),
  vitaller: jsonb('vitaller').$type<Record<string, number>>().notNull().default({}),
  vitallerGirenId: uuid('vitaller_giren_id'),
  vitallerZamani: timestamp('vitaller_zamani', { withTimezone: true }),
  tanilar: jsonb('tanilar').$type<TaniKaydi[]>().notNull().default([]),
  recete: jsonb('recete').$type<ReceteKalemi[]>().notNull().default([]),
  kontrolTarihi: date('kontrol_tarihi', { mode: 'string' }),
  olusturanId: uuid('olusturan_id'),
  olusturmaZamani: timestamp('olusturma_zamani', { withTimezone: true }).notNull().defaultNow(),
  guncellemeZamani: timestamp('guncelleme_zamani', { withTimezone: true }).notNull().defaultNow(),
  imzaZamani: timestamp('imza_zamani', { withTimezone: true }),
  icerikOzeti: text('icerik_ozeti'),
});

export const muayeneEkleri = pgTable('muayene_ekleri', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  isletmeId: uuid('isletme_id').notNull(),
  muayeneId: uuid('muayene_id').notNull(),
  yazanId: uuid('yazan_id').notNull(),
  metin: text('metin').notNull(),
  zaman: timestamp('zaman', { withTimezone: true }).notNull().defaultNow(),
});

export const acilErisimler = pgTable('acil_erisimler', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  isletmeId: uuid('isletme_id').notNull(),
  kullaniciId: uuid('kullanici_id').notNull(),
  kisiId: uuid('kisi_id').notNull(),
  gerekce: text('gerekce').notNull(),
  aciklama: text('aciklama').notNull(),
  baslangic: timestamp('baslangic', { withTimezone: true }).notNull().defaultNow(),
  bitis: timestamp('bitis', { withTimezone: true }).notNull(),
});

export const hizmetler = pgTable('hizmetler', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  isletmeId: uuid('isletme_id').notNull(),
  kod: text('kod').notNull(),
  ad: text('ad').notNull(),
  kategori: text('kategori').notNull(),
  kdvOrani: integer('kdv_orani').notNull(),
  fiyatKurus: bigint('fiyat_kurus', { mode: 'number' }).notNull(),
  aktif: boolean('aktif').notNull().default(false),
  olusturanId: uuid('olusturan_id'),
  olusturmaZamani: timestamp('olusturma_zamani', { withTimezone: true }).notNull().defaultNow(),
});

export const fiyatTalepleri = pgTable('fiyat_talepleri', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  isletmeId: uuid('isletme_id').notNull(),
  hizmetId: uuid('hizmet_id').notNull(),
  eskiFiyatKurus: bigint('eski_fiyat_kurus', { mode: 'number' }),
  yeniFiyatKurus: bigint('yeni_fiyat_kurus', { mode: 'number' }).notNull(),
  durum: text('durum').notNull().default('bekliyor'),
  talepEdenId: uuid('talep_eden_id').notNull(),
  talepZamani: timestamp('talep_zamani', { withTimezone: true }).notNull().defaultNow(),
  kararVerenId: uuid('karar_veren_id'),
  kararZamani: timestamp('karar_zamani', { withTimezone: true }),
});

export const hesapKalemleri = pgTable('hesap_kalemleri', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  isletmeId: uuid('isletme_id').notNull(),
  subeId: uuid('sube_id').notNull(),
  kisiId: uuid('kisi_id').notNull(),
  randevuId: uuid('randevu_id'),
  hizmetId: uuid('hizmet_id').notNull(),
  ad: text('ad').notNull(),
  birimFiyatKurus: bigint('birim_fiyat_kurus', { mode: 'number' }).notNull(),
  adet: integer('adet').notNull(),
  kdvOrani: integer('kdv_orani').notNull(),
  indirimYuzde: numeric('indirim_yuzde', { precision: 5, scale: 2, mode: 'number' }).notNull().default(0),
  indirimKurus: bigint('indirim_kurus', { mode: 'number' }).notNull().default(0),
  indirimNedeni: text('indirim_nedeni'),
  tutarKurus: bigint('tutar_kurus', { mode: 'number' }).notNull(),
  ekleyenId: uuid('ekleyen_id').notNull(),
  zaman: timestamp('zaman', { withTimezone: true }).notNull().defaultNow(),
  iptalEdenId: uuid('iptal_eden_id'),
  iptalZamani: timestamp('iptal_zamani', { withTimezone: true }),
  iptalNedeni: text('iptal_nedeni'),
});

export const tahsilatlar = pgTable('tahsilatlar', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  isletmeId: uuid('isletme_id').notNull(),
  subeId: uuid('sube_id').notNull(),
  kisiId: uuid('kisi_id').notNull(),
  tutarKurus: bigint('tutar_kurus', { mode: 'number' }).notNull(),
  odemeTuru: text('odeme_turu').notNull(),
  kasaGunu: date('kasa_gunu', { mode: 'string' }).notNull(),
  aciklama: text('aciklama').notNull().default(''),
  iadeEdilenId: uuid('iade_edilen_id'),
  alanId: uuid('alan_id').notNull(),
  zaman: timestamp('zaman', { withTimezone: true }).notNull().defaultNow(),
});

export const kasaKapanislari = pgTable('kasa_kapanislari', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  isletmeId: uuid('isletme_id').notNull(),
  subeId: uuid('sube_id').notNull(),
  gun: date('gun', { mode: 'string' }).notNull(),
  beklenenNakitKurus: bigint('beklenen_nakit_kurus', { mode: 'number' }).notNull(),
  sayilanNakitKurus: bigint('sayilan_nakit_kurus', { mode: 'number' }).notNull(),
  farkKurus: bigint('fark_kurus', { mode: 'number' }).notNull(),
  aciklama: text('aciklama').notNull().default(''),
  kapatanId: uuid('kapatan_id').notNull(),
  zaman: timestamp('zaman', { withTimezone: true }).notNull().defaultNow(),
});

export const personelBilgileri = pgTable('personel_bilgileri', {
  kullaniciId: uuid('kullanici_id').primaryKey(),
  isletmeId: uuid('isletme_id').notNull(),
  unvanBrans: text('unvan_brans').notNull().default(''),
  calismaSekli: text('calisma_sekli').notNull().default('tam_zamanli'),
  iseGiris: date('ise_giris', { mode: 'string' }),
  telefon: text('telefon'),
  guncelleyenId: uuid('guncelleyen_id').notNull(),
  guncellemeZamani: timestamp('guncelleme_zamani', { withTimezone: true }).notNull().defaultNow(),
});

export const dosyalar = pgTable('dosyalar', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  isletmeId: uuid('isletme_id').notNull(),
  ad: text('ad').notNull(),
  icerikTuru: text('icerik_turu').notNull(),
  boyut: integer('boyut').notNull(),
  sha256: text('sha256').notNull(),
  sifreli: bytea('sifreli').notNull(),
  yukleyenId: uuid('yukleyen_id').notNull(),
  zaman: timestamp('zaman', { withTimezone: true }).notNull().defaultNow(),
});

export const belgeler = pgTable('belgeler', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  isletmeId: uuid('isletme_id').notNull(),
  kapsam: text('kapsam').notNull(),
  kullaniciId: uuid('kullanici_id'),
  subeId: uuid('sube_id'),
  tur: text('tur').notNull(),
  belgeNo: text('belge_no').notNull().default(''),
  verenKurum: text('veren_kurum').notNull().default(''),
  baslangic: date('baslangic', { mode: 'string' }),
  bitis: date('bitis', { mode: 'string' }),
  dosyaId: uuid('dosya_id'),
  aciklama: text('aciklama').notNull().default(''),
  ekleyenId: uuid('ekleyen_id').notNull(),
  zaman: timestamp('zaman', { withTimezone: true }).notNull().defaultNow(),
  kaldiranId: uuid('kaldiran_id'),
  kaldirmaZamani: timestamp('kaldirma_zamani', { withTimezone: true }),
  kaldirmaNedeni: text('kaldirma_nedeni'),
});

export const nobetAyarlari = pgTable('nobet_ayarlari', {
  isletmeId: uuid('isletme_id').primaryKey(),
  haftalikAzamiSaat: integer('haftalik_azami_saat').notNull(),
  nobetSonrasiDinlenmeSaat: integer('nobet_sonrasi_dinlenme_saat').notNull(),
  ardisikGeceAzami: integer('ardisik_gece_azami').notNull(),
  guncelleyenId: uuid('guncelleyen_id').notNull(),
  guncellemeZamani: timestamp('guncelleme_zamani', { withTimezone: true }).notNull().defaultNow(),
});

export const cizelgeler = pgTable('cizelgeler', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  isletmeId: uuid('isletme_id').notNull(),
  subeId: uuid('sube_id').notNull(),
  ay: text('ay').notNull(),
  durum: text('durum').notNull().default('taslak'),
  hazirlayanId: uuid('hazirlayan_id').notNull(),
  onayaGonderenId: uuid('onaya_gonderen_id'),
  onaylayanId: uuid('onaylayan_id'),
  onayZamani: timestamp('onay_zamani', { withTimezone: true }),
  ihlalGerekcesi: text('ihlal_gerekcesi'),
  redNedeni: text('red_nedeni'),
  olusturmaZamani: timestamp('olusturma_zamani', { withTimezone: true }).notNull().defaultNow(),
});

export const gorevler = pgTable('gorevler', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  isletmeId: uuid('isletme_id').notNull(),
  cizelgeId: uuid('cizelge_id').notNull(),
  subeId: uuid('sube_id').notNull(),
  kullaniciId: uuid('kullanici_id').notNull(),
  tur: text('tur').notNull(),
  baslangic: timestamp('baslangic', { withTimezone: true }).notNull(),
  bitis: timestamp('bitis', { withTimezone: true }).notNull(),
  notu: text('notu').notNull().default(''),
  ekleyenId: uuid('ekleyen_id').notNull(),
  zaman: timestamp('zaman', { withTimezone: true }).notNull().defaultNow(),
});

export const personelIzinleri = pgTable('personel_izinleri', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  isletmeId: uuid('isletme_id').notNull(),
  kullaniciId: uuid('kullanici_id').notNull(),
  tur: text('tur').notNull(),
  baslangic: date('baslangic', { mode: 'string' }).notNull(),
  bitis: date('bitis', { mode: 'string' }).notNull(),
  aciklama: text('aciklama').notNull().default(''),
  ekleyenId: uuid('ekleyen_id').notNull(),
  zaman: timestamp('zaman', { withTimezone: true }).notNull().defaultNow(),
  iptalEdenId: uuid('iptal_eden_id'),
  iptalZamani: timestamp('iptal_zamani', { withTimezone: true }),
});
