import type { Izin } from './izinler';
import type { KurumTipi } from './kurum-tipleri';
import { HEKIM_MESLEKLERI, type Meslek, MESLEKLER, SAGLIK_MESLEKLERI } from './meslekler';

/**
 * Personel ve kurum belgeleri kataloğu (docs/moduller/04-personel-nobet.md §1.2, docs/03-komuta-merkezi.md §3).
 *
 * - `sureli`: belgenin bitiş tarihi zorunludur ve alarm motoru bu tarihe göre uyarır.
 * - `zorunlu`: kimlerde / hangi kurum tiplerinde eksikliği alarm üretir.
 * - `askiyaAlir`: belgenin süresi geçerse kişinin bu izinleri otomatik askıya alınır.
 *   Yalnızca süresi geçmiş belge askıya alır; hiç yüklenmemiş belge uyarı üretir (yeni açılan
 *   kurumun ilk gün kilitlenmemesi için).
 */

const TUM_MESLEKLER = Object.keys(MESLEKLER) as Meslek[];
const HEKIMLER = [...HEKIM_MESLEKLERI];
const SAGLIKCILAR = [...SAGLIK_MESLEKLERI];
/** Sağlık Bakanlığı'na bağlı (insan sağlığı) sağlık meslek mensupları */
const INSAN_SAGLIKCILARI = SAGLIKCILAR.filter((m) => m !== 'veteriner_hekim' && m !== 'veteriner_teknikeri');

/** Süresi geçen hekimlik güvencesiyle yapılamayacak klinik işlemler */
const KLINIK_ISLEM_IZINLERI: readonly Izin[] = ['tani.koy', 'recete.yaz', 'rapor.yaz', 'onam.al', 'tibbi.kayit.yaz'];

export interface PersonelBelgeTuru {
  ad: string;
  sureli: boolean;
  /** Bu mesleklerde eksikse alarm üretir */
  zorunluMeslekler: readonly Meslek[];
  /** Bu mesleklerde listelenir (zorunlu olmasa da önerilir) */
  meslekler: readonly Meslek[];
  askiyaAlir?: readonly Izin[];
}

export const PERSONEL_BELGE_TURLERI = {
  diploma_tescil: { ad: 'Diploma ve Bakanlık tescili', sureli: false, zorunluMeslekler: SAGLIKCILAR, meslekler: SAGLIKCILAR },
  uzmanlik_belgesi: { ad: 'Uzmanlık belgesi', sureli: false, zorunluMeslekler: [], meslekler: HEKIMLER },
  calisma_belgesi: { ad: 'Personel çalışma belgesi (ÇKYS)', sureli: false, zorunluMeslekler: INSAN_SAGLIKCILARI, meslekler: INSAN_SAGLIKCILARI },
  oda_kaydi: { ad: 'Meslek odası kaydı', sureli: true, zorunluMeslekler: HEKIMLER, meslekler: HEKIMLER },
  malpraktis_sigortasi: {
    ad: 'Zorunlu mali sorumluluk (malpraktis) sigortası',
    sureli: true,
    zorunluMeslekler: ['hekim', 'dis_hekimi'],
    meslekler: SAGLIKCILAR,
    askiyaAlir: KLINIK_ISLEM_IZINLERI,
  },
  yasam_destegi: { ad: 'Temel / ileri yaşam desteği sertifikası', sureli: true, zorunluMeslekler: [], meslekler: SAGLIKCILAR },
  radyasyon_egitimi: { ad: 'Radyasyon güvenliği eğitimi', sureli: true, zorunluMeslekler: [], meslekler: SAGLIKCILAR },
  islem_sertifikasi: { ad: 'İşlem sertifikası (lazer, medikal estetik, GETAT…)', sureli: true, zorunluMeslekler: [], meslekler: [...SAGLIKCILAR, 'estetisyen'] },
  hepatit_b: { ad: 'Hepatit B aşı / titre kaydı', sureli: true, zorunluMeslekler: [], meslekler: [...SAGLIKCILAR, 'destek'] },
  periyodik_muayene: { ad: 'Periyodik sağlık muayenesi (İSG)', sureli: true, zorunluMeslekler: TUM_MESLEKLER, meslekler: TUM_MESLEKLER },
  isg_egitimi: { ad: 'İş sağlığı ve güvenliği temel eğitimi', sureli: true, zorunluMeslekler: TUM_MESLEKLER, meslekler: TUM_MESLEKLER },
  gizlilik_taahhudu: { ad: 'Gizlilik ve KVKK taahhütnamesi', sureli: false, zorunluMeslekler: TUM_MESLEKLER, meslekler: TUM_MESLEKLER },
  is_sozlesmesi: { ad: 'İş / hizmet sözleşmesi', sureli: false, zorunluMeslekler: TUM_MESLEKLER, meslekler: TUM_MESLEKLER },
  calisma_izni: { ad: 'Yabancı çalışma izni', sureli: true, zorunluMeslekler: [], meslekler: TUM_MESLEKLER },
  surucu_belgesi: { ad: 'Sürücü belgesi / SRC / psikoteknik', sureli: true, zorunluMeslekler: [], meslekler: ['destek'] },
} as const satisfies Record<string, PersonelBelgeTuru>;

