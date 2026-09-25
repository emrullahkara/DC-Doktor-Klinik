-- 0001 — Çekirdek: işletme, şube, kullanıcı, rol ataması, denetim izi
--
-- Çok kiracılık: her tabloda isletme_id bulunur ve satır düzeyi güvenlik (RLS) ile
-- yalnızca oturumdaki işletmenin satırları görünür. Uygulama `dc_app` kullanıcısıyla
-- bağlanır ve her işlemde `app.isletme_id` ayarını yapar. Tablo sahibi (`dc_owner`)
-- yalnızca migration ve SECURITY DEFINER fonksiyonlar içindir.

CREATE FUNCTION app_isletme_id() RETURNS uuid
  LANGUAGE sql STABLE
  AS $$ SELECT nullif(current_setting('app.isletme_id', true), '')::uuid $$;

CREATE TABLE isletmeler (
  id               uuid PRIMARY KEY,
  unvan            text NOT NULL CHECK (length(trim(unvan)) > 0),
  vergi_no         text,
  olusturma_zamani timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE subeler (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  isletme_id       uuid NOT NULL REFERENCES isletmeler (id),
  ad               text NOT NULL CHECK (length(trim(ad)) > 0),
  kurum_tipleri    text[] NOT NULL CHECK (cardinality(kurum_tipleri) > 0),
  olusturma_zamani timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX subeler_isletme_idx ON subeler (isletme_id);

CREATE TABLE kullanicilar (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  isletme_id       uuid NOT NULL REFERENCES isletmeler (id),
  eposta           text NOT NULL,
  ad_soyad         text NOT NULL CHECK (length(trim(ad_soyad)) > 0),
  meslek           text NOT NULL,
  parola_ozeti     text NOT NULL,
  aktif            boolean NOT NULL DEFAULT true,
  olusturma_zamani timestamptz NOT NULL DEFAULT now()
);
-- Giriş e-posta ile yapıldığından e-posta tüm platformda tekildir.
CREATE UNIQUE INDEX kullanicilar_eposta_ux ON kullanicilar (lower(eposta));
CREATE INDEX kullanicilar_isletme_idx ON kullanicilar (isletme_id);

CREATE TABLE rol_atamalari (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  isletme_id       uuid NOT NULL REFERENCES isletmeler (id),
  kullanici_id     uuid NOT NULL REFERENCES kullanicilar (id),
  rol_kodu         text NOT NULL,
  -- NULL: işletmedeki tüm şubelerde geçerli
  sube_id          uuid REFERENCES subeler (id),
  atayan_id        uuid REFERENCES kullanicilar (id),
  olusturma_zamani timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (kullanici_id, rol_kodu, sube_id)
);
CREATE INDEX rol_atamalari_kullanici_idx ON rol_atamalari (kullanici_id);

-- Denetim izi: yalnızca eklenir, değiştirilemez, silinemez. Her kayıt, aynı işletmenin
-- bir önceki kaydının özetini içerir (hash zinciri); araya kayıt sokulması veya
-- değiştirilmesi zincirin doğrulanmasıyla tespit edilir.
CREATE TABLE denetim_izi (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  isletme_id   uuid NOT NULL REFERENCES isletmeler (id),
  zaman        timestamptz NOT NULL DEFAULT clock_timestamp(),
  kullanici_id uuid,
  eylem        text NOT NULL,
  varlik_tipi  text,
  varlik_id    text,
  sube_id      uuid,
  ip           text,
  ayrinti      jsonb NOT NULL DEFAULT '{}'::jsonb,
  onceki_ozet  text,
  ozet         text NOT NULL
);
CREATE INDEX denetim_izi_isletme_idx ON denetim_izi (isletme_id, id DESC);

CREATE FUNCTION denetim_izi_ozet_hesapla() RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public
  AS $$
BEGIN
  -- Aynı işletmeye eşzamanlı eklemelerde zincirin dallanmaması için kilit
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.isletme_id::text, 0));
  SELECT ozet INTO NEW.onceki_ozet
    FROM denetim_izi WHERE isletme_id = NEW.isletme_id ORDER BY id DESC LIMIT 1;
  NEW.ozet := encode(sha256(convert_to(concat_ws('|',
    coalesce(NEW.onceki_ozet, ''), NEW.isletme_id::text, NEW.zaman::text, coalesce(NEW.kullanici_id::text, ''),
    NEW.eylem, coalesce(NEW.varlik_tipi, ''), coalesce(NEW.varlik_id, ''), coalesce(NEW.sube_id::text, ''),
    coalesce(NEW.ip, ''), NEW.ayrinti::text), 'UTF8')), 'hex');
  RETURN NEW;
