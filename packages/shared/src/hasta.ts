import type { Izin } from './izinler';

/**
 * T.C. kimlik numarası (ve 99 ile başlayan yabancı kimlik numarası) doğrulaması:
 * 11 hane, ilk hane 0 değil; 10. hane = (tek sıradakilerin toplamı × 7 − çift sıradakilerin toplamı) mod 10;
 * 11. hane = ilk 10 hanenin toplamı mod 10.
 */
export function tcKimlikNoGecerliMi(no: string): boolean {
  if (!/^[1-9]\d{10}$/.test(no)) return false;
  const h = [...no].map(Number);
  const tek = h[0]! + h[2]! + h[4]! + h[6]! + h[8]!;
  const cift = h[1]! + h[3]! + h[5]! + h[7]!;
  const onuncu = (((tek * 7 - cift) % 10) + 10) % 10;
  const onbirinci = h.slice(0, 10).reduce((a, b) => a + b, 0) % 10;
  return h[9] === onuncu && h[10] === onbirinci;
}

export function yabanciKimlikNoGecerliMi(no: string): boolean {
  return no.startsWith('99') && tcKimlikNoGecerliMi(no);
}

export const KIMLIK_TURLERI = {
  tc: 'T.C. kimlik no',
  yabanci: 'Yabancı kimlik no (99…)',
  pasaport: 'Pasaport',
  kimliksiz: 'Kimliksiz / geçici kayıt (acil)',
} as const;
export type KimlikTuru = keyof typeof KIMLIK_TURLERI;

/** Kimlik numarasının ekranda gösterilen maskeli hâli: 123******78 */
export function kimlikNoMaskele(no: string): string {
  if (no.length <= 5) return '*'.repeat(no.length);
  return `${no.slice(0, 3)}${'*'.repeat(no.length - 5)}${no.slice(-2)}`;
}

const KATLAMA: Record<string, string> = { ı: 'i', ş: 's', ğ: 'g', ü: 'u', ö: 'o', ç: 'c', â: 'a', î: 'i', û: 'u' };

/**
 * Arama için metin normalleştirme: Türkçe küçük harf, Türkçe karakterler katlanır
 * (“ILKER”, “ilker”, “İlker” ve “isik”, “Işık” birbirini bulur), tek boşluk.
 * Kayıtta saklanan arama metni ile arama sorgusu aynı fonksiyondan geçer.
 */
export function aramaMetni(...parcalar: (string | null | undefined)[]): string {
  return parcalar
    .filter((p): p is string => !!p)
    .join(' ')
    .toLocaleLowerCase('tr')
    .replace(/[ışğüöçâîû]/g, (h) => KATLAMA[h] ?? h)
    .replace(/\s+/g, ' ')
    .trim();
}

export const CINSIYETLER = { kadin: 'Kadın', erkek: 'Erkek', belirtilmemis: 'Belirtilmemiş' } as const;
export type Cinsiyet = keyof typeof CINSIYETLER;

export const KAN_GRUPLARI = ['0 Rh+', '0 Rh-', 'A Rh+', 'A Rh-', 'B Rh+', 'B Rh-', 'AB Rh+', 'AB Rh-'] as const;
export type KanGrubu = (typeof KAN_GRUPLARI)[number];

export const ILETISIM_TERCIHLERI = { sms: 'SMS', eposta: 'E-posta', telefon: 'Telefon', whatsapp: 'WhatsApp' } as const;
export type IletisimTercihi = keyof typeof ILETISIM_TERCIHLERI;

/**
 * Hasta kartındaki uyarı bayrakları. `gizlilik` kimin görebileceğini belirler:
 *  - klinik: yalnızca tıbbi kayda erişebilen sağlık personeli (alerji, bulaşıcı hastalık…)
 *  - idari:  kayıt ve tahsilat yapan idari personel (ödeme sorunu)
 *  - herkes: hastayı görebilen herkes (personel güvenliği için şiddet geçmişi)
 */
export type UyariGizliligi = 'klinik' | 'idari' | 'herkes';