export type PersonelBelgeKodu = keyof typeof PERSONEL_BELGE_TURLERI;

const INSAN_TIPLERI: readonly KurumTipi[] = ['muayenehane', 'tip_merkezi', 'dis', 'estetik', 'fizik_danismanlik', 'evde_saglik'];

export interface KurumBelgeTuru {
  ad: string;
  sureli: boolean;
  /** Şubede bu kurum tiplerinden biri varsa eksikliği alarm üretir */
  zorunluTipler: readonly KurumTipi[];
}

export const KURUM_BELGE_TURLERI = {
  ruhsat: { ad: 'Ruhsat / faaliyet izin belgesi', sureli: false, zorunluTipler: INSAN_TIPLERI },
  mesul_mudur_belgesi: { ad: 'Mesul müdürlük belgesi', sureli: false, zorunluTipler: ['tip_merkezi', 'dis', 'estetik', 'evde_saglik'] },
  veteriner_ruhsat: { ad: 'Veteriner kuruluş ruhsatı', sureli: false, zorunluTipler: ['veteriner'] },
  tibbi_atik_sozlesmesi: { ad: 'Tıbbi atık sözleşmesi', sureli: true, zorunluTipler: [...INSAN_TIPLERI, 'veteriner'] },
  ndk_lisansi: { ad: 'NDK röntgen lisansı', sureli: true, zorunluTipler: ['dis'] },
  evde_saglik_izin: { ad: 'Evde sağlık hizmeti izin belgesi', sureli: false, zorunluTipler: ['evde_saglik'] },
  isg_hizmet_sozlesmesi: { ad: 'İSG hizmet sözleşmesi (OSGB)', sureli: true, zorunluTipler: [] },
  yangin_uygunluk: { ad: 'Yangın güvenliği uygunluk belgesi', sureli: true, zorunluTipler: [] },
  kurum_sigortasi: { ad: 'İşyeri / mesleki sorumluluk sigortası', sureli: true, zorunluTipler: [] },
  arac_muayene: { ad: 'Araç muayene ve trafik sigortası', sureli: true, zorunluTipler: [] },
} as const satisfies Record<string, KurumBelgeTuru>;

export type KurumBelgeKodu = keyof typeof KURUM_BELGE_TURLERI;

export function personelBelgeKoduMu(d: unknown): d is PersonelBelgeKodu {
  return typeof d === 'string' && Object.prototype.hasOwnProperty.call(PERSONEL_BELGE_TURLERI, d);
}
export function kurumBelgeKoduMu(d: unknown): d is KurumBelgeKodu {
  return typeof d === 'string' && Object.prototype.hasOwnProperty.call(KURUM_BELGE_TURLERI, d);
}

