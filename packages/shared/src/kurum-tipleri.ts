/**
 * Kurum Tipi Profilleri (docs/11-alinan-kararlar.md, K2).
 * Profiller kod değil veridir: yeni bir kurum tipi yalnızca bu listeye eklenerek tanımlanır.
 */
export interface KurumTipiProfili {
  ad: string;
  aciklama: string;
  /** false: hayvan sağlığı (veteriner) — insan sağlığı ile aynı şubede açılamaz */
  insanSagligi: boolean;
  moduller: readonly string[];
  roller: readonly string[];
  belgeler: readonly string[];
  entegrasyonlar: readonly string[];
}

/** Her kurum tipinde açılan çekirdek modüller. */
export const CEKIRDEK_MODULLER = [
  'Komuta Merkezi',
  'Hasta kaydı ve KVKK rızası',
  'Randevu ve kabul',
  'Tahsilat, kasa ve fatura',
] as const;

export const KURUM_TIPLERI = {
  muayenehane: {
    ad: 'Muayenehane',
    aciklama: 'Tek hekimli özel muayenehane',
    insanSagligi: true,
    moduller: ['Muayene kaydı ve e-Reçete', 'Onam formları'],
    roller: ['Hekim (sahip ve mesul)', 'Sekreter'],
    belgeler: ['Muayenehane ruhsatı', 'Oda kaydı', 'Malpraktis sigortası'],
    entegrasyonlar: ['e-Nabız / USS', 'e-Reçete', 'e-SMM'],
  },
  tip_merkezi: {
    ad: 'Poliklinik / Tıp Merkezi',
    aciklama: 'Birden fazla hekim ve branş, laboratuvar, görüntüleme',
    insanSagligi: true,
    moduller: [
      'Muayene kaydı ve e-Reçete', 'Onam formları', 'Laboratuvar ve görüntüleme', 'Personel, nöbet ve vardiya',
      'Stok ve ilaç', 'Hekim hakedişi', 'Kalite (SKS) ve olay bildirimi',
    ],
    roller: ['Mesul müdür', 'Başhekim', 'Hekim', 'Hemşire', 'Sekreter', 'Muhasebe'],
    belgeler: [
      'Faaliyet izin belgesi', 'Mesul müdür belgesi', 'Personel çalışma belgeleri (ÇKYS)', 'Tıbbi atık sözleşmesi',
      'Malpraktis sigortası',
    ],
    entegrasyonlar: ['e-Nabız / USS', 'e-Reçete', 'e-Fatura', 'MEDULA (SGK anlaşmalıysa)'],
  },
  dis: {
    ad: 'Ağız ve Diş Sağlığı',
    aciklama: 'Diş muayenehanesi, poliklinik veya merkezi',
    insanSagligi: true,
    moduller: [
      'Diş şeması (odontogram)', 'Tedavi planı ve teklif', 'Protez laboratuvarı takibi', 'Taksitli ödeme planı',
      'Sterilizasyon takibi', 'Radyasyon güvenliği',
    ],
    roller: ['Diş hekimi', 'Ağız-diş asistanı'],
    belgeler: ['NDK röntgen lisansı', 'Personel dozimetre takibi', 'Malpraktis sigortası'],
    entegrasyonlar: ['e-Nabız / USS', 'e-Reçete', 'ÜTS (implant)'],
  },
  estetik: {
    ad: 'Estetik / Medikal Estetik',
    aciklama: 'Dolgu, botoks, lazer, cilt uygulamaları',
    insanSagligi: true,
    moduller: [
      'Seans ve paket yönetimi', 'Ürün lot takibi (dolgu, botoks)', 'Önce/sonra fotoğraf (rıza kontrollü)',
      'Lazer cihaz parametre kaydı', 'Reklam uyum kontrolü',
    ],
    roller: ['Estetisyen (kısıtlı yetki)', 'Satış danışmanı'],
    belgeler: ['İşlem sertifikaları', 'Lazer cihaz bakım kayıtları'],
    entegrasyonlar: ['ÜTS (dolgu, iplik)'],
  },
  fizik_danismanlik: {
    ad: 'Fizik Tedavi / Danışmanlık',
    aciklama: 'Fizyoterapi, diyet, psikoloji, konuşma terapisi',
    insanSagligi: true,
    moduller: ['Seans ve program takibi', 'Paket satış', 'Ölçek ve ilerleme takibi'],
    roller: ['Fizyoterapist', 'Diyetisyen', 'Psikolog'],
    belgeler: ['Meslek diploması ve sertifikalar'],
    entegrasyonlar: [],
  },
  veteriner: {
    ad: 'Veteriner Klinik',
    aciklama: 'Muayenehane, poliklinik, hayvan hastanesi, pet-shop',
    insanSagligi: false,
    moduller: [
      'Sahip ve hayvan kaydı', 'Aşı karnesi ve hatırlatma', 'Yatılı tedavi ve kafes haritası', 'Pansiyon',
      'Pet-shop satış', 'Ötanazi onam süreci', 'Stok ve ilaç',
    ],
    roller: ['Sorumlu veteriner hekim', 'Veteriner hekim', 'Veteriner teknikeri', 'Sekreter'],
    belgeler: ['Veteriner kuruluş ruhsatı', 'Oda kaydı'],
    entegrasyonlar: ['Hayvan kayıt sistemi (mikroçip, kuduz)', 'Veteriner reçete sistemi', 'e-Fatura'],
  },
  evde_saglik: {
    ad: 'Evde Sağlık',
    aciklama: 'Ev ziyareti yapan saha ekipleri',
    insanSagligi: true,
    moduller: ['Ziyaret planı ve rota', 'GPS ile ziyaret doğrulama', 'Cihaz zimmet ve kiralama', 'Araç takibi', 'Uzaktan izlem'],
    roller: ['Koordinatör', 'Saha hemşiresi', 'Hekim', 'Şoför'],
    belgeler: ['Evde sağlık izin belgesi', 'Araç muayene ve sigorta'],
    entegrasyonlar: ['e-Nabız / USS'],
  },
} as const satisfies Record<string, KurumTipiProfili>;

