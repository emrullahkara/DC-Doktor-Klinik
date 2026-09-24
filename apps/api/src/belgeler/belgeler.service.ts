import { createHash } from 'node:crypto';
import { HttpStatus, Injectable } from '@nestjs/common';
import {
  ALARM_SIRASI,
  alarmGorulebilirMi,
  type AlarmKapsami,
  type AlarmSeviyesi,
  belgeDurumu,
  BELGE_DOSYA_AZAMI_BAYT,
  eksikKurumBelgeleri,
  eksikPersonelBelgeleri,
  guncelBelgeler,
  KURUM_BELGE_TURLERI,
  KURUM_SAAT_DILIMI,
  KURUM_UYARI_GUNLERI,
  kurumBelgeKoduMu,
  meslekMi,
  PERSONEL_BELGE_TURLERI,
  PERSONEL_UYARI_GUNLERI,
  personelBelgeKoduMu,
  ROLLER,
  rolKoduMu,
} from '@dc/shared';
import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm';
import { belgeler, dosyalar, kullanicilar, personelBilgileri, rolAtamalari, subeler } from '../db/sema';
import { type Islem, VeritabaniService } from '../db/veritabani.service';
import { DenetimService } from '../denetim/denetim.service';
import { AlanSifrelemeService } from '../ortak/alan-sifreleme.service';
import { ApiHatasi } from '../ortak/dogrulama';
import type { Kimlik, YetkiBaglami } from '../yetki/baglam';
import { YetkiService } from '../yetki/yetki.service';
import type { BelgeEkleIstegi, PersonelBilgiIstegi } from './belgeler.dto';

export interface YuklenenDosya {
  originalname: string;
  buffer: Buffer;
  size: number;
}

type BelgeSatiri = typeof belgeler.$inferSelect;

async function bugun(tx: Islem): Promise<string> {
  const s = await tx.execute<{ gun: string }>(sql`SELECT (now() AT TIME ZONE ${KURUM_SAAT_DILIMI})::date::text AS gun`);
  return s.rows[0]!.gun;
}

/** İçeriğin gerçek türü dosya imzasından (magic bytes) belirlenir; istemcinin bildirdiği tür dikkate alınmaz. */
function dosyaTuru(b: Buffer): 'application/pdf' | 'image/jpeg' | 'image/png' | null {
  if (b.subarray(0, 5).toString('latin1') === '%PDF-') return 'application/pdf';
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  return null;
}

