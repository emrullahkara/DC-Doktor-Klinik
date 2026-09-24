-- 0003 — Randevu: kaynaklar (oda, ünit, cihaz…) ve randevular.
--
-- Aynı hekime veya aynı kaynağa çakışan randevu verilmesi veritabanı düzeyinde engellenir
-- (exclusion constraint): iki resepsiyon aynı anda aynı saati verse bile ikincisi reddedilir.
-- İptal edilen ve gelinmeyen randevular yer tutmaz.

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE kaynaklar (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  isletme_id        uuid NOT NULL REFERENCES isletmeler (id),
  sube_id           uuid NOT NULL REFERENCES subeler (id),
  ad                text NOT NULL CHECK (length(trim(ad)) > 0),
  tur               text NOT NULL CHECK (tur IN ('oda', 'unit', 'cihaz', 'kafes', 'salon', 'arac')),
  aktif             boolean NOT NULL DEFAULT true,
  olusturma_zamani  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sube_id, ad)
);

CREATE TABLE randevular (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  isletme_id        uuid NOT NULL REFERENCES isletmeler (id),
  sube_id           uuid NOT NULL REFERENCES subeler (id),
  kisi_id           uuid NOT NULL REFERENCES kisiler (id),
  hayvan_id         uuid REFERENCES hayvanlar (id),
  hekim_id          uuid NOT NULL REFERENCES kullanicilar (id),
  kaynak_id         uuid REFERENCES kaynaklar (id),
  baslangic         timestamptz NOT NULL,
  bitis             timestamptz NOT NULL,
  tur               text NOT NULL,
  durum             text NOT NULL DEFAULT 'planlandi'
                    CHECK (durum IN ('planlandi', 'geldi', 'muayenede', 'tamamlandi', 'gelmedi', 'iptal')),
  notlar            text NOT NULL DEFAULT '',
  -- Kabulde verilen günlük sıra numarası (bekleme ekranında adı değil numarası gösterilir)
  sira_no           integer,
  geldi_zamani      timestamptz,
  muayene_zamani    timestamptz,
  tamamlanma_zamani timestamptz,
  iptal_nedeni      text,
  olusturan_id      uuid REFERENCES kullanicilar (id),
  olusturma_zamani  timestamptz NOT NULL DEFAULT now(),
  guncelleme_zamani timestamptz NOT NULL DEFAULT now(),
  CHECK (bitis > baslangic),
  CHECK (bitis - baslangic <= interval '12 hours'),
  CONSTRAINT randevu_hekim_cakismasi EXCLUDE USING gist (hekim_id WITH =, tstzrange(baslangic, bitis) WITH &&)
    WHERE (durum NOT IN ('iptal', 'gelmedi')),
  CONSTRAINT randevu_kaynak_cakismasi EXCLUDE USING gist (kaynak_id WITH =, tstzrange(baslangic, bitis) WITH &&)
    WHERE (kaynak_id IS NOT NULL AND durum NOT IN ('iptal', 'gelmedi'))
);
CREATE INDEX randevular_sube_zaman_idx ON randevular (sube_id, baslangic);
CREATE INDEX randevular_kisi_idx ON randevular (kisi_id, baslangic DESC);

ALTER TABLE kaynaklar  ENABLE ROW LEVEL SECURITY;
ALTER TABLE randevular ENABLE ROW LEVEL SECURITY;
CREATE POLICY kiraci ON kaynaklar  USING (isletme_id = app_isletme_id()) WITH CHECK (isletme_id = app_isletme_id());
CREATE POLICY kiraci ON randevular USING (isletme_id = app_isletme_id()) WITH CHECK (isletme_id = app_isletme_id());

GRANT SELECT, INSERT, UPDATE ON kaynaklar, randevular TO dc_app;