/** Uyarı eşikleri (gün): personel 90/60/30/7, kurum 120/60/30 */
export const PERSONEL_UYARI_GUNLERI = [90, 60, 30, 7] as const;
export const KURUM_UYARI_GUNLERI = [120, 60, 30] as const;

/** Belge dosyası: en çok 10 MB, PDF / JPEG / PNG */
export const BELGE_DOSYA_AZAMI_BAYT = 10 * 1024 * 1024;
export const BELGE_DOSYA_TURLERI = ['application/pdf', 'image/jpeg', 'image/png'] as const;

export type BelgeDurumu = 'suresiz' | 'gecerli' | 'yaklasiyor' | 'dolmus';
/** Alarm önemi: kritik (dolmuş / ≤7 gün), ciddi (≤30 gün), uyari (ilk eşik içinde), eksik (zorunlu belge yok) */
export type AlarmSeviyesi = 'kritik' | 'ciddi' | 'uyari' | 'eksik';

function gunFarki(bitis: string, bugun: string): number {
  return Math.round((Date.parse(`${bitis}T00:00:00Z`) - Date.parse(`${bugun}T00:00:00Z`)) / 86_400_000);
}

/** Belgenin bugüne (YYYY-AA-GG, kurum saatiyle) göre durumu. Bitiş günü dahil geçerlidir. */
export function belgeDurumu(
  bitis: string | null,
  bugun: string,
  esikler: readonly number[] = PERSONEL_UYARI_GUNLERI,
): { durum: BelgeDurumu; kalanGun: number | null; seviye: AlarmSeviyesi | null } {
  if (!bitis) return { durum: 'suresiz', kalanGun: null, seviye: null };
  const kalan = gunFarki(bitis, bugun);
  const ilkEsik = Math.max(...esikler);
  if (kalan < 0) return { durum: 'dolmus', kalanGun: kalan, seviye: 'kritik' };
  if (kalan <= 7) return { durum: 'yaklasiyor', kalanGun: kalan, seviye: 'kritik' };
  if (kalan <= 30) return { durum: 'yaklasiyor', kalanGun: kalan, seviye: 'ciddi' };
  if (kalan <= ilkEsik) return { durum: 'yaklasiyor', kalanGun: kalan, seviye: 'uyari' };
  return { durum: 'gecerli', kalanGun: kalan, seviye: null };
}

export interface GuncelBelge<K extends string = string> {
  tur: K;
  bitis: string | null;
}

/**
 * Aynı türden birden çok belge varsa (yenilenmiş), bitişi en geç olan geçerlidir; süresiz
 * belge her zaman en geç sayılır.
 */
export function guncelBelgeler<K extends string, B extends GuncelBelge<K>>(belgeler: readonly B[]): Map<K, B> {
  const sonuc = new Map<K, B>();
  for (const b of belgeler) {
    const onceki = sonuc.get(b.tur);
    if (!onceki || onceki.bitis === null) {
      if (!onceki) sonuc.set(b.tur, b);
      continue;
    }
    if (b.bitis === null || b.bitis > onceki.bitis) sonuc.set(b.tur, b);
  }
  return sonuc;
}

/** Mesleğe göre zorunlu olup kişide bulunmayan belge türleri. */
export function eksikPersonelBelgeleri(meslek: Meslek, mevcutTurler: Iterable<string>): PersonelBelgeKodu[] {
  const var_ = new Set(mevcutTurler);
  return (Object.keys(PERSONEL_BELGE_TURLERI) as PersonelBelgeKodu[]).filter(
    (k) => (PERSONEL_BELGE_TURLERI[k].zorunluMeslekler as readonly Meslek[]).includes(meslek) && !var_.has(k),
  );
}

