-- 0008 — Stok ve ilaç: ürün kartı ve değiştirilemez stok hareket defteri.
--
-- Bakiye hareketlerin toplamıdır (şube + ürün + lot). Miktarlar binde bir birimle tam sayıdır.
-- Narkotik / psikotrop çıkışları şahitlidir (şahit, işlemi yapandan farklı kişi).

CREATE TABLE urunler (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  isletme_id    uuid NOT NULL REFERENCES isletmeler (id),
  kod           text NOT NULL CHECK (length(trim(kod)) > 0),
  ad            text NOT NULL CHECK (length(trim(ad)) > 1),
  tip           text NOT NULL CHECK (tip IN ('ilac', 'asi', 'sarf', 'implant', 'dental', 'estetik', 'lab', 'temizlik', 'diger')),
  birim         text NOT NULL,
  kontrol       text NOT NULL DEFAULT 'normal' CHECK (kontrol IN ('normal', 'yuksek_riskli', 'psikotrop', 'narkotik')),
  saklama       text NOT NULL DEFAULT 'oda' CHECK (saklama IN ('oda', 'soguk', 'dondurucu')),
  barkod        text,
  min_binde     bigint NOT NULL DEFAULT 0 CHECK (min_binde >= 0),
  aktif         boolean NOT NULL DEFAULT true,
  olusturan_id  uuid NOT NULL REFERENCES kullanicilar (id),
  zaman         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (isletme_id, kod)
);

CREATE TABLE stok_hareketleri (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  isletme_id    uuid NOT NULL REFERENCES isletmeler (id),
  sube_id       uuid NOT NULL REFERENCES subeler (id),
  urun_id       uuid NOT NULL REFERENCES urunler (id),
  lot           text NOT NULL CHECK (length(trim(lot)) > 0),
  skt           date,
  tur           text NOT NULL CHECK (tur IN ('giris', 'kullanim', 'fire', 'iade', 'sayim')),
  miktar_binde  bigint NOT NULL CHECK (miktar_binde <> 0),
  kisi_id       uuid REFERENCES kisiler (id),
  aciklama      text NOT NULL DEFAULT '',
  yapan_id      uuid NOT NULL REFERENCES kullanicilar (id),
  sahit_id      uuid REFERENCES kullanicilar (id),
  zaman         timestamptz NOT NULL DEFAULT now(),
  CHECK (sahit_id IS NULL OR sahit_id <> yapan_id),
  CHECK (tur <> 'giris' OR miktar_binde > 0),
  CHECK (tur NOT IN ('kullanim', 'fire', 'iade') OR miktar_binde < 0),
  CHECK (tur <> 'kullanim' OR kisi_id IS NOT NULL),
  CHECK (tur <> 'sayim' OR length(trim(aciklama)) > 0)
);
CREATE INDEX stok_hareketleri_bakiye_idx ON stok_hareketleri (sube_id, urun_id, lot);
CREATE INDEX stok_hareketleri_kisi_idx ON stok_hareketleri (kisi_id) WHERE kisi_id IS NOT NULL;

ALTER TABLE urunler          ENABLE ROW LEVEL SECURITY;
ALTER TABLE stok_hareketleri ENABLE ROW LEVEL SECURITY;
CREATE POLICY kiraci ON urunler          USING (isletme_id = app_isletme_id()) WITH CHECK (isletme_id = app_isletme_id());
CREATE POLICY kiraci ON stok_hareketleri USING (isletme_id = app_isletme_id()) WITH CHECK (isletme_id = app_isletme_id());

GRANT SELECT, INSERT, UPDATE ON urunler TO dc_app;
-- Hareket defteri değiştirilemez; düzeltme yeni harekettir
GRANT SELECT, INSERT ON stok_hareketleri TO dc_app;
