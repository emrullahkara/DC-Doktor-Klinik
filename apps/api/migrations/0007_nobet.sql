-- 0007 — Nöbet ve vardiya: kurum ayarları, aylık çizelgeler, görevler, personel izinleri.
--
-- Aynı kişiye çakışan görev ve izinli güne görev veritabanında engellenir. Süre kuralları
-- (haftalık saat, nöbet sonrası dinlenme, ardışık gece) uygulamada ihlal olarak raporlanır.

CREATE TABLE nobet_ayarlari (
  isletme_id                   uuid PRIMARY KEY REFERENCES isletmeler (id),
  haftalik_azami_saat          integer NOT NULL DEFAULT 45 CHECK (haftalik_azami_saat BETWEEN 1 AND 168),
  nobet_sonrasi_dinlenme_saat  integer NOT NULL DEFAULT 24 CHECK (nobet_sonrasi_dinlenme_saat BETWEEN 0 AND 72),
  ardisik_gece_azami           integer NOT NULL DEFAULT 2 CHECK (ardisik_gece_azami BETWEEN 1 AND 14),
  guncelleyen_id               uuid NOT NULL REFERENCES kullanicilar (id),
  guncelleme_zamani            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE cizelgeler (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  isletme_id        uuid NOT NULL REFERENCES isletmeler (id),
  sube_id           uuid NOT NULL REFERENCES subeler (id),
  ay                text NOT NULL CHECK (ay ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  durum             text NOT NULL DEFAULT 'taslak' CHECK (durum IN ('taslak', 'onay_bekliyor', 'yayinda')),
  hazirlayan_id     uuid NOT NULL REFERENCES kullanicilar (id),
  onaya_gonderen_id uuid REFERENCES kullanicilar (id),
  onaylayan_id      uuid REFERENCES kullanicilar (id),
  onay_zamani       timestamptz,
  ihlal_gerekcesi   text,
  red_nedeni        text,
  olusturma_zamani  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sube_id, ay),
  -- Dört göz: onaya gönderen onaylayamaz
  CHECK (onaylayan_id IS NULL OR onaylayan_id <> onaya_gonderen_id),
  CHECK ((durum = 'yayinda') = (onaylayan_id IS NOT NULL))
);

CREATE TABLE gorevler (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  isletme_id    uuid NOT NULL REFERENCES isletmeler (id),
  cizelge_id    uuid NOT NULL REFERENCES cizelgeler (id),
  sube_id       uuid NOT NULL REFERENCES subeler (id),
  kullanici_id  uuid NOT NULL REFERENCES kullanicilar (id),
  tur           text NOT NULL CHECK (tur IN ('vardiya', 'nobet', 'icap')),
  baslangic     timestamptz NOT NULL,
  bitis         timestamptz NOT NULL,
  notu          text NOT NULL DEFAULT '',
  ekleyen_id    uuid NOT NULL REFERENCES kullanicilar (id),
  zaman         timestamptz NOT NULL DEFAULT now(),
  CHECK (bitis > baslangic AND bitis - baslangic <= interval '36 hours'),
  -- Bir kişi aynı anda iki görevde olamaz (şubeler arasında da)
  CONSTRAINT gorev_cakismasi EXCLUDE USING gist (kullanici_id WITH =, tstzrange(baslangic, bitis) WITH &&)
);
CREATE INDEX gorevler_cizelge_idx ON gorevler (cizelge_id);

-- Görevler yalnızca taslak çizelgede eklenir/silinir
CREATE FUNCTION gorev_cizelge_kilit() RETURNS trigger
  LANGUAGE plpgsql
  AS $$
DECLARE
  d text;
BEGIN
  SELECT durum INTO d FROM cizelgeler WHERE id = COALESCE(NEW.cizelge_id, OLD.cizelge_id);
  IF d <> 'taslak' THEN
    RAISE EXCEPTION 'Onaya gönderilmiş veya yayındaki çizelge değiştirilemez' USING ERRCODE = 'check_violation';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

CREATE TRIGGER gorev_cizelge_kilit BEFORE INSERT OR UPDATE OR DELETE ON gorevler
  FOR EACH ROW EXECUTE FUNCTION gorev_cizelge_kilit();

CREATE TABLE personel_izinleri (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  isletme_id    uuid NOT NULL REFERENCES isletmeler (id),
  kullanici_id  uuid NOT NULL REFERENCES kullanicilar (id),
  tur           text NOT NULL CHECK (tur IN ('yillik', 'mazeret', 'rapor', 'ucretsiz', 'dogum', 'egitim', 'idari')),
  baslangic     date NOT NULL,
  bitis         date NOT NULL CHECK (bitis >= baslangic),
  aciklama      text NOT NULL DEFAULT '',
  ekleyen_id    uuid NOT NULL REFERENCES kullanicilar (id),
  zaman         timestamptz NOT NULL DEFAULT now(),
  iptal_eden_id uuid REFERENCES kullanicilar (id),
  iptal_zamani  timestamptz
);
CREATE INDEX personel_izinleri_kullanici_idx ON personel_izinleri (kullanici_id) WHERE iptal_zamani IS NULL;

ALTER TABLE nobet_ayarlari    ENABLE ROW LEVEL SECURITY;
ALTER TABLE cizelgeler        ENABLE ROW LEVEL SECURITY;
ALTER TABLE gorevler          ENABLE ROW LEVEL SECURITY;
ALTER TABLE personel_izinleri ENABLE ROW LEVEL SECURITY;
CREATE POLICY kiraci ON nobet_ayarlari    USING (isletme_id = app_isletme_id()) WITH CHECK (isletme_id = app_isletme_id());
CREATE POLICY kiraci ON cizelgeler        USING (isletme_id = app_isletme_id()) WITH CHECK (isletme_id = app_isletme_id());
CREATE POLICY kiraci ON gorevler          USING (isletme_id = app_isletme_id()) WITH CHECK (isletme_id = app_isletme_id());
CREATE POLICY kiraci ON personel_izinleri USING (isletme_id = app_isletme_id()) WITH CHECK (isletme_id = app_isletme_id());

GRANT SELECT, INSERT, UPDATE ON nobet_ayarlari, cizelgeler, personel_izinleri TO dc_app;
GRANT SELECT, INSERT, DELETE ON gorevler TO dc_app;
