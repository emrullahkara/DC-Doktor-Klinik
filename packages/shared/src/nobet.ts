/**
 * Nöbet ve vardiya planlama kuralları (docs/moduller/04-personel-nobet.md §2).
 *
 * Kurallar çizelgeyi engellemez, **ihlal** üretir: çakışma (aynı kişiye aynı anda iki görev) ve
 * izinli güne görev veritabanında engellenir; süre kurallarının ihlali onaylayanın gerekçesiyle
 * onaylanabilir (acil ihtiyaç gerçekliği), gerekçe denetim izine yazılır.
 *
 * Saatler Türkiye saatiyle (UTC+3, yaz saati uygulaması yok) değerlendirilir.
 */

export const GOREV_TURLERI = {
  vardiya: { ad: 'Vardiya', kisa: 'V' },
  nobet: { ad: 'Nöbet', kisa: 'N' },
  icap: { ad: 'İcap (evde nöbet)', kisa: 'İ' },
} as const;
export type GorevTuru = keyof typeof GOREV_TURLERI;

/** Hızlı giriş şablonları: başlangıç saati, süre (saat) */
export const GOREV_SABLONLARI = [
  { kod: 'gunduz', ad: 'Gündüz 08:00–16:00', tur: 'vardiya', baslangic: '08:00', sureSaat: 8 },
  { kod: 'aksam', ad: 'Akşam 16:00–24:00', tur: 'vardiya', baslangic: '16:00', sureSaat: 8 },
  { kod: 'gece_nobeti', ad: 'Gece nöbeti 16:00–08:00', tur: 'nobet', baslangic: '16:00', sureSaat: 16 },
  { kod: 'tam_nobet', ad: 'Nöbet 08:00–08:00 (24 saat)', tur: 'nobet', baslangic: '08:00', sureSaat: 24 },
  { kod: 'icap', ad: 'İcap 16:00–08:00', tur: 'icap', baslangic: '16:00', sureSaat: 16 },
] as const satisfies readonly { kod: string; ad: string; tur: GorevTuru; baslangic: string; sureSaat: number }[];

export const CIZELGE_DURUMLARI = {
  taslak: 'Taslak',
  onay_bekliyor: 'Onay bekliyor',
  yayinda: 'Yayında',
} as const;
export type CizelgeDurumu = keyof typeof CIZELGE_DURUMLARI;

export const IZIN_TURLERI = {
  yillik: 'Yıllık izin',
  mazeret: 'Mazeret izni',
  rapor: 'Sağlık raporu',
  ucretsiz: 'Ücretsiz izin',
  dogum: 'Doğum / babalık izni',
  egitim: 'Eğitim / kongre',
  idari: 'İdari izin',
} as const;
export type IzinTuru = keyof typeof IZIN_TURLERI;

export interface NobetAyarlari {
  haftalikAzamiSaat: number;
  nobetSonrasiDinlenmeSaat: number;
  ardisikGeceAzami: number;
}

/** Yasal varsayılanlar (karar: yasal varsayılanlar; kurum ayarlardan değiştirebilir) */
export const VARSAYILAN_NOBET_AYARLARI: NobetAyarlari = {
  haftalikAzamiSaat: 45,
  nobetSonrasiDinlenmeSaat: 24,
  ardisikGeceAzami: 2,
};

/** Tek görevin azami süresi (saat) */
export const GOREV_AZAMI_SAAT = 36;

export interface Gorev {
  id: string;
  kullaniciId: string;
  tur: GorevTuru;
  baslangic: string | Date;
  bitis: string | Date;
}

export type IhlalKurali = 'haftalik_saat' | 'dinlenme' | 'ardisik_gece';

export interface Ihlal {
  kullaniciId: string;
  kural: IhlalKurali;
  /** İhlalin bağlandığı görev(ler) */
  gorevIdleri: string[];
  aciklama: string;
}

const SAAT = 3_600_000;
const TR_KAYMA = 3 * SAAT;

const ms = (d: string | Date) => (d instanceof Date ? d.getTime() : Date.parse(d));
/** Türkiye saatindeki takvim günü (YYYY-AA-GG) */
export const trGunu = (t: number) => new Date(t + TR_KAYMA).toISOString().slice(0, 10);

/** Pazartesi başlayan haftanın ilk günü (Türkiye saatiyle) */
function haftaBasi(t: number): string {
  const d = new Date(t + TR_KAYMA);
  const gun = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - gun);
  return d.toISOString().slice(0, 10);
}

/** Görevin gece çalışmasına (00:00–06:00) denk gelen günleri */
function geceler(bas: number, bit: number): string[] {
  const sonuc: string[] = [];
  // Görevin kapsadığı her gece yarısını dolaş
  const ilkGun = Date.parse(`${trGunu(bas)}T00:00:00Z`) - TR_KAYMA;
  for (let geceBas = ilkGun; geceBas < bit; geceBas += 24 * SAAT) {
    const geceBit = geceBas + 6 * SAAT;
    if (bas < geceBit && bit > geceBas) sonuc.push(trGunu(geceBas));
  }
  return sonuc;
}

