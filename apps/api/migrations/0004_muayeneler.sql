-- 0004 — Klinik kayıt: muayeneler, imza sonrası ek notlar, acil erişim (break-the-glass).
--
-- “Kayıtta yoksa yapılmamıştır”: imzalanan muayene kaydı veritabanı düzeyinde kilitlenir;
-- sonradan yalnızca ek not eklenebilir (kim, ne zaman). İmza anında içeriğin SHA-256 özeti saklanır.

CREATE TABLE muayeneler (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  isletme_id        uuid NOT NULL REFERENCES isletmeler (id),
  sube_id           uuid NOT NULL REFERENCES subeler (id),
  kisi_id           uuid NOT NULL REFERENCES kisiler (id),
  hayvan_id         uuid REFERENCES hayvanlar (id),
  randevu_id        uuid UNIQUE REFERENCES randevular (id),
  hekim_id          uuid NOT NULL REFERENCES kullanicilar (id),
  durum             text NOT NULL DEFAULT 'taslak' CHECK (durum IN ('taslak', 'imzali')),
  sikayet           text NOT NULL DEFAULT '',
  fizik_muayene     text NOT NULL DEFAULT '',
  plan              text NOT NULL DEFAULT '',
  vitaller          jsonb NOT NULL DEFAULT '{}'::jsonb,
  vitaller_giren_id uuid REFERENCES kullanicilar (id),
  vitaller_zamani   timestamptz,
  -- [{ kod, ad, tur: 'on'|'kesin', birincil }]
  tanilar           jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- [{ ilac, doz, kullanim, sureGun, kutu }]
  recete            jsonb NOT NULL DEFAULT '[]'::jsonb,
  kontrol_tarihi    date,
  olusturan_id      uuid REFERENCES kullanicilar (id),
  olusturma_zamani  timestamptz NOT NULL DEFAULT now(),
  guncelleme_zamani timestamptz NOT NULL DEFAULT now(),
  imza_zamani       timestamptz,
  icerik_ozeti      text,
  CHECK ((durum = 'imzali') = (imza_zamani IS NOT NULL AND icerik_ozeti IS NOT NULL)),
  CHECK (durum = 'taslak' OR jsonb_array_length(tanilar) > 0)
);
CREATE INDEX muayeneler_kisi_idx ON muayeneler (kisi_id, olusturma_zamani DESC);

CREATE FUNCTION muayene_imzali_kilit() RETURNS trigger
  LANGUAGE plpgsql
  AS $$
BEGIN
  IF OLD.durum = 'imzali' THEN
    RAISE EXCEPTION 'İmzalanmış muayene kaydı değiştirilemez; ek not ekleyin' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER muayene_imzali_kilit BEFORE UPDATE OR DELETE ON muayeneler
  FOR EACH ROW EXECUTE FUNCTION muayene_imzali_kilit();

CREATE TABLE muayene_ekleri (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  isletme_id   uuid NOT NULL REFERENCES isletmeler (id),
  muayene_id   uuid NOT NULL REFERENCES muayeneler (id),
  yazan_id     uuid NOT NULL REFERENCES kullanicilar (id),
  metin        text NOT NULL CHECK (length(trim(metin)) > 0),
  zaman        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX muayene_ekleri_idx ON muayene_ekleri (muayene_id, zaman);

-- Tedavi ilişkisi dışındaki tıbbi kayda süreli, gerekçeli erişim.
CREATE TABLE acil_erisimler (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  isletme_id    uuid NOT NULL REFERENCES isletmeler (id),
  kullanici_id  uuid NOT NULL REFERENCES kullanicilar (id),
  kisi_id       uuid NOT NULL REFERENCES kisiler (id),
  gerekce       text NOT NULL,
  aciklama      text NOT NULL CHECK (length(trim(aciklama)) >= 10),
  baslangic     timestamptz NOT NULL DEFAULT now(),
  bitis         timestamptz NOT NULL,
  CHECK (bitis > baslangic)
);
CREATE INDEX acil_erisimler_idx ON acil_erisimler (kullanici_id, kisi_id, bitis);

ALTER TABLE muayeneler     ENABLE ROW LEVEL SECURITY;
ALTER TABLE muayene_ekleri ENABLE ROW LEVEL SECURITY;
ALTER TABLE acil_erisimler ENABLE ROW LEVEL SECURITY;
CREATE POLICY kiraci ON muayeneler     USING (isletme_id = app_isletme_id()) WITH CHECK (isletme_id = app_isletme_id());
CREATE POLICY kiraci ON muayene_ekleri USING (isletme_id = app_isletme_id()) WITH CHECK (isletme_id = app_isletme_id());
CREATE POLICY kiraci ON acil_erisimler USING (isletme_id = app_isletme_id()) WITH CHECK (isletme_id = app_isletme_id());

-- Silme yetkisi verilmez: klinik kayıtlar silinmez.
GRANT SELECT, INSERT, UPDATE ON muayeneler TO dc_app;
GRANT SELECT, INSERT ON muayene_ekleri, acil_erisimler TO dc_app;
