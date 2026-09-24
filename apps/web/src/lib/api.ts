import { metin } from '@/metin';

export class ApiHatasi extends Error {
  constructor(
    readonly durum: number,
    readonly kod: string,
    mesaj: string,
    readonly ayrinti?: unknown,
  ) {
    super(mesaj);
  }

  /** Alan bazındaki doğrulama hataları: { 'sahip.eposta': 'Geçerli bir e-posta girin.' } */
  alanHatalari(): Record<string, string> {
    if (this.kod !== 'GECERSIZ_ISTEK' || !Array.isArray(this.ayrinti)) return {};
    return Object.fromEntries((this.ayrinti as { alan: string; mesaj: string }[]).map((h) => [h.alan, h.mesaj]));
  }
}

interface Secenekler {
  yontem?: 'GET' | 'POST' | 'PATCH';
  govde?: unknown;
  /** Verilmezse paneldeki seçili şube kullanılır. */
  subeId?: string | null;
}

let seciliSube: string | null = null;

/** Paneldeki şube seçimi değiştiğinde çağrılır; sonraki istekler bu şube bağlamında yapılır. */
export function seciliSubeAyarla(id: string | null): void {
  seciliSube = id;
}

/**
 * API çağrısı. Oturum httpOnly çerezde taşındığından betik anahtara hiç dokunmaz.
 * İstekler aynı adres üzerinden (/api/v1) yapılır; Next.js API sunucusuna aktarır.
 */
export async function api<T>(yol: string, { yontem = 'GET', govde, subeId }: Secenekler = {}): Promise<T> {
  const basliklar: Record<string, string> = {};
  const formMu = govde instanceof FormData;
  if (govde !== undefined && !formMu) basliklar['content-type'] = 'application/json';
  const sube = subeId === undefined ? seciliSube : subeId;
  if (sube) basliklar['x-sube-id'] = sube;

  let yanit: Response;
  try {
    yanit = await fetch(`/api/v1${yol}`, {
      method: yontem,
      headers: basliklar,
      body: govde === undefined ? undefined : formMu ? govde : JSON.stringify(govde),
      credentials: 'same-origin',
      cache: 'no-store',
    });
  } catch {
    throw new ApiHatasi(0, 'BAGLANTI', metin.genel.baglantiHatasi);
  }

  if (yanit.status === 204) return undefined as T;
  const icerik: unknown = await yanit.json().catch(() => null);
  if (!yanit.ok) {
    const h = (icerik ?? {}) as { kod?: string; mesaj?: string; ayrinti?: unknown };
    const kod = h.kod ?? 'BILINMIYOR';
    throw new ApiHatasi(yanit.status, kod, metin.hatalar[kod] ?? h.mesaj ?? metin.genel.beklenmeyenHata, h.ayrinti);
  }
  return icerik as T;
}

/** Dosyayı (ör. belge) indirir; yetki ve denetim kaydı API'de. */
export async function dosyaIndir(yol: string, ad: string): Promise<void> {
  const basliklar: Record<string, string> = {};
  if (seciliSube) basliklar['x-sube-id'] = seciliSube;
  const yanit = await fetch(`/api/v1${yol}`, { headers: basliklar, credentials: 'same-origin', cache: 'no-store' }).catch(() => null);
  if (!yanit) throw new ApiHatasi(0, 'BAGLANTI', metin.genel.baglantiHatasi);
  if (!yanit.ok) {
    const h = ((await yanit.json().catch(() => null)) ?? {}) as { kod?: string; mesaj?: string };
    const kod = h.kod ?? 'BILINMIYOR';
    throw new ApiHatasi(yanit.status, kod, metin.hatalar[kod] ?? h.mesaj ?? metin.genel.beklenmeyenHata);
  }
  const adres = URL.createObjectURL(await yanit.blob());
  const baglanti = Object.assign(document.createElement('a'), { href: adres, download: ad });
  document.body.append(baglanti);
  baglanti.click();
  baglanti.remove();
  setTimeout(() => URL.revokeObjectURL(adres), 10_000);
}

export function hataMesaji(hata: unknown): string {
  return hata instanceof ApiHatasi ? hata.message : metin.genel.beklenmeyenHata;
}
