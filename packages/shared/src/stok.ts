import { type AlarmSeviyesi, belgeDurumu } from './belge';

/**
 * Stok ve ilaç (docs/moduller/05-ilac-stok-cihaz.md). Stok, değiştirilemez hareket defteridir:
 * bakiye = hareketlerin toplamı (şube + ürün + lot). Düzeltme de bir harekettir (sayım farkı).
 */

export const URUN_TIPLERI = {
  ilac: 'İlaç',
  asi: 'Aşı',
  sarf: 'Tıbbi sarf',
  implant: 'Tıbbi cihaz / implant',
  dental: 'Dental malzeme',
  estetik: 'Estetik ürün',
  lab: 'Laboratuvar kiti',
  temizlik: 'Temizlik / dezenfektan',
  diger: 'Diğer',
} as const;
export type UrunTipi = keyof typeof URUN_TIPLERI;

/** Kontrol statüsü: narkotik ve psikotrop hareketleri şahitli ve yetkili kişiyle yapılır */
export const KONTROL_DURUMLARI = {
  normal: 'Normal',
  yuksek_riskli: 'Yüksek riskli',
  psikotrop: 'Psikotrop (yeşil reçete)',
  narkotik: 'Narkotik (kırmızı reçete)',
} as const;
export type KontrolDurumu = keyof typeof KONTROL_DURUMLARI;

export const kontrolluMu = (k: string) => k === 'narkotik' || k === 'psikotrop';

export const SAKLAMA_KOSULLARI = {
  oda: 'Oda sıcaklığı',
  soguk: 'Soğuk zincir (2–8 °C)',
  dondurucu: 'Dondurucu',
} as const;
export type SaklamaKosulu = keyof typeof SAKLAMA_KOSULLARI;

export const BIRIMLER = ['adet', 'kutu', 'ampul', 'flakon', 'ml', 'mg', 'paket', 'şırınga', 'tablet'] as const;

/**
 * Hareket türleri ve yönü. Kullanım hastaya uygulamadır (lot → hasta izlenebilirliği);
 * fire kırılma, SKT, kontaminasyon; sayım farkı onaylı düzeltmedir.
 */
export const HAREKET_TURLERI = {
  giris: { ad: 'Giriş (mal kabul)', yon: 1 },
  kullanim: { ad: 'Hastaya kullanım', yon: -1 },
  fire: { ad: 'Fire / imha', yon: -1 },
  iade: { ad: 'Tedarikçiye iade', yon: -1 },
  sayim: { ad: 'Sayım düzeltmesi', yon: 0 },
} as const;
export type HareketTuru = keyof typeof HAREKET_TURLERI;

/** SKT uyarı eşikleri (gün): 90 depo, 30 başhemşire; geçmiş ürün kullanıma kapalı */
export const SKT_UYARI_GUNLERI = [90, 30] as const;

export function sktDurumu(skt: string | null, bugun: string) {
  return belgeDurumu(skt, bugun, SKT_UYARI_GUNLERI);
}

export interface Lot {
  lot: string;
  skt: string | null;
  bakiye: number;
}

/** FEFO: ilk bitecek ilk çıkar. SKT'si geçmiş ve bakiyesi olmayan lotlar önerilmez. */
export function fefoSirala<T extends Lot>(lotlar: readonly T[], bugun: string): T[] {
  return lotlar
    .filter((l) => l.bakiye > 0 && (!l.skt || l.skt >= bugun))
    .sort((a, b) => (a.skt ?? '9999-12-31').localeCompare(b.skt ?? '9999-12-31') || a.lot.localeCompare(b.lot));
}

/** Kritik stok: minimum seviyenin altı ciddi, hiç kalmadıysa kritik */
export function stokSeviyesi(bakiye: number, minSeviye: number): AlarmSeviyesi | null {
  if (minSeviye <= 0) return null;
  if (bakiye <= 0) return 'kritik';
  if (bakiye < minSeviye) return 'ciddi';
  return null;
}

/** Miktar: en çok 3 ondalık (ml, mg); stok kayan nokta hatası olmadan binde bir birimle tutulur */
export const miktarBinde = (m: number) => Math.round(m * 1000);
export const bindeMiktar = (b: number) => b / 1000;
