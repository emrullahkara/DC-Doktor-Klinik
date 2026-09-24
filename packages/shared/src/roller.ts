import type { Izin } from './izinler';
import { HEKIM_MESLEKLERI, type Meslek } from './meslekler';

export interface RolTanimi {
  ad: string;
  aciklama: string;
  izinler: readonly Izin[];
  /** Rolün atanabileceği meslekler. Tanımsızsa meslekten bağımsızdır. */
  meslekler?: readonly Meslek[];
}

const HEKIMLER = [...HEKIM_MESLEKLERI];

/**
 * Varsayılan rol kataloğu (docs/02-roller-ve-yetkilendirme.md yetki matrisi).
 * Rol izinleri ayrıca meslek kuralından geçer; bkz. kurallar.ts.
 */
export const ROLLER = {
  kurum_sahibi: {
    ad: 'Kurum sahibi / ortak',
    aciklama: 'İşletme verisinin tamamını görür; tıbbi veriyi yalnızca anonim/toplu görür.',
    izinler: [
      'komuta.goruntule', 'tibbi.istatistik.anonim', 'hasta.demografik.goruntule', 'randevu.goruntule',
      'finans.goruntule', 'finans.iade.onayla', 'fiyat.yonet', 'fiyat.onayla', 'stok.goruntule', 'personel.goruntule',
      'personel.yonet', 'belge.kurum.yonet', 'kullanici.yonet', 'mesul.mudur.ata', 'denetim.goruntule', 'ayar.yonet', 'olay.bildir',
    ],
  },
  genel_mudur: {
    ad: 'Genel müdür / işletme müdürü',
    aciklama: 'Günlük operasyonun sahibi; tıbbi veriyi yalnızca anonim/toplu görür.',
    izinler: [
      'komuta.goruntule', 'tibbi.istatistik.anonim', 'hasta.demografik.goruntule', 'randevu.goruntule',
      'randevu.yonet', 'finans.goruntule', 'finans.iade.onayla', 'fiyat.yonet', 'stok.goruntule',
      'personel.goruntule', 'personel.yonet', 'belge.kurum.yonet', 'nobet.planla', 'nobet.onayla', 'kullanici.yonet', 'denetim.goruntule',
      'ayar.yonet', 'olay.bildir',
    ],
  },
  mesul_mudur: {
    ad: 'Mesul müdür',
    aciklama: 'Kuruluşun mevzuata uygun çalışmasından Bakanlığa karşı sorumlu hekim.',
    meslekler: HEKIMLER,
    izinler: [
      'komuta.goruntule', 'tibbi.istatistik.anonim', 'hasta.demografik.goruntule', 'hasta.kaydet',
      'tibbi.kayit.denetim', 'randevu.goruntule', 'stok.goruntule', 'narkotik.yonet', 'personel.goruntule',
      'personel.yonet', 'belge.kurum.yonet', 'nobet.onayla', 'yetki.saglik.onayla', 'kalite.yonet', 'olay.bildir',
      'denetim.goruntule', 'ayar.yonet',
    ],
  },
  bashekim: {
    ad: 'Başhekim / tıbbi direktör',
    aciklama: 'Klinik protokoller, hekim görevlendirme ve tıbbi kayıt kalitesi.',
    meslekler: HEKIMLER,
    izinler: [
      'komuta.goruntule', 'tibbi.istatistik.anonim', 'hasta.demografik.goruntule', 'hasta.kaydet',
      'tibbi.kayit.goruntule', 'tibbi.kayit.yaz', 'tibbi.kayit.denetim', 'tani.koy', 'recete.yaz',
      'rapor.yaz', 'onam.al', 'randevu.goruntule', 'randevu.yonet', 'personel.goruntule', 'nobet.planla', 'nobet.onayla',
      'kalite.yonet', 'olay.bildir',
    ],
  },
  hekim: {
    ad: 'Hekim',
    aciklama: 'Kendi hastaları için tam tıbbi kayıt, tanı, reçete, rapor, onam; kontrol randevusu verme.',
    meslekler: HEKIMLER,
    izinler: [
      'hasta.demografik.goruntule', 'hasta.kaydet', 'tibbi.kayit.goruntule', 'tibbi.kayit.yaz', 'tani.koy',
      'recete.yaz', 'rapor.yaz', 'onam.al', 'randevu.goruntule', 'randevu.yonet', 'olay.bildir',
    ],
  },
  bashemsire: {
    ad: 'Başhemşire / sorumlu hemşire',
    aciklama: 'Hemşire ve yardımcı sağlık personelinin planı, ilaç uygulama denetimi.',
    meslekler: ['hemsire', 'ebe'],
    izinler: [
      'hasta.demografik.goruntule', 'tibbi.kayit.goruntule', 'tibbi.kayit.yaz', 'onam.al',
      'randevu.goruntule', 'stok.goruntule', 'narkotik.yonet', 'personel.goruntule', 'nobet.planla',
      'olay.bildir',
    ],
  },
  hemsire: {
    ad: 'Hemşire / ebe',
    aciklama: 'Hekim istemli uygulama, vital bulgu, hemşirelik notu. Reçete yazamaz, tanı koyamaz.',
    meslekler: ['hemsire', 'ebe'],
    izinler: [
      'hasta.demografik.goruntule', 'tibbi.kayit.goruntule', 'tibbi.kayit.yaz', 'randevu.goruntule',
      'olay.bildir',
    ],
  },
  saglik_personeli: {
    ad: 'Diğer sağlık personeli',
    aciklama: 'Tekniker, psikolog, diyetisyen, fizyoterapist, veteriner teknikeri: kendi alan kayıtları.',
    meslekler: ['saglik_teknikeri', 'veteriner_teknikeri', 'psikolog', 'diyetisyen', 'fizyoterapist', 'eczaci'],
    izinler: [
      'hasta.demografik.goruntule', 'tibbi.kayit.goruntule', 'tibbi.kayit.yaz', 'randevu.goruntule',
      'olay.bildir',
    ],
  },
  sekreter: {
    ad: 'Hasta kabul / sekreter',
    aciklama: 'Kayıt, randevu, kabul, tahsilat. Tanı ve muayene notlarını göremez.',
    izinler: [
      'hasta.demografik.goruntule', 'hasta.kaydet', 'randevu.goruntule', 'randevu.yonet',
      'onam.imzaya.sun', 'finans.tahsilat', 'olay.bildir',
    ],
  },
  muhasebe: {
    ad: 'Muhasebe / finans',
    aciklama: 'Fatura, tahsilat, gider, hakediş. Tıbbi notları göremez.',
    izinler: ['finans.goruntule', 'finans.tahsilat', 'olay.bildir'],
  },
  depo: {
    ad: 'Satın alma / depo sorumlusu',
    aciklama: 'Tedarikçi, sipariş, mal kabul, sayım, son kullanma tarihi.',
    izinler: ['stok.goruntule', 'stok.yonet', 'olay.bildir'],
  },
  insan_kaynaklari: {
    ad: 'İnsan kaynakları',
    aciklama: 'Özlük, sözleşme, izin, belge takibi.',
    izinler: ['personel.goruntule', 'personel.yonet', 'nobet.planla', 'olay.bildir'],
  },
  kalite_sorumlusu: {
    ad: 'Kalite sorumlusu',
    aciklama: 'SKS göstergeleri, olay bildirimleri, DÖF, iç denetim.',
    izinler: ['tibbi.istatistik.anonim', 'kalite.yonet', 'olay.bildir', 'denetim.goruntule'],
  },
  destek_personeli: {
    ad: 'Destek personeli',
    aciklama: 'Temizlik, güvenlik, hasta bakıcı, şoför: görev ve vardiya. Hasta verisi yok.',
    izinler: ['olay.bildir'],
  },
  bilgi_islem: {
    ad: 'Bilgi işlem / sistem yöneticisi',
    aciklama: 'Teknik ayarlar. Tıbbi veriye erişemez.',
    izinler: ['ayar.yonet', 'olay.bildir'],
  },
} as const satisfies Record<string, RolTanimi>;

export type RolKodu = keyof typeof ROLLER;

export function rolKoduMu(deger: unknown): deger is RolKodu {
  return typeof deger === 'string' && Object.prototype.hasOwnProperty.call(ROLLER, deger);
}

export function rolTanimi(kod: RolKodu): RolTanimi {
  return ROLLER[kod];
}