export type KurumTipi = keyof typeof KURUM_TIPLERI;

export function kurumTipiMi(deger: unknown): deger is KurumTipi {
  return typeof deger === 'string' && Object.prototype.hasOwnProperty.call(KURUM_TIPLERI, deger);
}

export interface BirlesikProfil {
  kurumTipleri: KurumTipi[];
  moduller: string[];
  roller: string[];
  belgeler: string[];
  entegrasyonlar: string[];
}

function tekil(liste: readonly string[]): string[] {
  return [...new Set(liste)];
}

/** Seçilen kurum tiplerinin profillerini tek profilde birleştirir (tekrarsız, sıralı). */
export function profilBirlestir(tipler: readonly KurumTipi[]): BirlesikProfil {
  const secilen = tekil(tipler) as KurumTipi[];
  const profiller = secilen.map((t) => KURUM_TIPLERI[t]);
  return {
    kurumTipleri: secilen,
    moduller: tekil([...CEKIRDEK_MODULLER, ...profiller.flatMap((p) => p.moduller)]),
    roller: tekil(profiller.flatMap((p) => p.roller)),
    belgeler: tekil(profiller.flatMap((p) => p.belgeler)),
    entegrasyonlar: tekil(profiller.flatMap((p) => p.entegrasyonlar)),
  };
}

/**
 * Kurum tiplerini şubelere dağıtır. Veteriner ve insan sağlığı aynı şubede açılamaz:
 * ikisi birlikte seçildiyse iki ayrı şube grubu döner.
 */
export function subelereAyir(tipler: readonly KurumTipi[]): KurumTipi[][] {
  const secilen = tekil(tipler) as KurumTipi[];
  const insan = secilen.filter((t) => KURUM_TIPLERI[t].insanSagligi);
  const hayvan = secilen.filter((t) => !KURUM_TIPLERI[t].insanSagligi);
  return [insan, hayvan].filter((grup) => grup.length > 0);
}