/** Şubenin kurum tiplerine göre zorunlu olup bulunmayan kurum belgeleri. */
export function eksikKurumBelgeleri(kurumTipleri: readonly string[], mevcutTurler: Iterable<string>): KurumBelgeKodu[] {
  const var_ = new Set(mevcutTurler);
  return (Object.keys(KURUM_BELGE_TURLERI) as KurumBelgeKodu[]).filter(
    (k) => (KURUM_BELGE_TURLERI[k].zorunluTipler as readonly string[]).some((t) => kurumTipleri.includes(t)) && !var_.has(k),
  );
}

export interface AskiyaAlma {
  izin: Izin;
  belge: PersonelBelgeKodu;
  bitis: string;
}

/** Kişinin güncel belgelerinden süresi geçmiş olanların askıya aldığı izinler. */
export function askidakiIzinler(belgeler: readonly GuncelBelge[], bugun: string): AskiyaAlma[] {
  const sonuc: AskiyaAlma[] = [];
  for (const [tur, b] of guncelBelgeler(belgeler.filter((x) => personelBelgeKoduMu(x.tur)))) {
    const tanim: PersonelBelgeTuru = PERSONEL_BELGE_TURLERI[tur as PersonelBelgeKodu];
    if (!tanim.askiyaAlir || !b.bitis || belgeDurumu(b.bitis, bugun).durum !== 'dolmus') continue;
    for (const izin of tanim.askiyaAlir) sonuc.push({ izin, belge: tur as PersonelBelgeKodu, bitis: b.bitis });
  }
  return sonuc;
}

export type AlarmKapsami = 'personel' | 'kurum' | 'nobet' | 'stok' | 'kalite';

/**
 * Eskalasyon: alarmı kim görür?
 *  - Personel belgesi: kişinin kendisi ve personel yönetimi her seviyede; Komuta Merkezi
 *    yetkilileri (sahip, başhekim…) yalnızca kritik ve eksik olanları.
 *  - Kurum belgesi: kurum belgesi yöneticileri her seviyede; diğer Komuta Merkezi yetkilileri
 *    ciddi ve kritik olanları.
 */
export function alarmGorulebilirMi(
  alarm: { kapsam: AlarmKapsami; seviye: AlarmSeviyesi; kullaniciId?: string | null; hedefIzinler?: readonly Izin[] },
  izleyen: { kullaniciId: string; izinler: ReadonlySet<Izin> },
): boolean {
  // Nöbet, stok ve kalite alarmları işin sorumlusuna (hedef izin) gider; kritikler Komuta Merkezi'ne de çıkar
  if (alarm.kapsam === 'nobet' || alarm.kapsam === 'stok' || alarm.kapsam === 'kalite') {
    // Kişiye atanmış iş (ör. DÖF sorumlusu) kişinin kendisine de gider
    if (alarm.kullaniciId && alarm.kullaniciId === izleyen.kullaniciId) return true;
    if (alarm.hedefIzinler?.some((i) => izleyen.izinler.has(i))) return true;
    return alarm.seviye === 'kritik' && izleyen.izinler.has('komuta.goruntule');
  }
  if (alarm.kapsam === 'personel') {
    if (alarm.kullaniciId === izleyen.kullaniciId) return true;
    if (izleyen.izinler.has('personel.yonet')) return true;
    return izleyen.izinler.has('komuta.goruntule') && (alarm.seviye === 'kritik' || alarm.seviye === 'eksik');
  }
  if (izleyen.izinler.has('belge.kurum.yonet')) return true;
  return izleyen.izinler.has('komuta.goruntule') && (alarm.seviye === 'kritik' || alarm.seviye === 'ciddi' || alarm.seviye === 'eksik');
}

export const ALARM_SIRASI: Record<AlarmSeviyesi, number> = { kritik: 0, ciddi: 1, eksik: 2, uyari: 3 };

export const CALISMA_SEKILLERI = {
  tam_zamanli: 'Tam zamanlı',
  kismi_sureli: 'Kısmi süreli',
  serbest: 'Serbest / sözleşmeli',
  stajyer: 'Stajyer',
  taseron: 'Alt işveren (taşeron)',
} as const;
export type CalismaSekli = keyof typeof CALISMA_SEKILLERI;
