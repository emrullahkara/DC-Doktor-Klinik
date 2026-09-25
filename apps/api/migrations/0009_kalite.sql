-- 0009 — Kalite: olay bildirimleri (isimsiz seçenekli), şikâyetler, DÖF.
--
-- İsimsiz bildirimde bildiren kimliği açık sütunda tutulmaz; uygulama katmanında şifreli saklanır.

CREATE TABLE olay_bildirimleri (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  isletme_id        uuid NOT NULL REFERENCES isletmeler (id),
  sube_id           uuid REFERENCES subeler (id),
  takip_kodu        text NOT NULL CHECK (takip_kodu ~ '^[A-Z2-9]{8}$'),
  tur               text NOT NULL,
  siddet            text NOT NULL CHECK (siddet IN ('zarar_yok', 'hafif', 'orta', 'ciddi')),
  olay_zamani       timestamptz NOT NULL,
  yer               text NOT NULL DEFAULT '',
  aciklama          text NOT NULL CHECK (length(trim(aciklama)) >= 10),
  ilk_mudahale      text NOT NULL DEFAULT '',
  kisi_id           uuid REFERENCES kisiler (id),
  isimsiz           boolean NOT NULL,
  bildiren_id       uuid REFERENCES kullanicilar (id),
  bildiren_sifreli  text,
  durum             text NOT NULL DEFAULT 'yeni' CHECK (durum IN ('yeni', 'inceleniyor', 'kapatildi')),
  sorumlu_id        uuid REFERENCES kullanicilar (id),
  kok_neden         text,
  alinan_onlem      text,
  resmi_bildirim    text,
  kapatan_id        uuid REFERENCES kullanicilar (id),
  kapanis_zamani    timestamptz,
  zaman             timestamptz NOT NULL DEFAULT now(),
  UNIQUE (isletme_id, takip_kodu),
  CHECK (isimsiz = (bildiren_id IS NULL)),
  CHECK (isimsiz = (bildiren_sifreli IS NOT NULL)),
  CHECK ((durum = 'kapatildi') = (kapatan_id IS NOT NULL))
);

CREATE TABLE sikayetler (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  isletme_id      uuid NOT NULL REFERENCES isletmeler (id),
  sube_id         uuid REFERENCES subeler (id),
  kanal           text NOT NULL,
  kategori        text NOT NULL,
  resmi_no        text NOT NULL DEFAULT '',
  kisi_id         uuid REFERENCES kisiler (id),
  basvuran        text NOT NULL CHECK (length(trim(basvuran)) > 1),
  iletisim        text NOT NULL DEFAULT '',
  konu            text NOT NULL CHECK (length(trim(konu)) > 2),
  aciklama        text NOT NULL,
  alinis_gunu     date NOT NULL,
  son_tarih       date NOT NULL,
  durum           text NOT NULL DEFAULT 'acik' CHECK (durum IN ('acik', 'cevaplandi', 'kapatildi')),
  sorumlu_id      uuid REFERENCES kullanicilar (id),
  cevap           text,
  cevaplayan_id   uuid REFERENCES kullanicilar (id),
  cevap_zamani    timestamptz,
  kaydeden_id     uuid NOT NULL REFERENCES kullanicilar (id),
  zaman           timestamptz NOT NULL DEFAULT now(),
  CHECK ((durum = 'acik') = (cevap IS NULL))
);

CREATE TABLE dofler (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  isletme_id       uuid NOT NULL REFERENCES isletmeler (id),
  kaynak           text NOT NULL CHECK (kaynak IN ('olay', 'sikayet', 'denetim', 'diger')),
  olay_id          uuid REFERENCES olay_bildirimleri (id),
  sikayet_id       uuid REFERENCES sikayetler (id),
  baslik           text NOT NULL CHECK (length(trim(baslik)) > 2),
  kok_neden        text NOT NULL DEFAULT '',
  aksiyon          text NOT NULL CHECK (length(trim(aksiyon)) > 2),
  sorumlu_id       uuid NOT NULL REFERENCES kullanicilar (id),
  termin           date NOT NULL,
  durum            text NOT NULL DEFAULT 'acik' CHECK (durum IN ('acik', 'tamamlandi', 'dogrulandi')),
  tamamlama_notu   text,
  tamamlayan_id    uuid REFERENCES kullanicilar (id),
  tamamlama_zamani timestamptz,
  dogrulayan_id    uuid REFERENCES kullanicilar (id),
  dogrulama_notu   text,
  dogrulama_zamani timestamptz,
  acan_id          uuid NOT NULL REFERENCES kullanicilar (id),
  zaman            timestamptz NOT NULL DEFAULT now(),
  -- Dört göz: etkinliği tamamlayan doğrulayamaz
  CHECK (dogrulayan_id IS NULL OR dogrulayan_id <> tamamlayan_id)
);

ALTER TABLE olay_bildirimleri ENABLE ROW LEVEL SECURITY;
ALTER TABLE sikayetler        ENABLE ROW LEVEL SECURITY;
ALTER TABLE dofler            ENABLE ROW LEVEL SECURITY;
CREATE POLICY kiraci ON olay_bildirimleri USING (isletme_id = app_isletme_id()) WITH CHECK (isletme_id = app_isletme_id());
CREATE POLICY kiraci ON sikayetler        USING (isletme_id = app_isletme_id()) WITH CHECK (isletme_id = app_isletme_id());
CREATE POLICY kiraci ON dofler            USING (isletme_id = app_isletme_id()) WITH CHECK (isletme_id = app_isletme_id());

GRANT SELECT, INSERT, UPDATE ON olay_bildirimleri, sikayetler, dofler TO dc_app;
