import type { Izin } from './izinler';
import type { Meslek } from './meslekler';

export const KAYNAK_TURLERI = {
  oda: 'Muayene odası',
  unit: 'Diş ünitesi',
  cihaz: 'Cihaz (lazer, röntgen…)',
  kafes: 'Kafes / bölme',
  salon: 'İşlem / ameliyat salonu',
  arac: 'Araç (evde sağlık)',
} as const;
export type KaynakTuru = keyof typeof KAYNAK_TURLERI;

export const RANDEVU_TURLERI = {
  ilk_muayene: 'İlk muayene',
  kontrol: 'Kontrol',
  islem: 'İşlem',
  seans: 'Seans',
  asi: 'Aşı',
  ev_ziyareti: 'Ev ziyareti',
  online: 'Online görüşme',
} as const;
export type RandevuTuru = keyof typeof RANDEVU_TURLERI;

/**
 * Randevu durumları (ekrandaki adlarıyla):
 * planlandi → Bekleniyor, geldi → Salonda bekliyor, muayenede → Muayenede / işlemde,
 * tamamlandi → Tamamlandı, gelmedi → Gelmedi, iptal → İptal
 */
export const RANDEVU_DURUMLARI = {
  planlandi: 'Bekleniyor',
  geldi: 'Salonda bekliyor',
  muayenede: 'Muayenede / işlemde',
  tamamlandi: 'Tamamlandı',
  gelmedi: 'Gelmedi',
  iptal: 'İptal',
} as const;
export type RandevuDurumu = keyof typeof RANDEVU_DURUMLARI;

/** İzin verilen durum geçişleri. Tamamlanan, gelmeyen ve iptal edilen randevu kapanmıştır. */
export const DURUM_GECISLERI: Record<RandevuDurumu, readonly RandevuDurumu[]> = {
  planlandi: ['geldi', 'gelmedi', 'iptal'],
  geldi: ['muayenede', 'iptal'],
  muayenede: ['tamamlandi'],
  tamamlandi: [],
  gelmedi: [],
  iptal: [],
};

export function durumGecisiGecerliMi(eski: RandevuDurumu, yeni: RandevuDurumu): boolean {
  return DURUM_GECISLERI[eski].includes(yeni);
}

/**
 * Geçişi yapabilmek için gereken izinlerden biri. Hastayı muayeneye alma ve bitirme işini
 * hekim/sağlık personeli de yapar; kabul, gelmedi ve iptal resepsiyonun işidir.
 */
export const DURUM_IZINLERI: Record<RandevuDurumu, readonly Izin[]> = {
  planlandi: ['randevu.yonet'],
  geldi: ['randevu.yonet'],
  muayenede: ['randevu.yonet', 'tibbi.kayit.yaz'],
  tamamlandi: ['randevu.yonet', 'tibbi.kayit.yaz'],
  gelmedi: ['randevu.yonet'],
  iptal: ['randevu.yonet'],
};

/** Çakışma kontrolünde yer tutmayan (serbest bırakılmış) durumlar. */
export const YER_TUTMAYAN_DURUMLAR: readonly RandevuDurumu[] = ['iptal', 'gelmedi'];

/** Kurumların saat dilimi. Türkiye 2016'dan beri yıl boyu UTC+3'tür. */
export const KURUM_SAAT_DILIMI = 'Europe/Istanbul';

/** Adına randevu verilebilen (takvimi olan) meslekler. */
export const RANDEVU_ALAN_MESLEKLER: readonly Meslek[] = ['hekim', 'dis_hekimi', 'veteriner_hekim', 'psikolog', 'diyetisyen', 'fizyoterapist'];