/** YYYY-AA-GG → GG.AA.YYYY */
const trTarih = (gun: string) => gun.split('-').reverse().join('.');

function saatBicim(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ',');
}

/** Çizelgedeki görevlerin süre kurallarına göre ihlalleri. İcap çalışma süresine sayılmaz. */
export function nobetIhlalleri(gorevler: readonly Gorev[], ayar: NobetAyarlari = VARSAYILAN_NOBET_AYARLARI): Ihlal[] {
  const ihlaller: Ihlal[] = [];
  const kisiler = new Map<string, { id: string; tur: GorevTuru; bas: number; bit: number }[]>();
  for (const g of gorevler) {
    const liste = kisiler.get(g.kullaniciId) ?? [];
    liste.push({ id: g.id, tur: g.tur, bas: ms(g.baslangic), bit: ms(g.bitis) });
    kisiler.set(g.kullaniciId, liste);
  }

  for (const [kullaniciId, liste] of kisiler) {
    liste.sort((a, b) => a.bas - b.bas);
    const calisma = liste.filter((g) => g.tur !== 'icap');

    // Haftalık süre (görev, başladığı haftaya sayılır)
    const haftalar = new Map<string, { saat: number; idler: string[] }>();
    for (const g of calisma) {
      const h = haftalar.get(haftaBasi(g.bas)) ?? { saat: 0, idler: [] };
      h.saat += (g.bit - g.bas) / SAAT;
      h.idler.push(g.id);
      haftalar.set(haftaBasi(g.bas), h);
    }
    for (const [hafta, h] of haftalar) {
      if (h.saat > ayar.haftalikAzamiSaat) {
        ihlaller.push({ kullaniciId, kural: 'haftalik_saat', gorevIdleri: h.idler, aciklama: `${trTarih(hafta)} haftasında ${saatBicim(h.saat)} saat (azami ${ayar.haftalikAzamiSaat})` });
      }
    }

    // Nöbet sonrası dinlenme
    for (let i = 0; i < calisma.length; i++) {
      const g = calisma[i]!;
      if (g.tur !== 'nobet') continue;
      const sonraki = calisma[i + 1];
      if (!sonraki) continue;
      const ara = (sonraki.bas - g.bit) / SAAT;
      if (ara < ayar.nobetSonrasiDinlenmeSaat) {
        ihlaller.push({ kullaniciId, kural: 'dinlenme', gorevIdleri: [g.id, sonraki.id], aciklama: `${trTarih(trGunu(g.bit))} nöbet sonrası ${saatBicim(Math.max(0, ara))} saat dinlenme (en az ${ayar.nobetSonrasiDinlenmeSaat})` });
      }
    }

    // Ardışık gece çalışması
    const geceGorev = new Map<string, string>();
    for (const g of calisma) for (const gun of geceler(g.bas, g.bit)) geceGorev.set(gun, g.id);
    const gunler = [...geceGorev.keys()].sort();
    let seri: string[] = [];
    const seriBitir = () => {
      if (seri.length > ayar.ardisikGeceAzami) {
        ihlaller.push({ kullaniciId, kural: 'ardisik_gece', gorevIdleri: [...new Set(seri.map((d) => geceGorev.get(d)!))], aciklama: `${trTarih(seri[0]!)} – ${trTarih(seri.at(-1)!)} arası ${seri.length} gece üst üste (azami ${ayar.ardisikGeceAzami})` });
      }
    };
    for (const gun of gunler) {
      const onceki = seri.at(-1);
      if (onceki && Date.parse(`${gun}T00:00:00Z`) - Date.parse(`${onceki}T00:00:00Z`) === 24 * SAAT) seri.push(gun);
      else {
        seriBitir();
        seri = [gun];
      }
    }
    seriBitir();
  }
  return ihlaller;
}

/** Şablondan görev zamanları: gün (YYYY-AA-GG) + başlangıç saati (Türkiye) + süre */
export function sablonZamani(gun: string, baslangic: string, sureSaat: number): { baslangic: string; bitis: string } {
  const bas = Date.parse(`${gun}T${baslangic}:00+03:00`);
  return { baslangic: new Date(bas).toISOString(), bitis: new Date(bas + sureSaat * SAAT).toISOString() };
}

/** YYYY-AA biçimindeki ayın günleri */
export function ayinGunleri(ay: string): string[] {
  const [y, a] = ay.split('-').map(Number);
  const gunSayisi = new Date(Date.UTC(y!, a!, 0)).getUTCDate();
  return Array.from({ length: gunSayisi }, (_, i) => `${ay}-${String(i + 1).padStart(2, '0')}`);
}
