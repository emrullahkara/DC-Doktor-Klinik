/**
 * Kullanıcının meslek grubu. Yetki motorundaki kilitli yasal kurallar
 * (ör. yalnızca hekimin reçete yazabilmesi) bu bilgiye dayanır.
 */
export const MESLEKLER = {
  hekim: 'Hekim',
  dis_hekimi: 'Diş hekimi',
  veteriner_hekim: 'Veteriner hekim',
  hemsire: 'Hemşire',
  ebe: 'Ebe',
  saglik_teknikeri: 'Sağlık teknikeri / teknisyeni',
  veteriner_teknikeri: 'Veteriner sağlık teknikeri',
  psikolog: 'Psikolog',
  diyetisyen: 'Diyetisyen',
  fizyoterapist: 'Fizyoterapist',
  eczaci: 'Eczacı',
  estetisyen: 'Estetisyen / güzellik uzmanı',
  idari: 'İdari personel',
  destek: 'Destek personeli',
} as const;

export type Meslek = keyof typeof MESLEKLER;

/** Tanı koyabilen, reçete ve rapor yazabilen meslekler. */
export const HEKIM_MESLEKLERI: ReadonlySet<Meslek> = new Set<Meslek>([
  'hekim',
  'dis_hekimi',
  'veteriner_hekim',
]);

/**
 * Mesleki sır saklama yükümlülüğü altındaki sağlık meslek mensupları.
 * Tıbbi kayda (tedavi ilişkisi şartıyla) yalnızca bunlar erişebilir.
 */
export const SAGLIK_MESLEKLERI: ReadonlySet<Meslek> = new Set<Meslek>([
  ...HEKIM_MESLEKLERI,
  'hemsire',
  'ebe',
  'saglik_teknikeri',
  'veteriner_teknikeri',
  'psikolog',
  'diyetisyen',
  'fizyoterapist',
  'eczaci',
]);

export function meslekMi(deger: unknown): deger is Meslek {
  return typeof deger === 'string' && Object.prototype.hasOwnProperty.call(MESLEKLER, deger);
}
