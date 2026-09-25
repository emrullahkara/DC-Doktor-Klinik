/**
 * Klinik kayıt yardımcıları: vital bulgu aralıkları, ICD-10 başlangıç listesi, acil erişim gerekçeleri.
 */

export interface VitalTanimi {
  ad: string;
  birim: string;
  /** Girilebilecek (fizyolojik olarak mümkün) aralık */
  en: number;
  enFazla: number;
  /** Erişkin için olağan aralık; dışındaki değerler vurgulanır (klinik karar hekimindir) */
  olagan?: [number, number];
  ondalik?: boolean;
}

export const VITALLER = {
  tansiyonSistolik: { ad: 'Sistolik tansiyon', birim: 'mmHg', en: 50, enFazla: 260, olagan: [90, 139] },
  tansiyonDiastolik: { ad: 'Diastolik tansiyon', birim: 'mmHg', en: 30, enFazla: 160, olagan: [60, 89] },
  nabiz: { ad: 'Nabız', birim: '/dk', en: 20, enFazla: 250, olagan: [50, 100] },
  ates: { ad: 'Ateş', birim: '°C', en: 30, enFazla: 45, olagan: [36, 37.9], ondalik: true },
  spo2: { ad: 'SpO₂', birim: '%', en: 50, enFazla: 100, olagan: [94, 100] },
  solunum: { ad: 'Solunum', birim: '/dk', en: 5, enFazla: 60, olagan: [12, 20] },
  boy: { ad: 'Boy', birim: 'cm', en: 30, enFazla: 250 },
  kilo: { ad: 'Kilo', birim: 'kg', en: 0.5, enFazla: 400, ondalik: true },
  agri: { ad: 'Ağrı skoru', birim: '0–10', en: 0, enFazla: 10, olagan: [0, 3] },
} as const satisfies Record<string, VitalTanimi>;
export type VitalKodu = keyof typeof VITALLER;
export type Vitaller = Partial<Record<VitalKodu, number>>;

export function vitalOlaganDisiMi(kod: VitalKodu, deger: number): boolean {
  const tanim: VitalTanimi = VITALLER[kod];
  return !!tanim.olagan && (deger < tanim.olagan[0] || deger > tanim.olagan[1]);
}

/** Vücut kitle indeksi (kg/m²), bir ondalık. */
export function vkiHesapla(boyCm?: number, kiloKg?: number): number | null {
  if (!boyCm || !kiloKg) return null;
  return Math.round((kiloKg / (boyCm / 100) ** 2) * 10) / 10;
}

/**
 * ICD-10 başlangıç listesi (sık kullanılan tanılar). Tam ulusal liste, Sağlık Bakanlığı
 * Sağlık Kodlama Referans Sunucusu'ndan (SKRS) aktarılacaktır.
 */
