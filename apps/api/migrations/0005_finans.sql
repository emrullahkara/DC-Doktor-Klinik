-- 0005 — Finans: hizmet kataloğu, fiyat onayı, hasta hesabı, tahsilat/iade, gün sonu kasa.
--
-- Tutarlar kuruş cinsinden tam sayıdır. Finansal kayıtlar silinmez: kalemler gerekçeyle iptal
-- edilir, tahsilatlar ters kayıtla (iade) düzeltilir.

CREATE TABLE hizmetler (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  isletme_id        uuid NOT NULL REFERENCES isletmeler (id),
  kod               text NOT NULL CHECK (length(trim(kod)) > 0),
  ad                text NOT NULL CHECK (length(trim(ad)) > 0),
  kategori          text NOT NULL,
  kdv_orani         integer NOT NULL CHECK (kdv_orani IN (0, 1, 10, 20)),
  -- KDV dahil satış fiyatı. Onay bekleyen yeni hizmette önerilen fiyat.
  fiyat_kurus       bigint NOT NULL CHECK (fiyat_kurus >= 0),
  -- Fiyatı onaylanana kadar hizmet hesaba eklenemez
  aktif             boolean NOT NULL DEFAULT false,
  olusturan_id      uuid REFERENCES kullanicilar (id),
  olusturma_zamani  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (isletme_id, kod)
);

-- Fiyat belirleme/değiştirme talepleri (dört göz): talep eden onaylayamaz.
CREATE TABLE fiyat_talepleri (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  isletme_id        uuid NOT NULL REFERENCES isletmeler (id),
  hizmet_id         uuid NOT NULL REFERENCES hizmetler (id),
  eski_fiyat_kurus  bigint,
  yeni_fiyat_kurus  bigint NOT NULL CHECK (yeni_fiyat_kurus >= 0),
  durum             text NOT NULL DEFAULT 'bekliyor' CHECK (durum IN ('bekliyor', 'onaylandi', 'reddedildi')),
  talep_eden_id     uuid NOT NULL REFERENCES kullanicilar (id),
  talep_zamani      timestamptz NOT NULL DEFAULT now(),
  karar_veren_id    uuid REFERENCES kullanicilar (id),
  karar_zamani      timestamptz,
  CHECK (karar_veren_id IS NULL OR karar_veren_id <> talep_eden_id)
);
CREATE INDEX fiyat_talepleri_bekleyen_idx ON fiyat_talepleri (isletme_id) WHERE durum = 'bekliyor';

-- Hasta hesabına eklenen hizmet kalemleri (fiyat ve ad eklendiği andaki hâliyle saklanır).
CREATE TABLE hesap_kalemleri (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  isletme_id          uuid NOT NULL REFERENCES isletmeler (id),
  sube_id             uuid NOT NULL REFERENCES subeler (id),
  kisi_id             uuid NOT NULL REFERENCES kisiler (id),
  randevu_id          uuid REFERENCES randevular (id),
  hizmet_id           uuid NOT NULL REFERENCES hizmetler (id),
  ad                  text NOT NULL,
  birim_fiyat_kurus   bigint NOT NULL CHECK (birim_fiyat_kurus >= 0),
  adet                integer NOT NULL CHECK (adet BETWEEN 1 AND 100),
  kdv_orani           integer NOT NULL,
  indirim_yuzde       numeric(5, 2) NOT NULL DEFAULT 0 CHECK (indirim_yuzde BETWEEN 0 AND 100),
  indirim_kurus       bigint NOT NULL DEFAULT 0,
  indirim_nedeni      text,
  tutar_kurus         bigint NOT NULL CHECK (tutar_kurus >= 0),
  ekleyen_id          uuid NOT NULL REFERENCES kullanicilar (id),
  zaman               timestamptz NOT NULL DEFAULT now(),
  iptal_eden_id       uuid REFERENCES kullanicilar (id),
  iptal_zamani        timestamptz,
  iptal_nedeni        text,
  CHECK (tutar_kurus = birim_fiyat_kurus * adet - indirim_kurus),
  CHECK (indirim_kurus = 0 OR indirim_nedeni IS NOT NULL)
);
CREATE INDEX hesap_kalemleri_kisi_idx ON hesap_kalemleri (kisi_id);

