export interface Ayarlar {
  veritabaniUrl: string;
  jwtGizli: string;
  port: number;
  /** Oturum çerezi yalnızca HTTPS üzerinden gönderilsin mi (üretimde her zaman evet). */
  guvenliCerez: boolean;
  /** Hassas alan şifreleme ana anahtarı (32 bayt). Kaybedilirse şifreli alanlar açılamaz. */
  alanAnahtari: Buffer;
}

/** Ortam değişkenlerini okur; eksik veya zayıf değerde uygulama başlamaz. */
export function ayarlariOku(env: NodeJS.ProcessEnv = process.env): Ayarlar {
  const veritabaniUrl = env.DATABASE_URL;
  if (!veritabaniUrl) throw new Error('DATABASE_URL tanımlı değil');
  const jwtGizli = env.JWT_SECRET ?? '';
  if (jwtGizli.length < 32) throw new Error('JWT_SECRET en az 32 karakter olmalı');
  const port = Number(env.PORT ?? 3000);
  if (!Number.isInteger(port) || port <= 0) throw new Error('PORT geçersiz');
  const guvenliCerez = env.NODE_ENV === 'production' || env.COOKIE_SECURE === 'true';
  const alanAnahtari = Buffer.from(env.ALAN_SIFRELEME_ANAHTARI ?? '', 'base64');
  if (alanAnahtari.length !== 32) throw new Error('ALAN_SIFRELEME_ANAHTARI base64 kodlu 32 bayt olmalı (openssl rand -base64 32)');
  return { veritabaniUrl, jwtGizli, port, guvenliCerez, alanAnahtari };
}

export const AYARLAR = Symbol('AYARLAR');
