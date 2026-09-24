export interface Ayarlar {
  veritabaniUrl: string;
  jwtGizli: string;
  port: number;
}

/** Ortam değişkenlerini okur; eksik veya zayıf değerde uygulama başlamaz. */
export function ayarlariOku(env: NodeJS.ProcessEnv = process.env): Ayarlar {
  const veritabaniUrl = env.DATABASE_URL;
  if (!veritabaniUrl) throw new Error('DATABASE_URL tanımlı değil');
  const jwtGizli = env.JWT_SECRET ?? '';
  if (jwtGizli.length < 32) throw new Error('JWT_SECRET en az 32 karakter olmalı');
  const port = Number(env.PORT ?? 3000);
  if (!Number.isInteger(port) || port <= 0) throw new Error('PORT geçersiz');
  return { veritabaniUrl, jwtGizli, port };
}

export const AYARLAR = Symbol('AYARLAR');
