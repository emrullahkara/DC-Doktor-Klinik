-- 0002 — Hasta kaydı: kişiler (insan hasta / hayvan sahibi), hayvanlar, uyarı bayrakları,
-- KVKK aydınlatma ve açık rıza kayıtları.
--
-- Hasta kaydı işletme genelinde tektir; hasta hangi şubeye giderse gitsin aynı kart kullanılır.
-- Kimlik numarası uygulama katmanında şifrelenir (AES-256-GCM); tekillik ve arama için
-- yalnızca HMAC özeti (kör indeks) tutulur. Veritabanı dökümü tek başına kimlik numarasını açığa çıkarmaz.

CREATE TABLE kisiler (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  isletme_id           uuid NOT NULL REFERENCES isletmeler (id),
  kimlik_turu          text NOT NULL CHECK (kimlik_turu IN ('tc', 'yabanci', 'pasaport', 'kimliksiz')),
  kimlik_no_sifreli    text,
  kimlik_no_ozet       text,
  kimlik_no_maske      text,
  ad                   text NOT NULL CHECK (length(trim(ad)) > 0),
  soyad                text NOT NULL CHECK (length(trim(soyad)) > 0),
  dogum_tarihi         date,
  cinsiyet             text CHECK (cinsiyet IN ('kadin', 'erkek', 'belirtilmemis')),
  uyruk                text,
  telefon              text,
  eposta               text,
  adres                text,
  kan_grubu            text,
  iletisim_tercihi     text CHECK (iletisim_tercihi IN ('sms', 'eposta', 'telefon', 'whatsapp')),
  acil_kisi_ad         text,
  acil_kisi_telefon    text,
  acil_kisi_yakinlik   text,
  temsilci_ad          text,
  temsilci_telefon     text,
  temsilci_yakinlik    text,
  -- Türkçe küçük harfe çevrilmiş ad, soyad ve telefon (uygulama doldurur)
  arama_metni          text NOT NULL,
  kayit_subesi_id      uuid REFERENCES subeler (id),
  olusturan_id         uuid REFERENCES kullanicilar (id),
  olusturma_zamani     timestamptz NOT NULL DEFAULT now(),
  guncelleme_zamani    timestamptz NOT NULL DEFAULT now(),
  CHECK ((kimlik_turu = 'kimliksiz') = (kimlik_no_ozet IS NULL)),
  CHECK ((kimlik_no_ozet IS NULL) = (kimlik_no_sifreli IS NULL))
);
CREATE UNIQUE INDEX kisiler_kimlik_ux ON kisiler (isletme_id, kimlik_no_ozet) WHERE kimlik_no_ozet IS NOT NULL;
CREATE INDEX kisiler_arama_idx ON kisiler (isletme_id, arama_metni text_pattern_ops);

CREATE TABLE hayvanlar (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  isletme_id        uuid NOT NULL REFERENCES isletmeler (id),
  sahip_kisi_id     uuid NOT NULL REFERENCES kisiler (id),
  ad                text NOT NULL CHECK (length(trim(ad)) > 0),
  tur               text NOT NULL,
  irk               text,
  cinsiyet          text CHECK (cinsiyet IN ('disi', 'erkek', 'bilinmiyor')),
  kisirlastirilmis  boolean,
  dogum_tarihi      date,
  renk              text,
  mikrocip_no       text,
  olusturan_id      uuid REFERENCES kullanicilar (id),
  olusturma_zamani  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX hayvanlar_sahip_idx ON hayvanlar (sahip_kisi_id);
CREATE UNIQUE INDEX hayvanlar_mikrocip_ux ON hayvanlar (isletme_id, mikrocip_no) WHERE mikrocip_no IS NOT NULL;

CREATE TABLE hasta_uyarilari (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  isletme_id        uuid NOT NULL REFERENCES isletmeler (id),
  kisi_id           uuid REFERENCES kisiler (id),
  hayvan_id         uuid REFERENCES hayvanlar (id),
  tur               text NOT NULL,
  aciklama          text NOT NULL DEFAULT '',
  olusturan_id      uuid REFERENCES kullanicilar (id),
  olusturma_zamani  timestamptz NOT NULL DEFAULT now(),
  -- Uyarılar silinmez; kaldırıldığında kim ve ne zaman kaldırdığı saklanır.
  kaldiran_id       uuid REFERENCES kullanicilar (id),
  kaldirma_zamani   timestamptz,
  CHECK ((kisi_id IS NULL) <> (hayvan_id IS NULL))
);
CREATE INDEX hasta_uyarilari_kisi_idx ON hasta_uyarilari (kisi_id);
CREATE INDEX hasta_uyarilari_hayvan_idx ON hasta_uyarilari (hayvan_id);

-- Aydınlatma metninin hangi sürümünün, hangi kanalla, kim tarafından sunulduğu.
CREATE TABLE aydinlatma_kayitlari (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  isletme_id    uuid NOT NULL REFERENCES isletmeler (id),
  kisi_id       uuid NOT NULL REFERENCES kisiler (id),
  metin_kodu    text NOT NULL,
  metin_surumu  text NOT NULL,
  kanal         text NOT NULL,
  sunan_id      uuid REFERENCES kullanicilar (id),
  zaman         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX aydinlatma_kisi_idx ON aydinlatma_kayitlari (kisi_id);

-- Açık rıza geçmişi: her verme ve geri çekme yeni bir satırdır; güncel durum son satırdır.
CREATE TABLE rizalar (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  isletme_id    uuid NOT NULL REFERENCES isletmeler (id),
  kisi_id       uuid NOT NULL REFERENCES kisiler (id),
  riza_turu     text NOT NULL,
  verildi       boolean NOT NULL,
  kanal         text NOT NULL,
  metin_surumu  text NOT NULL,
  kaydeden_id   uuid REFERENCES kullanicilar (id),
  zaman         timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX rizalar_kisi_idx ON rizalar (kisi_id, riza_turu, zaman DESC);

ALTER TABLE kisiler              ENABLE ROW LEVEL SECURITY;
ALTER TABLE hayvanlar            ENABLE ROW LEVEL SECURITY;
ALTER TABLE hasta_uyarilari      ENABLE ROW LEVEL SECURITY;
ALTER TABLE aydinlatma_kayitlari ENABLE ROW LEVEL SECURITY;
ALTER TABLE rizalar              ENABLE ROW LEVEL SECURITY;

CREATE POLICY kiraci ON kisiler              USING (isletme_id = app_isletme_id()) WITH CHECK (isletme_id = app_isletme_id());
CREATE POLICY kiraci ON hayvanlar            USING (isletme_id = app_isletme_id()) WITH CHECK (isletme_id = app_isletme_id());
CREATE POLICY kiraci ON hasta_uyarilari      USING (isletme_id = app_isletme_id()) WITH CHECK (isletme_id = app_isletme_id());
CREATE POLICY kiraci ON aydinlatma_kayitlari USING (isletme_id = app_isletme_id()) WITH CHECK (isletme_id = app_isletme_id());
CREATE POLICY kiraci ON rizalar              USING (isletme_id = app_isletme_id()) WITH CHECK (isletme_id = app_isletme_id());

GRANT SELECT, INSERT, UPDATE ON kisiler, hayvanlar, hasta_uyarilari TO dc_app;
GRANT SELECT, INSERT ON aydinlatma_kayitlari, rizalar TO dc_app;