-- Tahsilat (+) ve iade (−) hareketleri. İade, bir tahsilata bağlıdır.
CREATE TABLE tahsilatlar (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  isletme_id          uuid NOT NULL REFERENCES isletmeler (id),
  sube_id             uuid NOT NULL REFERENCES subeler (id),
  kisi_id             uuid NOT NULL REFERENCES kisiler (id),
  tutar_kurus         bigint NOT NULL CHECK (tutar_kurus <> 0),
  odeme_turu          text NOT NULL CHECK (odeme_turu IN ('nakit', 'kredi_karti', 'havale', 'diger')),
  kasa_gunu           date NOT NULL,
  aciklama            text NOT NULL DEFAULT '',
  iade_edilen_id      uuid REFERENCES tahsilatlar (id),
  alan_id             uuid NOT NULL REFERENCES kullanicilar (id),
  zaman               timestamptz NOT NULL DEFAULT now(),
  CHECK ((tutar_kurus < 0) = (iade_edilen_id IS NOT NULL))
);
CREATE INDEX tahsilatlar_kisi_idx ON tahsilatlar (kisi_id);
CREATE INDEX tahsilatlar_kasa_idx ON tahsilatlar (sube_id, kasa_gunu);

CREATE TABLE kasa_kapanislari (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  isletme_id           uuid NOT NULL REFERENCES isletmeler (id),
  sube_id              uuid NOT NULL REFERENCES subeler (id),
  gun                  date NOT NULL,
  beklenen_nakit_kurus bigint NOT NULL,
  sayilan_nakit_kurus  bigint NOT NULL CHECK (sayilan_nakit_kurus >= 0),
  fark_kurus           bigint NOT NULL,
  aciklama             text NOT NULL DEFAULT '',
  kapatan_id           uuid NOT NULL REFERENCES kullanicilar (id),
  zaman                timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sube_id, gun),
  CHECK (fark_kurus = sayilan_nakit_kurus - beklenen_nakit_kurus)
);

ALTER TABLE hizmetler         ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiyat_talepleri   ENABLE ROW LEVEL SECURITY;
ALTER TABLE hesap_kalemleri   ENABLE ROW LEVEL SECURITY;
ALTER TABLE tahsilatlar       ENABLE ROW LEVEL SECURITY;
ALTER TABLE kasa_kapanislari  ENABLE ROW LEVEL SECURITY;
CREATE POLICY kiraci ON hizmetler        USING (isletme_id = app_isletme_id()) WITH CHECK (isletme_id = app_isletme_id());
CREATE POLICY kiraci ON fiyat_talepleri  USING (isletme_id = app_isletme_id()) WITH CHECK (isletme_id = app_isletme_id());
CREATE POLICY kiraci ON hesap_kalemleri  USING (isletme_id = app_isletme_id()) WITH CHECK (isletme_id = app_isletme_id());
CREATE POLICY kiraci ON tahsilatlar      USING (isletme_id = app_isletme_id()) WITH CHECK (isletme_id = app_isletme_id());
CREATE POLICY kiraci ON kasa_kapanislari USING (isletme_id = app_isletme_id()) WITH CHECK (isletme_id = app_isletme_id());

GRANT SELECT, INSERT, UPDATE ON hizmetler, fiyat_talepleri, hesap_kalemleri TO dc_app;
-- Tahsilat ve kasa kapanışı değiştirilemez; düzeltme ters kayıtla yapılır.
GRANT SELECT, INSERT ON tahsilatlar, kasa_kapanislari TO dc_app;