export const ICD10_BASLANGIC: readonly { kod: string; ad: string }[] = [
  { kod: 'A09', ad: 'Enfeksiyöz kökenli olduğu varsayılan gastroenterit ve kolit' },
  { kod: 'B35.1', ad: 'Tırnak mantarı (tinea unguium)' },
  { kod: 'D50.9', ad: 'Demir eksikliği anemisi, tanımlanmamış' },
  { kod: 'E03.9', ad: 'Hipotiroidi, tanımlanmamış' },
  { kod: 'E11.9', ad: 'Tip 2 diabetes mellitus, komplikasyonsuz' },
  { kod: 'E66.9', ad: 'Obezite, tanımlanmamış' },
  { kod: 'E78.0', ad: 'Saf hiperkolesterolemi' },
  { kod: 'F32.9', ad: 'Depresif epizod, tanımlanmamış' },
  { kod: 'F41.1', ad: 'Yaygın anksiyete bozukluğu' },
  { kod: 'G43.9', ad: 'Migren, tanımlanmamış' },
  { kod: 'H10.9', ad: 'Konjonktivit, tanımlanmamış' },
  { kod: 'H66.9', ad: 'Otitis media, tanımlanmamış' },
  { kod: 'I10', ad: 'Esansiyel (primer) hipertansiyon' },
  { kod: 'I25.9', ad: 'Kronik iskemik kalp hastalığı, tanımlanmamış' },
  { kod: 'I48', ad: 'Atriyal fibrilasyon ve flutter' },
  { kod: 'J00', ad: 'Akut nazofarenjit (soğuk algınlığı)' },
  { kod: 'J02.9', ad: 'Akut farenjit, tanımlanmamış' },
  { kod: 'J03.9', ad: 'Akut tonsillit, tanımlanmamış' },
  { kod: 'J06.9', ad: 'Akut üst solunum yolu enfeksiyonu, tanımlanmamış' },
  { kod: 'J20.9', ad: 'Akut bronşit, tanımlanmamış' },
  { kod: 'J30.4', ad: 'Alerjik rinit, tanımlanmamış' },
  { kod: 'J45.9', ad: 'Astım, tanımlanmamış' },
  { kod: 'K02.9', ad: 'Diş çürüğü, tanımlanmamış' },
  { kod: 'K04.0', ad: 'Pulpitis' },
  { kod: 'K05.1', ad: 'Kronik gingivitis' },
  { kod: 'K07.3', ad: 'Diş pozisyon anomalileri' },
  { kod: 'K08.1', ad: 'Kaza, çekim veya lokal periodontal hastalığa bağlı diş kaybı' },
  { kod: 'K21.9', ad: 'Özofajitsiz gastroözofageal reflü hastalığı' },
  { kod: 'K29.7', ad: 'Gastrit, tanımlanmamış' },
  { kod: 'K30', ad: 'Dispepsi' },
  { kod: 'K59.0', ad: 'Kabızlık (konstipasyon)' },
  { kod: 'L20.9', ad: 'Atopik dermatit, tanımlanmamış' },
  { kod: 'L30.9', ad: 'Dermatit, tanımlanmamış' },
  { kod: 'L65.9', ad: 'Skar bırakmayan saç kaybı, tanımlanmamış' },
  { kod: 'L70.0', ad: 'Akne vulgaris' },
  { kod: 'L81.1', ad: 'Kloazma (melazma)' },
  { kod: 'M54.2', ad: 'Servikalji (boyun ağrısı)' },
  { kod: 'M54.5', ad: 'Bel ağrısı' },
  { kod: 'M79.1', ad: 'Miyalji' },
  { kod: 'N39.0', ad: 'İdrar yolu enfeksiyonu, yeri tanımlanmamış' },
  { kod: 'N76.0', ad: 'Akut vajinit' },
  { kod: 'N94.6', ad: 'Dismenore, tanımlanmamış' },
  { kod: 'R05', ad: 'Öksürük' },
  { kod: 'R10.4', ad: 'Diğer ve tanımlanmamış karın ağrıları' },
  { kod: 'R42', ad: 'Baş dönmesi' },
  { kod: 'R50.9', ad: 'Ateş, tanımlanmamış' },
  { kod: 'R51', ad: 'Baş ağrısı' },
  { kod: 'R53', ad: 'Halsizlik ve yorgunluk' },
  { kod: 'S93.4', ad: 'Ayak bileği burkulması ve gerilmesi' },
  { kod: 'T78.4', ad: 'Alerji, tanımlanmamış' },
  { kod: 'Z00.0', ad: 'Genel tıbbi muayene' },
  { kod: 'Z01.2', ad: 'Diş muayenesi' },
  { kod: 'Z23', ad: 'Aşılama ihtiyacı' },
  { kod: 'Z30.0', ad: 'Kontrasepsiyon için genel danışmanlık' },
  { kod: 'Z34.9', ad: 'Normal gebeliğin izlenmesi, tanımlanmamış' },
  { kod: 'Z41.1', ad: 'Kabul edilemeyen kozmetik görünüm için diğer plastik cerrahi' },
];

export const TANI_TURLERI = { on: 'Ön tanı', kesin: 'Kesin tanı' } as const;
export type TaniTuru = keyof typeof TANI_TURLERI;

/** Acil erişim (break-the-glass) gerekçeleri. Erişim süreli ve kayıtlıdır. */
export const ACIL_ERISIM_GEREKCELERI = {
  acil_mudahale: 'Acil müdahale',
  konsultasyon: 'Konsültasyon',
  nobet_devri: 'Nöbet / hasta devri',
} as const;
export type AcilErisimGerekcesi = keyof typeof ACIL_ERISIM_GEREKCELERI;
export const ACIL_ERISIM_SURESI_SAAT = 4;

export const MUAYENE_DURUMLARI = { taslak: 'Taslak', imzali: 'İmzalı' } as const;
export type MuayeneDurumu = keyof typeof MUAYENE_DURUMLARI;
