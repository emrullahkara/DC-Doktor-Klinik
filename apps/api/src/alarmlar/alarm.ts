import type { AlarmKapsami, AlarmSeviyesi, Izin } from '@dc/shared';

/** Alarm motorunun ortak kaydı. Her modül kendi kaynağından bu biçimde alarm üretir. */
export interface Alarm {
  anahtar: string;
  kapsam: AlarmKapsami;
  seviye: AlarmSeviyesi;
  /** Kaynağa özgü tür kodu (belge türü, `cizelge_yok`, `skt` …) */
  tur: string;
  /** Görünen ad (belge türü adı, ürün adı …) */
  turAd: string;
  kullaniciId: string | null;
  kisi: string | null;
  subeId: string | null;
  sube: string | null;
  bitis: string | null;
  kalanGun: number | null;
  askiyaAliyor: boolean;
  /** Nöbet/stok/kalite alarmlarının sorumlusu: bu izinlerden birine sahip olanlar görür */
  hedefIzinler?: Izin[];
  /** Kaynağa özgü ek bilgi (ay, adet, hedef kayıt kimliği …) */
  ek?: Record<string, string | number>;
}