export const UYARI_TURLERI = {
  alerji: { ad: 'Alerji', gizlilik: 'klinik' },
  kan_sulandirici: { ad: 'Kan sulandırıcı kullanıyor', gizlilik: 'klinik' },
  bulasici_hastalik: { ad: 'Bulaşıcı hastalık / izolasyon', gizlilik: 'klinik' },
  dusme_riski: { ad: 'Düşme riski', gizlilik: 'klinik' },
  implant_cihaz: { ad: 'İmplant / kalp pili', gizlilik: 'klinik' },
  gebelik: { ad: 'Gebelik / emzirme', gizlilik: 'klinik' },
  diger_klinik: { ad: 'Diğer klinik uyarı', gizlilik: 'klinik' },
  siddet_gecmisi: { ad: 'Şiddet / agresyon geçmişi', gizlilik: 'herkes' },
  ozel_ihtiyac: { ad: 'Özel ihtiyaç (tekerlekli sandalye, tercüman…)', gizlilik: 'herkes' },
  odeme_sorunu: { ad: 'Ödeme sorunu', gizlilik: 'idari' },
  diger_idari: { ad: 'Diğer idari uyarı', gizlilik: 'idari' },
} as const satisfies Record<string, { ad: string; gizlilik: UyariGizliligi }>;
export type UyariTuru = keyof typeof UYARI_TURLERI;

/** Uyarıyı görebilmek için gereken izinlerden en az biri. */
export const UYARI_GORME_IZINLERI: Record<UyariGizliligi, readonly Izin[]> = {
  klinik: ['tibbi.kayit.goruntule'],
  idari: ['hasta.kaydet', 'finans.tahsilat'],
  herkes: ['hasta.demografik.goruntule'],
};

/** Uyarı ekleyebilmek/kaldırabilmek için gereken izin. */
export const UYARI_YAZMA_IZNI: Record<UyariGizliligi, Izin> = {
  klinik: 'tibbi.kayit.yaz',
  idari: 'hasta.kaydet',
  herkes: 'hasta.kaydet',
};

export function uyariGorulebilirMi(tur: UyariTuru, izinler: ReadonlySet<Izin>): boolean {
  return UYARI_GORME_IZINLERI[UYARI_TURLERI[tur].gizlilik].some((i) => izinler.has(i));
}

/**
 * Açık rıza türleri (KVKK). Her biri ayrı alınır, hizmet şartı yapılamaz, her zaman geri çekilebilir.
 */
export const RIZA_TURLERI = {
  pazarlama_iletisim: { ad: 'Kampanya ve tanıtım iletileri', aciklama: 'SMS, e-posta veya WhatsApp ile ticari ileti (İYS kaydı ayrıca yapılır).' },
  foto_tanitim: { ad: 'Fotoğrafların tanıtımda kullanımı', aciklama: 'Tedavi fotoğraflarının web sitesi ve sosyal medyada kullanılması.' },
  foto_bilimsel: { ad: 'Fotoğrafların eğitim ve bilimsel yayında kullanımı', aciklama: 'Kimliği gizlenerek eğitim ve bilimsel amaçlarla kullanım.' },
  yakina_bilgi: { ad: 'Yakınlara bilgi verilmesi', aciklama: 'Belirtilen yakınlara sağlık durumu hakkında bilgi verilmesi.' },
  tele_tip_kayit: { ad: 'Görüntülü görüşmenin kaydedilmesi', aciklama: 'Uzaktan sağlık hizmeti görüşmelerinin kayda alınması.' },
  yurtdisi_aktarim: { ad: 'Yurt dışına aktarım', aciklama: 'Yurt dışındaki sigorta, aracı kurum veya hekimle veri paylaşımı.' },
} as const;
export type RizaTuru = keyof typeof RIZA_TURLERI;

export const AYDINLATMA_KANALLARI = {
  yuz_yuze_islak: 'Yüz yüze, ıslak imzalı form',
  tablet_imza: 'Tablet üzerinde imza',
  sms_onay: 'SMS doğrulama kodu',
  portal: 'Hasta portalı / mobil uygulama',
} as const;
export type AydinlatmaKanali = keyof typeof AYDINLATMA_KANALLARI;

/** Yürürlükteki hasta aydınlatma metni. Metin hukuki onaydan geçene kadar taslaktır. */
export const HASTA_AYDINLATMA_METNI = { kod: 'hasta-aydinlatma', surum: 'taslak-0.1' } as const;

export const HAYVAN_TURLERI = {
  kedi: 'Kedi',
  kopek: 'Köpek',
  kus: 'Kuş',
  tavsan: 'Tavşan',
  kemirgen: 'Kemirgen',
  surungen: 'Sürüngen',
  at: 'At',
  buyukbas: 'Büyükbaş',
  kucukbas: 'Küçükbaş',
  diger: 'Diğer',
} as const;
export type HayvanTuru = keyof typeof HAYVAN_TURLERI;