function dosyaAdi(ad: string): string {
  // Multer adı latin1 olarak çözer; UTF-8'e geri çevir, yol ve kontrol karakterlerini temizle
  const utf8 = Buffer.from(ad, 'latin1').toString('utf8');
  const temiz = utf8.split(/[\\/]/).pop()!.replace(/[\u0000-\u001f\u007f"]/g, '').trim();
  return (temiz || 'belge').slice(0, 200);
}

const turAdi = (kapsam: AlarmKapsami, tur: string) =>
  kapsam === 'personel'
    ? personelBelgeKoduMu(tur) ? PERSONEL_BELGE_TURLERI[tur].ad : tur
    : kurumBelgeKoduMu(tur) ? KURUM_BELGE_TURLERI[tur].ad : tur;

@Injectable()
export class BelgelerService {
  constructor(
    private readonly db: VeritabaniService,
    private readonly denetim: DenetimService,
    private readonly sifreleme: AlanSifrelemeService,
    private readonly yetkiService: YetkiService,
  ) {}

  private belgeCiktisi(b: BelgeSatiri, gun: string, dosya?: { ad: string; icerikTuru: string; boyut: number } | null) {
    const esikler = b.kapsam === 'kurum' ? KURUM_UYARI_GUNLERI : PERSONEL_UYARI_GUNLERI;
    const { isletmeId: _i, ...geri } = b;
    return { ...geri, turAd: turAdi(b.kapsam as AlarmKapsami, b.tur), ...belgeDurumu(b.bitis, gun, esikler), dosya: dosya ?? null };
  }

  /**
   * Zorunlu belge eksikliği kimlerde aranır: aktif ve rolü olan kullanıcılar. Yalnızca “kurum sahibi”
   * rolü olan kişi çalışan sayılmaz (işletmeye uğramayan ortak olabilir).
   */
  private calisanMi(roller: string[]): boolean {
    return roller.some((r) => r !== 'kurum_sahibi');
  }

  // ——— Personel ———

  async personelListesi(kimlik: Kimlik) {
    return this.db.kiraciIslemi(kimlik, async (tx) => {
      const gun = await bugun(tx);
      const kisiler = await tx
        .select({ id: kullanicilar.id, adSoyad: kullanicilar.adSoyad, meslek: kullanicilar.meslek, aktif: kullanicilar.aktif, unvanBrans: personelBilgileri.unvanBrans, calismaSekli: personelBilgileri.calismaSekli })
        .from(kullanicilar)
        .leftJoin(personelBilgileri, eq(personelBilgileri.kullaniciId, kullanicilar.id))
        .orderBy(asc(kullanicilar.adSoyad));
      const tumBelgeler = await tx.select().from(belgeler).where(and(eq(belgeler.kapsam, 'personel'), isNull(belgeler.kaldirmaZamani)));
      const atamalar = await tx.select({ kullaniciId: rolAtamalari.kullaniciId, rolKodu: rolAtamalari.rolKodu }).from(rolAtamalari);

      return kisiler.map((k) => {
        const roller = atamalar.filter((a) => a.kullaniciId === k.id).map((a) => a.rolKodu);
        const guncel = guncelBelgeler(tumBelgeler.filter((b) => b.kullaniciId === k.id));
        const durumlar = [...guncel.values()].map((b) => belgeDurumu(b.bitis, gun));
        const eksik = meslekMi(k.meslek) && this.calisanMi(roller) ? eksikPersonelBelgeleri(k.meslek, guncel.keys()) : [];
        const say = (s: AlarmSeviyesi) => durumlar.filter((d) => d.seviye === s).length;
        const aski = [...guncel.values()].some((b) => personelBelgeKoduMu(b.tur) && 'askiyaAlir' in PERSONEL_BELGE_TURLERI[b.tur] && belgeDurumu(b.bitis, gun).durum === 'dolmus');
        return {
          ...k,
          roller: roller.map((r) => (rolKoduMu(r) ? ROLLER[r].ad : r)),
          belgeSayisi: guncel.size,
          eksikSayisi: eksik.length,
          dolmus: durumlar.filter((d) => d.durum === 'dolmus').length,
          kritik: say('kritik'),
          ciddi: say('ciddi'),
          uyari: say('uyari'),
          askida: aski,
        };
      });
    });
  }

  async personelKarti(kimlik: Kimlik, yetki: YetkiBaglami, id: string, ip: string | null) {
    const kendisi = id === kimlik.kullaniciId;
    if (!kendisi && !yetki.izinler.has('personel.goruntule') && !yetki.izinler.has('personel.yonet')) {
      throw new ApiHatasi(HttpStatus.FORBIDDEN, 'YETKI_YOK', 'Bu işlem için yetkiniz yok.');
    }
    return this.db.kiraciIslemi(kimlik, async (tx) => {
      const [k] = await tx
        .select({ id: kullanicilar.id, adSoyad: kullanicilar.adSoyad, eposta: kullanicilar.eposta, meslek: kullanicilar.meslek, aktif: kullanicilar.aktif })
        .from(kullanicilar)
        .where(eq(kullanicilar.id, id));
      if (!k) throw new ApiHatasi(HttpStatus.NOT_FOUND, 'PERSONEL_BULUNAMADI', 'Personel bulunamadı.');
      const gun = await bugun(tx);
      const [bilgi] = await tx.select().from(personelBilgileri).where(eq(personelBilgileri.kullaniciId, id));
      const roller = await tx.select({ rolKodu: rolAtamalari.rolKodu, subeId: rolAtamalari.subeId }).from(rolAtamalari).where(eq(rolAtamalari.kullaniciId, id));
      const satirlar = await tx
        .select({ b: belgeler, dosyaAd: dosyalar.ad, icerikTuru: dosyalar.icerikTuru, boyut: dosyalar.boyut, ekleyen: kullanicilar.adSoyad })
        .from(belgeler)
        .leftJoin(dosyalar, eq(dosyalar.id, belgeler.dosyaId))
        .innerJoin(kullanicilar, eq(kullanicilar.id, belgeler.ekleyenId))
        .where(eq(belgeler.kullaniciId, id))
        .orderBy(desc(belgeler.zaman));
      const aktifler = satirlar.filter((s) => !s.b.kaldirmaZamani).map((s) => s.b);
      const guncel = guncelBelgeler(aktifler);
      const guncelIdler = new Set([...guncel.values()].map((b) => b.id));
      const veri = await this.yetkiService.yukle(tx, id);

      if (!kendisi) {
        await this.denetim.kaydet(tx, { ...kimlik, eylem: 'personel.goruntulendi', varlikTipi: 'kullanici', varlikId: id, ip });
      }
      return {
        kullanici: k,
        roller: roller.map((r) => ({ ...r, ad: rolKoduMu(r.rolKodu) ? ROLLER[r.rolKodu].ad : r.rolKodu })),
        bilgi: bilgi ? { unvanBrans: bilgi.unvanBrans, calismaSekli: bilgi.calismaSekli, iseGiris: bilgi.iseGiris, telefon: bilgi.telefon } : null,
        belgeler: satirlar.map((s) => ({
          ...this.belgeCiktisi(s.b, gun, s.dosyaAd ? { ad: s.dosyaAd, icerikTuru: s.icerikTuru!, boyut: s.boyut! } : null),
          ekleyen: s.ekleyen,
          guncel: guncelIdler.has(s.b.id),
          kendiEkledi: s.b.ekleyenId === s.b.kullaniciId,
        })),
        eksikler: meslekMi(k.meslek) && this.calisanMi(roller.map((r) => r.rolKodu)) ? eksikPersonelBelgeleri(k.meslek, guncel.keys()) : [],
        askilar: veri?.askilar ?? [],
      };
    });
  }

  async bilgiGuncelle(kimlik: Kimlik, id: string, istek: PersonelBilgiIstegi, ip: string | null) {
    return this.db.kiraciIslemi(kimlik, async (tx) => {
      const [k] = await tx.select({ id: kullanicilar.id }).from(kullanicilar).where(eq(kullanicilar.id, id));
      if (!k) throw new ApiHatasi(HttpStatus.NOT_FOUND, 'PERSONEL_BULUNAMADI', 'Personel bulunamadı.');
      const telefon = istek.telefon ? istek.telefon.replace(/^0?/, '0') : null;
      const degerler = { ...istek, telefon, guncelleyenId: kimlik.kullaniciId, guncellemeZamani: new Date() };
      await tx
        .insert(personelBilgileri)
        .values({ kullaniciId: id, isletmeId: kimlik.isletmeId, ...degerler })
        .onConflictDoUpdate({ target: personelBilgileri.kullaniciId, set: degerler });
      await this.denetim.kaydet(tx, { ...kimlik, eylem: 'personel.guncellendi', varlikTipi: 'kullanici', varlikId: id, ip, ayrinti: { alanlar: Object.keys(istek) } });
      return { tamam: true };
    });
  }

  // ——— Belge ekleme / kaldırma / dosya ———

  async belgeEkle(kimlik: Kimlik, yetki: YetkiBaglami, istek: BelgeEkleIstegi, dosya: YuklenenDosya | undefined, ip: string | null) {
    const personel = istek.kapsam === 'personel';
    const gereken = personel ? 'personel.yonet' : 'belge.kurum.yonet';
    if (!yetki.izinler.has(gereken)) throw new ApiHatasi(HttpStatus.FORBIDDEN, 'YETKI_YOK', 'Bu işlem için yetkiniz yok.', { eksikIzinler: [gereken] });

    const tanim = personel
      ? personelBelgeKoduMu(istek.tur) ? PERSONEL_BELGE_TURLERI[istek.tur] : null
      : kurumBelgeKoduMu(istek.tur) ? KURUM_BELGE_TURLERI[istek.tur] : null;
    if (!tanim) throw new ApiHatasi(HttpStatus.BAD_REQUEST, 'GECERSIZ_ISTEK', 'Belge türü geçersiz.', [{ alan: 'tur', mesaj: 'Belge türü geçersiz.' }]);
    if (tanim.sureli && !istek.bitis) {
      throw new ApiHatasi(HttpStatus.BAD_REQUEST, 'GECERSIZ_ISTEK', 'Bu belge için bitiş tarihi zorunlu.', [{ alan: 'bitis', mesaj: 'Bu belge için bitiş tarihi zorunlu.' }]);
    }

    let dosyaVerisi: { ad: string; icerikTuru: 'application/pdf' | 'image/jpeg' | 'image/png'; boyut: number; sha256: string; sifreli: Buffer } | null = null;
    if (dosya) {
      if (dosya.size === 0 || dosya.size > BELGE_DOSYA_AZAMI_BAYT) throw new ApiHatasi(HttpStatus.PAYLOAD_TOO_LARGE, 'DOSYA_BUYUK', 'Dosya en çok 10 MB olabilir.');
      const tur = dosyaTuru(dosya.buffer);
      if (!tur) throw new ApiHatasi(HttpStatus.UNSUPPORTED_MEDIA_TYPE, 'DOSYA_TURU', 'Yalnızca PDF, JPEG veya PNG yüklenebilir.');
      dosyaVerisi = {
        ad: dosyaAdi(dosya.originalname),
        icerikTuru: tur,
        boyut: dosya.size,
        sha256: createHash('sha256').update(dosya.buffer).digest('hex'),
        sifreli: this.sifreleme.dosyaSifrele(dosya.buffer),
      };
    }

    return this.db.kiraciIslemi(kimlik, async (tx) => {
      if (personel) {
        const [k] = await tx.select({ id: kullanicilar.id }).from(kullanicilar).where(eq(kullanicilar.id, istek.kullaniciId!));
        if (!k) throw new ApiHatasi(HttpStatus.NOT_FOUND, 'PERSONEL_BULUNAMADI', 'Personel bulunamadı.');
      } else if (istek.subeId) {
        const [s] = await tx.select({ id: subeler.id }).from(subeler).where(eq(subeler.id, istek.subeId));
        if (!s) throw new ApiHatasi(HttpStatus.NOT_FOUND, 'SUBE_BULUNAMADI', 'Şube bulunamadı.');
      }
      let dosyaId: string | null = null;
      if (dosyaVerisi) {
        const [d] = await tx.insert(dosyalar).values({ isletmeId: kimlik.isletmeId, ...dosyaVerisi, yukleyenId: kimlik.kullaniciId }).returning({ id: dosyalar.id });
        dosyaId = d!.id;
      }
      const [b] = await tx
        .insert(belgeler)
        .values({
          isletmeId: kimlik.isletmeId,
          kapsam: istek.kapsam,
          kullaniciId: istek.kullaniciId ?? null,
          subeId: istek.subeId ?? null,
          tur: istek.tur,
          belgeNo: istek.belgeNo,
          verenKurum: istek.verenKurum,
          baslangic: istek.baslangic ?? null,
          bitis: istek.bitis ?? null,
          dosyaId,
          aciklama: istek.aciklama,
          ekleyenId: kimlik.kullaniciId,
        })
        .returning();
      await this.denetim.kaydet(tx, {
        ...kimlik,
        eylem: 'belge.eklendi',
        varlikTipi: 'belge',
        varlikId: b!.id,
        subeId: istek.subeId ?? null,
        ip,
        ayrinti: {
          kapsam: istek.kapsam,
          tur: istek.tur,
          bitis: istek.bitis ?? null,
          ...(istek.kullaniciId ? { kullaniciId: istek.kullaniciId, kendiBelgesi: istek.kullaniciId === kimlik.kullaniciId } : {}),
          ...(dosyaVerisi ? { dosyaSha256: dosyaVerisi.sha256 } : {}),
        },
      });
      return this.belgeCiktisi(b!, await bugun(tx), dosyaVerisi);
    });
  }

  private async belgeBul(tx: Islem, id: string): Promise<BelgeSatiri> {
    const [b] = await tx.select().from(belgeler).where(eq(belgeler.id, id));
    if (!b) throw new ApiHatasi(HttpStatus.NOT_FOUND, 'BELGE_BULUNAMADI', 'Belge bulunamadı.');
    return b;
  }

  async belgeKaldir(kimlik: Kimlik, yetki: YetkiBaglami, id: string, neden: string, ip: string | null) {
    return this.db.kiraciIslemi(kimlik, async (tx) => {
      const b = await this.belgeBul(tx, id);
      const gereken = b.kapsam === 'personel' ? 'personel.yonet' : 'belge.kurum.yonet';
      if (!yetki.izinler.has(gereken)) throw new ApiHatasi(HttpStatus.FORBIDDEN, 'YETKI_YOK', 'Bu işlem için yetkiniz yok.', { eksikIzinler: [gereken] });
      if (b.kaldirmaZamani) throw new ApiHatasi(HttpStatus.CONFLICT, 'BELGE_KALDIRILMIS', 'Belge zaten kaldırılmış.');
      await tx.update(belgeler).set({ kaldiranId: kimlik.kullaniciId, kaldirmaZamani: new Date(), kaldirmaNedeni: neden }).where(eq(belgeler.id, id));
      await this.denetim.kaydet(tx, { ...kimlik, eylem: 'belge.kaldirildi', varlikTipi: 'belge', varlikId: id, subeId: b.subeId, ip, ayrinti: { kapsam: b.kapsam, tur: b.tur, neden, ...(b.kullaniciId ? { kullaniciId: b.kullaniciId } : {}) } });
      return { tamam: true };
    });
  }

  async dosyaIndir(kimlik: Kimlik, yetki: YetkiBaglami, belgeId: string, ip: string | null) {
    return this.db.kiraciIslemi(kimlik, async (tx) => {
      const b = await this.belgeBul(tx, belgeId);
      const izinli =
        b.kapsam === 'personel'
          ? b.kullaniciId === kimlik.kullaniciId || yetki.izinler.has('personel.yonet') || yetki.izinler.has('personel.goruntule')
          : yetki.izinler.has('belge.kurum.yonet') || yetki.izinler.has('komuta.goruntule');
      if (!izinli) throw new ApiHatasi(HttpStatus.FORBIDDEN, 'YETKI_YOK', 'Bu işlem için yetkiniz yok.');
      if (!b.dosyaId) throw new ApiHatasi(HttpStatus.NOT_FOUND, 'DOSYA_YOK', 'Bu belgeye dosya eklenmemiş.');
      const [d] = await tx.select().from(dosyalar).where(eq(dosyalar.id, b.dosyaId));
      const icerik = this.sifreleme.dosyaCoz(d!.sifreli);
      if (createHash('sha256').update(icerik).digest('hex') !== d!.sha256) throw new Error('Belge dosyası bütünlük denetiminden geçemedi');
      await this.denetim.kaydet(tx, { ...kimlik, eylem: 'belge.dosya.indirildi', varlikTipi: 'belge', varlikId: b.id, ip, ayrinti: { kapsam: b.kapsam, tur: b.tur } });
      return { ad: d!.ad, icerikTuru: d!.icerikTuru, icerik };
    });
  }

  // ——— Kurum belgeleri ———

  async kurumBelgeleri(kimlik: Kimlik) {
    return this.db.kiraciIslemi(kimlik, async (tx) => {
      const gun = await bugun(tx);
      const tumSubeler = await tx.select({ id: subeler.id, ad: subeler.ad, kurumTipleri: subeler.kurumTipleri }).from(subeler).orderBy(asc(subeler.olusturmaZamani));
      const satirlar = await tx
        .select({ b: belgeler, dosyaAd: dosyalar.ad, icerikTuru: dosyalar.icerikTuru, boyut: dosyalar.boyut, ekleyen: kullanicilar.adSoyad })
        .from(belgeler)
        .leftJoin(dosyalar, eq(dosyalar.id, belgeler.dosyaId))
        .innerJoin(kullanicilar, eq(kullanicilar.id, belgeler.ekleyenId))
        .where(and(eq(belgeler.kapsam, 'kurum'), isNull(belgeler.kaldirmaZamani)))
        .orderBy(desc(belgeler.zaman));
      const cikti = (s: (typeof satirlar)[number]) => ({
        ...this.belgeCiktisi(s.b, gun, s.dosyaAd ? { ad: s.dosyaAd, icerikTuru: s.icerikTuru!, boyut: s.boyut! } : null),
        ekleyen: s.ekleyen,
      });
      const isletmeGeneli = satirlar.filter((s) => !s.b.subeId);
      return {
        isletmeGeneli: isletmeGeneli.map(cikti),
        subeler: tumSubeler.map((sube) => {
          const kendi = satirlar.filter((s) => s.b.subeId === sube.id);
          const guncel = guncelBelgeler([...kendi, ...isletmeGeneli].map((s) => s.b));
          return { ...sube, belgeler: kendi.map(cikti), eksikler: eksikKurumBelgeleri(sube.kurumTipleri, guncel.keys()) };
        }),
      };
    });
  }

  // ——— Alarm motoru ———

  /**
   * İzleyene görünen alarmlar: süresi yaklaşan / geçmiş belgeler ve eksik zorunlu belgeler.
   * Eskalasyon kuralı `alarmGorulebilirMi` (paylaşılan paket) ile uygulanır; şube seçiliyse kurum
   * alarmları o şube ve işletme geneliyle sınırlanır.
   */
  async alarmlar(kimlik: Kimlik, yetki: YetkiBaglami) {
    return this.db.kiraciIslemi(kimlik, async (tx) => {
      const gun = await bugun(tx);
      const izleyen = { kullaniciId: kimlik.kullaniciId, izinler: yetki.izinler };
      const alarmlar: {
        anahtar: string;
        kapsam: AlarmKapsami;
        seviye: AlarmSeviyesi;
        tur: string;
        turAd: string;
        kullaniciId: string | null;
        kisi: string | null;
        subeId: string | null;
        sube: string | null;
        bitis: string | null;
        kalanGun: number | null;
        askiyaAliyor: boolean;
      }[] = [];

      const kisiler = await tx.select({ id: kullanicilar.id, adSoyad: kullanicilar.adSoyad, meslek: kullanicilar.meslek }).from(kullanicilar).where(eq(kullanicilar.aktif, true));
      const atamalar = await tx.select({ kullaniciId: rolAtamalari.kullaniciId, rolKodu: rolAtamalari.rolKodu }).from(rolAtamalari);
      const tumBelgeler = await tx.select().from(belgeler).where(isNull(belgeler.kaldirmaZamani));

      for (const k of kisiler) {
        const guncel = guncelBelgeler(tumBelgeler.filter((b) => b.kapsam === 'personel' && b.kullaniciId === k.id));
        for (const b of guncel.values()) {
          const d = belgeDurumu(b.bitis, gun, PERSONEL_UYARI_GUNLERI);
          if (!d.seviye) continue;
          const askiyaAlir = personelBelgeKoduMu(b.tur) && 'askiyaAlir' in PERSONEL_BELGE_TURLERI[b.tur];
          alarmlar.push({ anahtar: `b:${b.id}`, kapsam: 'personel', seviye: d.seviye, tur: b.tur, turAd: turAdi('personel', b.tur), kullaniciId: k.id, kisi: k.adSoyad, subeId: null, sube: null, bitis: b.bitis, kalanGun: d.kalanGun, askiyaAliyor: askiyaAlir && d.durum === 'dolmus' });
        }
        const roller = atamalar.filter((a) => a.kullaniciId === k.id).map((a) => a.rolKodu);
        if (meslekMi(k.meslek) && this.calisanMi(roller)) {
          for (const tur of eksikPersonelBelgeleri(k.meslek, guncel.keys())) {
            alarmlar.push({ anahtar: `e:${k.id}:${tur}`, kapsam: 'personel', seviye: 'eksik', tur, turAd: turAdi('personel', tur), kullaniciId: k.id, kisi: k.adSoyad, subeId: null, sube: null, bitis: null, kalanGun: null, askiyaAliyor: false });
          }
        }
      }

      const tumSubeler = await tx.select({ id: subeler.id, ad: subeler.ad, kurumTipleri: subeler.kurumTipleri }).from(subeler);
      const kurumBelgeleri = tumBelgeler.filter((b) => b.kapsam === 'kurum');
      const genel = kurumBelgeleri.filter((b) => !b.subeId);
      for (const b of guncelBelgeler(genel).values()) {
        const d = belgeDurumu(b.bitis, gun, KURUM_UYARI_GUNLERI);
        if (d.seviye) alarmlar.push({ anahtar: `b:${b.id}`, kapsam: 'kurum', seviye: d.seviye, tur: b.tur, turAd: turAdi('kurum', b.tur), kullaniciId: null, kisi: null, subeId: null, sube: null, bitis: b.bitis, kalanGun: d.kalanGun, askiyaAliyor: false });
      }
      for (const s of tumSubeler) {
        if (yetki.subeId && s.id !== yetki.subeId) continue;
        const kendi = kurumBelgeleri.filter((b) => b.subeId === s.id);
        for (const b of guncelBelgeler(kendi).values()) {
          const d = belgeDurumu(b.bitis, gun, KURUM_UYARI_GUNLERI);
          if (d.seviye) alarmlar.push({ anahtar: `b:${b.id}`, kapsam: 'kurum', seviye: d.seviye, tur: b.tur, turAd: turAdi('kurum', b.tur), kullaniciId: null, kisi: null, subeId: s.id, sube: s.ad, bitis: b.bitis, kalanGun: d.kalanGun, askiyaAliyor: false });
        }
        for (const tur of eksikKurumBelgeleri(s.kurumTipleri, guncelBelgeler([...kendi, ...genel]).keys())) {
          alarmlar.push({ anahtar: `e:${s.id}:${tur}`, kapsam: 'kurum', seviye: 'eksik', tur, turAd: turAdi('kurum', tur), kullaniciId: null, kisi: null, subeId: s.id, sube: s.ad, bitis: null, kalanGun: null, askiyaAliyor: false });
        }
      }

      return alarmlar
        .filter((a) => alarmGorulebilirMi(a, izleyen))
        .sort((a, b) => ALARM_SIRASI[a.seviye] - ALARM_SIRASI[b.seviye] || (a.kalanGun ?? 0) - (b.kalanGun ?? 0) || a.turAd.localeCompare(b.turAd, 'tr'));
    });
  }
}