END $$;

CREATE TRIGGER denetim_izi_ozet BEFORE INSERT ON denetim_izi
  FOR EACH ROW EXECUTE FUNCTION denetim_izi_ozet_hesapla();

CREATE FUNCTION denetim_izi_degistirilemez() RETURNS trigger
  LANGUAGE plpgsql
  AS $$ BEGIN RAISE EXCEPTION 'denetim_izi kayıtları değiştirilemez veya silinemez'; END $$;

CREATE TRIGGER denetim_izi_koruma BEFORE UPDATE OR DELETE ON denetim_izi
  FOR EACH ROW EXECUTE FUNCTION denetim_izi_degistirilemez();

-- Satır düzeyi güvenlik
ALTER TABLE isletmeler    ENABLE ROW LEVEL SECURITY;
ALTER TABLE subeler       ENABLE ROW LEVEL SECURITY;
ALTER TABLE kullanicilar  ENABLE ROW LEVEL SECURITY;
ALTER TABLE rol_atamalari ENABLE ROW LEVEL SECURITY;
ALTER TABLE denetim_izi   ENABLE ROW LEVEL SECURITY;

CREATE POLICY kiraci ON isletmeler    USING (id = app_isletme_id()) WITH CHECK (id = app_isletme_id());
CREATE POLICY kiraci ON subeler       USING (isletme_id = app_isletme_id()) WITH CHECK (isletme_id = app_isletme_id());
CREATE POLICY kiraci ON kullanicilar  USING (isletme_id = app_isletme_id()) WITH CHECK (isletme_id = app_isletme_id());
CREATE POLICY kiraci ON rol_atamalari USING (isletme_id = app_isletme_id()) WITH CHECK (isletme_id = app_isletme_id());
CREATE POLICY kiraci ON denetim_izi   USING (isletme_id = app_isletme_id()) WITH CHECK (isletme_id = app_isletme_id());

-- Giriş anında işletme henüz bilinmediğinden kullanıcı e-posta ile bu fonksiyon üzerinden
-- bulunur. Yalnızca giriş için gereken alanları döndürür.
CREATE FUNCTION giris_bilgisi(p_eposta text)
  RETURNS TABLE (id uuid, isletme_id uuid, parola_ozeti text, aktif boolean)
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = public
  AS $$
    SELECT k.id, k.isletme_id, k.parola_ozeti, k.aktif
      FROM kullanicilar k WHERE lower(k.eposta) = lower(p_eposta)
  $$;
REVOKE ALL ON FUNCTION giris_bilgisi(text) FROM PUBLIC;

-- Uygulama kullanıcısının yetkileri (en az yetki)
GRANT USAGE ON SCHEMA public TO dc_app;
GRANT SELECT, INSERT, UPDATE ON isletmeler, subeler, kullanicilar TO dc_app;
GRANT SELECT, INSERT, DELETE ON rol_atamalari TO dc_app;
GRANT SELECT, INSERT ON denetim_izi TO dc_app;
GRANT EXECUTE ON FUNCTION giris_bilgisi(text), app_isletme_id() TO dc_app;
