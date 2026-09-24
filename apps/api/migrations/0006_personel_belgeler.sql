-- 0006 — Personel özlük bilgileri, personel ve kurum belgeleri, şifreli belge dosyaları.
--
-- Belgeler silinmez: yanlış yüklenen belge gerekçeyle kaldırılır, yenilenen belge yeni satır olarak
-- eklenir (geçmiş korunur). Dosya içeriği uygulama katmanında AES-256-GCM ile şifrelenir.

CREATE TABLE personel_bilgileri (
  kullanici_id       uuid PRIMARY KEY REFERENCES kullanicilar (id),
  isletme_id         uuid NOT NULL REFERENCES isletmeler (id),
  unvan_brans        text NOT NULL DEFAULT '',
  calisma_sekli      text NOT NULL DEFAULT 'tam_zamanli'
                       CHECK (calisma_sekli IN ('tam_zamanli', 'kismi_sureli', 'serbest', 'stajyer', 'taseron')),
  ise_giris          date,
  telefon            text,
  guncelleyen_id     uuid NOT NULL REFERENCES kullanicilar (id),
  guncelleme_zamani  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE dosyalar (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  isletme_id    uuid NOT NULL REFERENCES isletmeler (id),
  ad            text NOT NULL CHECK (length(ad) BETWEEN 1 AND 200),
  icerik_turu   text NOT NULL CHECK (icerik_turu IN ('application/pdf', 'image/jpeg', 'image/png')),
  boyut         integer NOT NULL CHECK (boyut BETWEEN 1 AND 10485760),
  -- Şifrelenmemiş içeriğin SHA-256 özeti (bütünlük ve denetim izi için)
  sha256        text NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  sifreli       bytea NOT NULL,
  yukleyen_id   uuid NOT NULL REFERENCES kullanicilar (id),
  zaman         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE belgeler (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  isletme_id       uuid NOT NULL REFERENCES isletmeler (id),
  kapsam           text NOT NULL CHECK (kapsam IN ('personel', 'kurum')),
  kullanici_id     uuid REFERENCES kullanicilar (id),
  -- Kurum belgesi için şube; null ise işletmenin tamamı için
  sube_id          uuid REFERENCES subeler (id),
  tur              text NOT NULL,
  belge_no         text NOT NULL DEFAULT '',
  veren_kurum      text NOT NULL DEFAULT '',
  baslangic        date,
  bitis            date,
  dosya_id         uuid REFERENCES dosyalar (id),
  aciklama         text NOT NULL DEFAULT '',
  ekleyen_id       uuid NOT NULL REFERENCES kullanicilar (id),
  zaman            timestamptz NOT NULL DEFAULT now(),
  kaldiran_id      uuid REFERENCES kullanicilar (id),
  kaldirma_zamani  timestamptz,
  kaldirma_nedeni  text,
  CHECK ((kapsam = 'personel') = (kullanici_id IS NOT NULL)),
  CHECK (kapsam = 'kurum' OR sube_id IS NULL),
  CHECK (bitis IS NULL OR baslangic IS NULL OR bitis >= baslangic),
  CHECK ((kaldirma_zamani IS NULL) = (kaldiran_id IS NULL) AND (kaldirma_zamani IS NULL) = (kaldirma_nedeni IS NULL))
);
CREATE INDEX belgeler_kullanici_idx ON belgeler (kullanici_id) WHERE kaldirma_zamani IS NULL;
CREATE INDEX belgeler_bitis_idx ON belgeler (isletme_id, bitis) WHERE kaldirma_zamani IS NULL;

-- Belgede yalnızca kaldırma bilgisi (bir kez) güncellenebilir; içerik değiştirilemez.
CREATE FUNCTION belge_kilit() RETURNS trigger
  LANGUAGE plpgsql
  AS $$
BEGIN
  IF OLD.kaldirma_zamani IS NOT NULL
     OR (to_jsonb(NEW) - 'kaldiran_id' - 'kaldirma_zamani' - 'kaldirma_nedeni')
        IS DISTINCT FROM (to_jsonb(OLD) - 'kaldiran_id' - 'kaldirma_zamani' - 'kaldirma_nedeni') THEN
    RAISE EXCEPTION 'Belge kaydı değiştirilemez; yeni belge ekleyin' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER belge_kilit BEFORE UPDATE ON belgeler
  FOR EACH ROW EXECUTE FUNCTION belge_kilit();

ALTER TABLE personel_bilgileri ENABLE ROW LEVEL SECURITY;
ALTER TABLE dosyalar           ENABLE ROW LEVEL SECURITY;
ALTER TABLE belgeler           ENABLE ROW LEVEL SECURITY;
CREATE POLICY kiraci ON personel_bilgileri USING (isletme_id = app_isletme_id()) WITH CHECK (isletme_id = app_isletme_id());
CREATE POLICY kiraci ON dosyalar           USING (isletme_id = app_isletme_id()) WITH CHECK (isletme_id = app_isletme_id());
CREATE POLICY kiraci ON belgeler           USING (isletme_id = app_isletme_id()) WITH CHECK (isletme_id = app_isletme_id());

GRANT SELECT, INSERT, UPDATE ON personel_bilgileri, belgeler TO dc_app;
GRANT SELECT, INSERT ON dosyalar TO dc_app;
