/**
 * İzin kataloğu.
 *
 * `seviye` alanı izin için kilitli yasal şartı belirtir:
 *  - `hekim`:  yalnızca hekim meslekleri (tanı, reçete, rapor)
 *  - `saglik`: yalnızca sır saklama yükümlülüğü olan sağlık meslek mensupları (tıbbi kayıt)
 *  - `serbest`: meslekten bağımsız, rolle verilebilir
 *
 * Kurumlar kendi rol şablonlarını oluştursa bile bu şart delinemez.
 */
export type IzinSeviyesi = 'hekim' | 'saglik' | 'serbest';

export const IZINLER = {
  'komuta.goruntule': { ad: 'Komuta Merkezi’ni görüntüleme', seviye: 'serbest' },
  'tibbi.istatistik.anonim': { ad: 'Anonim / toplu klinik istatistik', seviye: 'serbest' },

  'hasta.demografik.goruntule': { ad: 'Hasta kimlik ve iletişim bilgisi görüntüleme', seviye: 'serbest' },
  'hasta.kaydet': { ad: 'Hasta kaydı oluşturma ve güncelleme', seviye: 'serbest' },

  'tibbi.kayit.goruntule': { ad: 'Tıbbi kaydı görüntüleme (tedavi ilişkisi şartıyla)', seviye: 'saglik' },
  'tibbi.kayit.yaz': { ad: 'Tıbbi kayda giriş (vital, hemşirelik notu, uygulama)', seviye: 'saglik' },
  'tibbi.kayit.denetim': { ad: 'Tüm tıbbi kayıtları kurumsal denetim amacıyla görüntüleme', seviye: 'hekim' },
  'tani.koy': { ad: 'Tanı koyma', seviye: 'hekim' },
  'recete.yaz': { ad: 'Reçete yazma', seviye: 'hekim' },
  'rapor.yaz': { ad: 'Rapor ve epikriz düzenleme', seviye: 'hekim' },
  'onam.al': { ad: 'Aydınlatılmış onam alma', seviye: 'saglik' },
  'onam.imzaya.sun': { ad: 'Onam formunu imzaya sunma', seviye: 'serbest' },

  'randevu.goruntule': { ad: 'Randevuları görüntüleme', seviye: 'serbest' },
  'randevu.yonet': { ad: 'Randevu verme, değiştirme, iptal', seviye: 'serbest' },

  'finans.goruntule': { ad: 'Gelir, gider ve kârlılığı görüntüleme', seviye: 'serbest' },
  'finans.tahsilat': { ad: 'Tahsilat alma ve kasa işlemleri', seviye: 'serbest' },
  'finans.iade.onayla': { ad: 'İade ve fatura iptalini onaylama', seviye: 'serbest' },
  'fiyat.yonet': { ad: 'Fiyat listesini düzenleme (onaya düşer)', seviye: 'serbest' },
  'fiyat.onayla': { ad: 'Fiyat listesi değişikliğini onaylama', seviye: 'serbest' },

  'stok.goruntule': { ad: 'Stoku görüntüleme', seviye: 'serbest' },
  'stok.yonet': { ad: 'Stok giriş, çıkış, sayım', seviye: 'serbest' },
  'narkotik.yonet': { ad: 'Narkotik ve psikotrop ilaç hareketleri', seviye: 'saglik' },

  'personel.goruntule': { ad: 'Personel bilgilerini görüntüleme', seviye: 'serbest' },
  'personel.yonet': { ad: 'Personel özlük ve belge yönetimi', seviye: 'serbest' },
  'nobet.planla': { ad: 'Nöbet ve vardiya planlama', seviye: 'serbest' },
  'nobet.onayla': { ad: 'Nöbet listesini onaylayıp yayınlama', seviye: 'serbest' },

  'kullanici.yonet': { ad: 'Kullanıcı davet etme ve idari rol atama', seviye: 'serbest' },
  'mesul.mudur.ata': { ad: 'Mesul müdür atama', seviye: 'serbest' },
  'yetki.saglik.onayla': { ad: 'Sağlık rolü atamalarını onaylama', seviye: 'hekim' },

  'kalite.yonet': { ad: 'Kalite, SKS ve DÖF yönetimi', seviye: 'serbest' },
  'olay.bildir': { ad: 'Olay bildirimi yapma', seviye: 'serbest' },
  'denetim.goruntule': { ad: 'Denetim izini (erişim kayıtları) görüntüleme', seviye: 'serbest' },
  'ayar.yonet': { ad: 'Kurum ayarlarını yönetme', seviye: 'serbest' },
} as const satisfies Record<string, { ad: string; seviye: IzinSeviyesi }>;

export type Izin = keyof typeof IZINLER;

export const TUM_IZINLER = Object.keys(IZINLER) as Izin[];

export function izinMi(deger: unknown): deger is Izin {
  return typeof deger === 'string' && Object.prototype.hasOwnProperty.call(IZINLER, deger);
}
