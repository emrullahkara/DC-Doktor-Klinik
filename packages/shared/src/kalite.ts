/**
 * Kalite, hasta güvenliği ve şikâyet yönetimi (docs/moduller/07-kalite-guvenlik.md).
 *
 * K17: Olay bildirimi isimsiz yapılabilir. İsimsiz bildirimde bildirenin kimliği kalite ekibine ve
 * denetim izine açık yazılmaz; yalnızca şifreli saklanır (yasal süreçte çözülebilir). Bildiren,
 * kendisine verilen takip koduyla durumu izler.
 */

export const OLAY_TURLERI = {
  ramak_kala: 'Ramak kala',
  ilac_hatasi: 'İlaç hatası',
  dusme: 'Hasta düşmesi',
  kimlik_hatasi: 'Hasta kimlik hatası / yanlış hasta',
  yanlis_taraf: 'Yanlış taraf / yanlış işlem',
  cihaz: 'Tıbbi cihaz kaynaklı olay',
  enfeksiyon: 'Enfeksiyon / sterilizasyon',
  advers_reaksiyon: 'Advers ilaç reaksiyonu',
  beyaz_kod: 'Beyaz kod (çalışana şiddet)',
  kesici_delici: 'Kesici-delici alet yaralanması',
  calisan_guvenligi: 'Diğer çalışan güvenliği olayı',
  diger: 'Diğer',
} as const;
export type OlayTuru = keyof typeof OLAY_TURLERI;

export const OLAY_SIDDETLERI = {
  zarar_yok: 'Zarar yok',
  hafif: 'Hafif',
  orta: 'Orta',
  ciddi: 'Ciddi',
} as const;
export type OlaySiddeti = keyof typeof OLAY_SIDDETLERI;

export const OLAY_DURUMLARI = {
  yeni: 'Yeni',
  inceleniyor: 'İnceleniyor',
  kapatildi: 'Kapatıldı',
} as const;
export type OlayDurumu = keyof typeof OLAY_DURUMLARI;

/** Resmî bildirim gerektirebilecek olay türleri (farmakovijilans, materyovijilans, beyaz kod) */
export const RESMI_BILDIRIM_OLAYLARI: readonly OlayTuru[] = ['advers_reaksiyon', 'cihaz', 'beyaz_kod'];

/** Orta ve ciddi olay, kök neden ve alınan önlem yazılmadan kapatılamaz. */
export function olayKapatilabilirMi(siddet: OlaySiddeti, kokNeden: string | null, onlem: string | null): boolean {
  if (siddet === 'zarar_yok' || siddet === 'hafif') return true;
  return (kokNeden?.trim().length ?? 0) >= 5 && (onlem?.trim().length ?? 0) >= 5;
}

export const SIKAYET_KANALLARI = {
  yuz_yuze: { ad: 'Yüz yüze', resmi: false },
  telefon: { ad: 'Telefon', resmi: false },
  eposta: { ad: 'E-posta', resmi: false },
  web: { ad: 'Web / anket', resmi: false },
  sosyal_medya: { ad: 'Sosyal medya', resmi: false },
  cimer: { ad: 'CİMER', resmi: true },
  sabim: { ad: 'SABİM', resmi: true },
  bakanlik: { ad: 'Bakanlık / İl Sağlık Müdürlüğü yazısı', resmi: true },
} as const;
export type SikayetKanali = keyof typeof SIKAYET_KANALLARI;

export const SIKAYET_KATEGORILERI = {
  tibbi: 'Tıbbi',
  idari: 'İdari',
  finansal: 'Finansal',
  davranis: 'Personel davranışı',
  temizlik: 'Temizlik / hijyen',
  bekleme: 'Bekleme süresi',
  diger: 'Diğer',
} as const;
export type SikayetKategorisi = keyof typeof SIKAYET_KATEGORILERI;

export const SIKAYET_DURUMLARI = {
  acik: 'Açık',
  cevaplandi: 'Cevaplandı',
  kapatildi: 'Kapatıldı',
} as const;
export type SikayetDurumu = keyof typeof SIKAYET_DURUMLARI;

/**
 * Cevap süresi (gün). Resmî kanal (CİMER, SABİM, Bakanlık) başvurularında yasal süre sayacı işler;
 * kurum içi kanallarda hizmet hedefi olarak izlenir. Süreler hukukçu teyidine kadar taslaktır (K8).
 */
export const RESMI_CEVAP_SURESI_GUN = 30;
export const IC_CEVAP_HEDEFI_GUN = 7;

export function cevapSonTarihi(kanal: SikayetKanali, alinisGunu: string): string {
  const gun = SIKAYET_KANALLARI[kanal].resmi ? RESMI_CEVAP_SURESI_GUN : IC_CEVAP_HEDEFI_GUN;
  const d = new Date(`${alinisGunu}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + gun);
  return d.toISOString().slice(0, 10);
}

export const DOF_KAYNAKLARI = {
  olay: 'Olay bildirimi',
  sikayet: 'Şikâyet',
  denetim: 'İç / dış denetim bulgusu',
  diger: 'Diğer',
} as const;
export type DofKaynagi = keyof typeof DOF_KAYNAKLARI;

/** DÖF: açık → tamamlandı (sorumlu) → etkinliği doğrulandı (başka bir kalite yetkilisi) */
export const DOF_DURUMLARI = {
  acik: 'Açık',
  tamamlandi: 'Tamamlandı (doğrulama bekliyor)',
  dogrulandi: 'Etkinliği doğrulandı',
} as const;
export type DofDurumu = keyof typeof DOF_DURUMLARI;

/** Takip kodu: karışabilecek karakterler (0/O, 1/I) çıkarılmış 8 karakter */
export const TAKIP_KODU_ALFABESI = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
