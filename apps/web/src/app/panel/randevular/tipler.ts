import type { RandevuDurumu, RandevuTuru } from '@dc/shared';

export interface TakvimRandevusu {
  id: string;
  hekimId: string;
  kaynakId: string | null;
  kaynakAd: string | null;
  baslangic: string;
  bitis: string;
  tur: RandevuTuru;
  durum: RandevuDurumu;
  notlar: string;
  siraNo: number | null;
  geldiZamani: string | null;
  muayeneZamani: string | null;
  iptalNedeni: string | null;
  hasta: { id: string; ad: string; soyad: string; telefon: string | null };
  hayvan: { id: string; ad: string; tur: string } | null;
}

export interface Takvim {
  tarih: string;
  sube: { id: string; ad: string; kurumTipleri: string[] };
  hekimler: { id: string; adSoyad: string; meslek: string }[];
  kaynaklar: { id: string; ad: string; tur: string }[];
  randevular: TakvimRandevusu[];
}

/** Durum renkleri — onaylanan randevu takvimi tasarımı (docs/13-ekran-taslaklari.md). */
export const DURUM_STILI: Record<RandevuDurumu, { background: string; border: string; color: string }> = {
  tamamlandi: { background: '#F4F2EC', border: '1px solid #E2DED4', color: '#3D4F57' },
  muayenede: { background: '#CFE6DF', border: '1.5px solid #0E4F5C', color: '#0B4350' },
  geldi: { background: '#FFFFFF', border: '2px solid #0E4F5C', color: '#13232A' },
  planlandi: { background: '#FFFFFF', border: '1px dashed #8C9A9F', color: '#13232A' },
  gelmedi: { background: '#FBEAE8', border: '1px solid #F0C4BE', color: '#8F1C13' },
  iptal: { background: 'repeating-linear-gradient(135deg, #F4F2EC 0 6px, #EAE6DC 6px 12px)', border: '1px solid #E2DED4', color: '#3D4F57' },
};
