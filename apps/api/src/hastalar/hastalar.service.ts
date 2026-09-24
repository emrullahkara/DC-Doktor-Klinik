import { HttpStatus, Injectable } from '@nestjs/common';
import {
  aramaMetni,
  HASTA_AYDINLATMA_METNI,
  kimlikNoMaskele,
  RIZA_TURLERI,
  type RizaTuru,
  UYARI_TURLERI,
  UYARI_YAZMA_IZNI,
  uyariGorulebilirMi,
  type UyariTuru,
} from '@dc/shared';
import { and, asc, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import { type Islem, VeritabaniService } from '../db/veritabani.service';
import { aydinlatmaKayitlari, hastaUyarilari, hayvanlar, kisiler, rizalar, subeler } from '../db/sema';
import { DenetimService } from '../denetim/denetim.service';
import { AlanSifrelemeService } from '../ortak/alan-sifreleme.service';
import { ApiHatasi, benzersizlikIhlaliMi } from '../ortak/dogrulama';
import type { Kimlik, YetkiBaglami } from '../yetki/baglam';
import type { HastaGuncelleIstegi, HastaOlusturIstegi, HayvanIstegi, RizaIstegi, UyariIstegi } from './hastalar.dto';

/** Listelerde ve aramada dönen alanlar: kimlik numarasının yalnızca maskeli hâli. */
const OZET_ALANLAR = {
  id: kisiler.id,
  ad: kisiler.ad,
  soyad: kisiler.soyad,
  dogumTarihi: kisiler.dogumTarihi,
  cinsiyet: kisiler.cinsiyet,
  kimlikTuru: kisiler.kimlikTuru,
  kimlikNoMaske: kisiler.kimlikNoMaske,
  telefon: kisiler.telefon,
};

function likeKacis(metin: string): string {
  return metin.replace(/[\\%_]/g, (k) => `\\${k}`);
}

function bulunamadi(): never {
  throw new ApiHatasi(HttpStatus.NOT_FOUND, 'HASTA_BULUNAMADI', 'Hasta bulunamadı.');
}

@Injectable()
export class HastalarService {
  constructor(
    private readonly db: VeritabaniService,
    private readonly sifreleme: AlanSifrelemeService,
    private readonly denetim: DenetimService,
  ) {}

  /**
   * Yeni hasta kaydı.
   *  - Aynı kimlik numarası işletmede zaten kayıtlıysa mevcut kayda yönlendirilir.
   *  - Aynı ad-soyad-doğum tarihi veya telefonla benzer kayıt varsa, kullanıcı onaylamadan kaydedilmez
   *    (mükerrer kayıt önleme).
   *  - Aydınlatma metninin sunulduğu ve verilen/verilmeyen rızalar aynı işlemde kaydedilir.
   */
  async olustur(kimlik: Kimlik, yetki: YetkiBaglami, istek: HastaOlusturIstegi, ip: string | null) {
    const no = istek.kimlik.tur === 'kimliksiz' ? null : istek.kimlik.no;
    const ozet = no ? this.sifreleme.ozet(`${istek.kimlik.tur}:${no}`) : null;

    try {
      return await this.db.kiraciIslemi(kimlik, async (tx) => {
        if (ozet) {
          const [mevcut] = await tx.select({ id: kisiler.id }).from(kisiler).where(eq(kisiler.kimlikNoOzet, ozet));
          if (mevcut) {
            throw new ApiHatasi(HttpStatus.CONFLICT, 'HASTA_ZATEN_KAYITLI', 'Bu kimlik numarasıyla kayıtlı bir hasta var.', { hastaId: mevcut.id });
          }
        }
        if (!istek.yinedeKaydet) {
          const benzerler = await this.benzerleriBul(tx, istek);
          if (benzerler.length > 0) {
            throw new ApiHatasi(HttpStatus.CONFLICT, 'BENZER_KAYIT_VAR', 'Benzer bilgilere sahip kayıtlı hasta var.', { benzerler });
          }
        }

        const [kisi] = await tx
          .insert(kisiler)
          .values({
            isletmeId: kimlik.isletmeId,
            kimlikTuru: istek.kimlik.tur,
            kimlikNoSifreli: no ? this.sifreleme.sifrele(no) : null,
            kimlikNoOzet: ozet,
            kimlikNoMaske: no ? kimlikNoMaskele(no) : null,
            ...this.alanlar(istek),
            ad: istek.ad,
            soyad: istek.soyad,
            aramaMetni: aramaMetni(istek.ad, istek.soyad, istek.telefon),
            kayitSubesiId: yetki.subeId,
            olusturanId: kimlik.kullaniciId,
          })
          .returning({ id: kisiler.id });

        await tx.insert(aydinlatmaKayitlari).values({
          isletmeId: kimlik.isletmeId,
          kisiId: kisi!.id,
          metinKodu: HASTA_AYDINLATMA_METNI.kod,
          metinSurumu: HASTA_AYDINLATMA_METNI.surum,
          kanal: istek.aydinlatma.kanal,
          sunanId: kimlik.kullaniciId,
        });

        const rizaGirdileri = Object.entries(istek.rizalar ?? {}) as [RizaTuru, boolean][];
        if (rizaGirdileri.length > 0) {
          await tx.insert(rizalar).values(
            rizaGirdileri.map(([tur, verildi]) => ({
              isletmeId: kimlik.isletmeId,
              kisiId: kisi!.id,
              rizaTuru: tur,
              verildi,
              kanal: istek.aydinlatma.kanal,
              metinSurumu: HASTA_AYDINLATMA_METNI.surum,
              kaydedenId: kimlik.kullaniciId,
            })),
          );
        }

        await this.denetim.kaydet(tx, {
          ...kimlik,
          eylem: 'hasta.olusturuldu',
          varlikTipi: 'hasta',
          varlikId: kisi!.id,
          subeId: yetki.subeId,
          ip,
          ayrinti: { kimlikTuru: istek.kimlik.tur, verilenRizalar: rizaGirdileri.filter(([, v]) => v).map(([t]) => t) },
        });
        return { id: kisi!.id };
      });
    } catch (hata) {
      if (benzersizlikIhlaliMi(hata)) {
        throw new ApiHatasi(HttpStatus.CONFLICT, 'HASTA_ZATEN_KAYITLI', 'Bu kimlik numarasıyla kayıtlı bir hasta var.');
      }
      throw hata;
    }
  }

  /**
   * Hasta arama. 11 haneli sayı kimlik numarası olarak (kör indeksle tam eşleşme),
   * diğer metinler ad-soyad-telefon içinde aranır. Boş aramada son kayıtlar döner.
   */
  async ara(kimlik: Kimlik, yetki: YetkiBaglami, sorgu: string, ip: string | null) {
    const q = sorgu.trim();
    return this.db.kiraciIslemi(kimlik, async (tx) => {
      let kosul;
      if (q.length >= 2) {
        // Telefon gibi yalnızca rakam ve ayraçtan oluşan aramada ayraçlar atılır
        const normal = /^[\d\s()+-]+$/.test(q) ? q.replace(/[^\d+]/g, '') : aramaMetni(q);
        kosul = sql`${kisiler.aramaMetni} LIKE ${`%${likeKacis(normal)}%`}`;
        // Kimlik numarası biçimindeyse (0 ile başlamayan 11 hane) kör indeksle tam eşleşme de aranır
        if (/^[1-9]\d{10}$/.test(normal)) {
          kosul = or(kosul, inArray(kisiler.kimlikNoOzet, [this.sifreleme.ozet(`tc:${normal}`), this.sifreleme.ozet(`yabanci:${normal}`)]));
        }
      }
      const sonuc = await tx
        .select(OZET_ALANLAR)
        .from(kisiler)
        .where(kosul)
        .orderBy(kosul ? asc(kisiler.aramaMetni) : desc(kisiler.olusturmaZamani))
        .limit(50);
      await this.denetim.kaydet(tx, { ...kimlik, eylem: 'hasta.arandi', subeId: yetki.subeId, ip, ayrinti: { sonucSayisi: sonuc.length } });
      return sonuc;
    });
  }

  /** Hasta kartı. Uyarı bayrakları görüntüleyenin yetkisine göre süzülür; her görüntüleme kayda geçer. */
  async kart(kimlik: Kimlik, yetki: YetkiBaglami, id: string, ip: string | null) {
    return this.db.kiraciIslemi(kimlik, async (tx) => {
      const [kisi] = await tx
        .select({
          ...OZET_ALANLAR,
          uyruk: kisiler.uyruk,
          eposta: kisiler.eposta,
          adres: kisiler.adres,
          kanGrubu: kisiler.kanGrubu,
          iletisimTercihi: kisiler.iletisimTercihi,
          acilKisiAd: kisiler.acilKisiAd,
          acilKisiTelefon: kisiler.acilKisiTelefon,
          acilKisiYakinlik: kisiler.acilKisiYakinlik,
          temsilciAd: kisiler.temsilciAd,
          temsilciTelefon: kisiler.temsilciTelefon,
          temsilciYakinlik: kisiler.temsilciYakinlik,
          olusturmaZamani: kisiler.olusturmaZamani,
        })
        .from(kisiler)
        .where(eq(kisiler.id, id));
      if (!kisi) bulunamadi();

      const hayvanListesi = await tx
        .select({
          id: hayvanlar.id,
          ad: hayvanlar.ad,
          tur: hayvanlar.tur,
          irk: hayvanlar.irk,
          cinsiyet: hayvanlar.cinsiyet,
          kisirlastirilmis: hayvanlar.kisirlastirilmis,
          dogumTarihi: hayvanlar.dogumTarihi,
          renk: hayvanlar.renk,
          mikrocipNo: hayvanlar.mikrocipNo,
        })
        .from(hayvanlar)
        .where(eq(hayvanlar.sahipKisiId, id))
        .orderBy(asc(hayvanlar.ad));
      const hayvanIdleri = hayvanListesi.map((h) => h.id);

      const tumUyarilar = await tx
        .select({ id: hastaUyarilari.id, tur: hastaUyarilari.tur, aciklama: hastaUyarilari.aciklama, hayvanId: hastaUyarilari.hayvanId, olusturmaZamani: hastaUyarilari.olusturmaZamani })
        .from(hastaUyarilari)
        .where(
          and(
            isNull(hastaUyarilari.kaldirmaZamani),
            hayvanIdleri.length ? or(eq(hastaUyarilari.kisiId, id), inArray(hastaUyarilari.hayvanId, hayvanIdleri)) : eq(hastaUyarilari.kisiId, id),
          ),
        )
        .orderBy(asc(hastaUyarilari.olusturmaZamani));
      const uyarilar = tumUyarilar.filter((u) => u.tur in UYARI_TURLERI && uyariGorulebilirMi(u.tur as UyariTuru, yetki.izinler));

      const rizaGecmisi = await tx
        .select({ tur: rizalar.rizaTuru, verildi: rizalar.verildi, kanal: rizalar.kanal, zaman: rizalar.zaman })
        .from(rizalar)
        .where(eq(rizalar.kisiId, id))
        .orderBy(desc(rizalar.zaman));
      const guncelRizalar = (Object.keys(RIZA_TURLERI) as RizaTuru[]).map((tur) => {
        const son = rizaGecmisi.find((r) => r.tur === tur);
        return { tur, verildi: son?.verildi ?? false, kayitli: !!son, zaman: son?.zaman ?? null, kanal: son?.kanal ?? null };
      });

      const [aydinlatma] = await tx
        .select({ metinSurumu: aydinlatmaKayitlari.metinSurumu, kanal: aydinlatmaKayitlari.kanal, zaman: aydinlatmaKayitlari.zaman })
        .from(aydinlatmaKayitlari)
        .where(eq(aydinlatmaKayitlari.kisiId, id))
        .orderBy(desc(aydinlatmaKayitlari.zaman))
        .limit(1);

      await this.denetim.kaydet(tx, { ...kimlik, eylem: 'hasta.goruntulendi', varlikTipi: 'hasta', varlikId: id, subeId: yetki.subeId, ip });

      return {
        ...kisi,
        uyarilar: uyarilar.filter((u) => !u.hayvanId),
        hayvanlar: hayvanListesi.map((h) => ({ ...h, uyarilar: uyarilar.filter((u) => u.hayvanId === h.id) })),
        rizalar: guncelRizalar,
        aydinlatma: aydinlatma ?? null,
      };
    });
  }

  async guncelle(kimlik: Kimlik, yetki: YetkiBaglami, id: string, istek: HastaGuncelleIstegi, ip: string | null) {
    return this.db.kiraciIslemi(kimlik, async (tx) => {
      const [mevcut] = await tx.select({ ad: kisiler.ad, soyad: kisiler.soyad, telefon: kisiler.telefon }).from(kisiler).where(eq(kisiler.id, id));
      if (!mevcut) bulunamadi();
      const yeni = { ...mevcut, ...istek };
      await tx
        .update(kisiler)
        .set({ ...this.alanlar(istek), aramaMetni: aramaMetni(yeni.ad, yeni.soyad, yeni.telefon), guncellemeZamani: new Date() })
        .where(eq(kisiler.id, id));
      // Değerler değil yalnızca değişen alan adları kaydedilir (denetim izi kişisel veri deposuna dönüşmesin).
      await this.denetim.kaydet(tx, { ...kimlik, eylem: 'hasta.guncellendi', varlikTipi: 'hasta', varlikId: id, subeId: yetki.subeId, ip, ayrinti: { alanlar: Object.keys(istek) } });
      return { id };
    });
  }

  /** Kimlik numarasının açık hâli: ayrı yetki ve ayrı denetim kaydı ister. */
  async kimlikNoGoster(kimlik: Kimlik, yetki: YetkiBaglami, id: string, ip: string | null) {
    return this.db.kiraciIslemi(kimlik, async (tx) => {
      const [kisi] = await tx.select({ sifreli: kisiler.kimlikNoSifreli, tur: kisiler.kimlikTuru }).from(kisiler).where(eq(kisiler.id, id));
      if (!kisi) bulunamadi();
      await this.denetim.kaydet(tx, { ...kimlik, eylem: 'hasta.kimlik.goruntulendi', varlikTipi: 'hasta', varlikId: id, subeId: yetki.subeId, ip });
      return { tur: kisi.tur, no: kisi.sifreli ? this.sifreleme.coz(kisi.sifreli) : null };
    });
  }

  async rizaKaydet(kimlik: Kimlik, yetki: YetkiBaglami, id: string, istek: RizaIstegi, ip: string | null) {
    return this.db.kiraciIslemi(kimlik, async (tx) => {
      await this.kisiVarMi(tx, id);
      await tx.insert(rizalar).values({
        isletmeId: kimlik.isletmeId,
        kisiId: id,
        rizaTuru: istek.tur,
        verildi: istek.verildi,
        kanal: istek.kanal,
        metinSurumu: HASTA_AYDINLATMA_METNI.surum,
        kaydedenId: kimlik.kullaniciId,
      });
      await this.denetim.kaydet(tx, {
        ...kimlik,
        eylem: istek.verildi ? 'riza.verildi' : 'riza.geri.cekildi',
        varlikTipi: 'hasta',
        varlikId: id,
        subeId: yetki.subeId,
        ip,
        ayrinti: { rizaTuru: istek.tur, kanal: istek.kanal },
      });
      return { tur: istek.tur, verildi: istek.verildi };
    });
  }

  async uyariEkle(kimlik: Kimlik, yetki: YetkiBaglami, id: string, istek: UyariIstegi, ip: string | null) {
    this.uyariYetkisi(yetki, istek.tur);
    return this.db.kiraciIslemi(kimlik, async (tx) => {
      await this.kisiVarMi(tx, id);
      if (istek.hayvanId) await this.hayvanSahibiMi(tx, istek.hayvanId, id);
      const [uyari] = await tx
        .insert(hastaUyarilari)
        .values({
          isletmeId: kimlik.isletmeId,
          kisiId: istek.hayvanId ? null : id,
          hayvanId: istek.hayvanId ?? null,
          tur: istek.tur,
          aciklama: istek.aciklama,
          olusturanId: kimlik.kullaniciId,
        })
        .returning({ id: hastaUyarilari.id });
      await this.denetim.kaydet(tx, { ...kimlik, eylem: 'hasta.uyari.eklendi', varlikTipi: 'hasta', varlikId: id, subeId: yetki.subeId, ip, ayrinti: { tur: istek.tur } });
      return uyari!;
    });
  }

  async uyariKaldir(kimlik: Kimlik, yetki: YetkiBaglami, id: string, uyariId: string, ip: string | null) {
    return this.db.kiraciIslemi(kimlik, async (tx) => {
      const [uyari] = await tx
        .select({ tur: hastaUyarilari.tur, kisiId: hastaUyarilari.kisiId, hayvanId: hastaUyarilari.hayvanId })
        .from(hastaUyarilari)
        .where(and(eq(hastaUyarilari.id, uyariId), isNull(hastaUyarilari.kaldirmaZamani)));
      if (!uyari || !(uyari.tur in UYARI_TURLERI)) throw new ApiHatasi(HttpStatus.NOT_FOUND, 'UYARI_BULUNAMADI', 'Uyarı bulunamadı.');
      if (uyari.kisiId !== id) {
        if (!uyari.hayvanId) throw new ApiHatasi(HttpStatus.NOT_FOUND, 'UYARI_BULUNAMADI', 'Uyarı bulunamadı.');
        await this.hayvanSahibiMi(tx, uyari.hayvanId, id);
      }
      this.uyariYetkisi(yetki, uyari.tur as UyariTuru);
      await tx.update(hastaUyarilari).set({ kaldiranId: kimlik.kullaniciId, kaldirmaZamani: new Date() }).where(eq(hastaUyarilari.id, uyariId));
      await this.denetim.kaydet(tx, { ...kimlik, eylem: 'hasta.uyari.kaldirildi', varlikTipi: 'hasta', varlikId: id, subeId: yetki.subeId, ip, ayrinti: { tur: uyari.tur } });
      return { id: uyariId };
    });
  }

  /** Hayvan kaydı yalnızca veteriner şubesi olan işletmelerde açılır. */
  async hayvanEkle(kimlik: Kimlik, yetki: YetkiBaglami, id: string, istek: HayvanIstegi, ip: string | null) {
    try {
      return await this.db.kiraciIslemi(kimlik, async (tx) => {
        await this.kisiVarMi(tx, id);
        const [vet] = await tx.select({ id: subeler.id }).from(subeler).where(sql`'veteriner' = ANY(${subeler.kurumTipleri})`).limit(1);
        if (!vet) throw new ApiHatasi(HttpStatus.UNPROCESSABLE_ENTITY, 'VETERINER_SUBE_YOK', 'Hayvan kaydı için kurumda veteriner şubesi bulunmalı.');
        const [hayvan] = await tx
          .insert(hayvanlar)
          .values({ isletmeId: kimlik.isletmeId, sahipKisiId: id, ...istek, olusturanId: kimlik.kullaniciId })
          .returning({ id: hayvanlar.id });
        await this.denetim.kaydet(tx, { ...kimlik, eylem: 'hayvan.olusturuldu', varlikTipi: 'hayvan', varlikId: hayvan!.id, subeId: yetki.subeId, ip, ayrinti: { sahipId: id, tur: istek.tur } });
        return hayvan!;
      });
    } catch (hata) {
      if (benzersizlikIhlaliMi(hata)) throw new ApiHatasi(HttpStatus.CONFLICT, 'MIKROCIP_KAYITLI', 'Bu mikroçip numarasıyla kayıtlı bir hayvan var.');
      throw hata;
    }
  }

  private uyariYetkisi(yetki: YetkiBaglami, tur: UyariTuru): void {
    const gereken = UYARI_YAZMA_IZNI[UYARI_TURLERI[tur].gizlilik];
    if (!yetki.izinler.has(gereken)) {
      throw new ApiHatasi(HttpStatus.FORBIDDEN, 'YETKI_YOK', 'Bu uyarı türünü yönetme yetkiniz yok.', { eksikIzinler: [gereken] });
    }
  }

  private async kisiVarMi(tx: Islem, id: string): Promise<void> {
    const [kisi] = await tx.select({ id: kisiler.id }).from(kisiler).where(eq(kisiler.id, id));
    if (!kisi) bulunamadi();
  }

  private async hayvanSahibiMi(tx: Islem, hayvanId: string, kisiId: string): Promise<void> {
    const [hayvan] = await tx.select({ id: hayvanlar.id }).from(hayvanlar).where(and(eq(hayvanlar.id, hayvanId), eq(hayvanlar.sahipKisiId, kisiId)));
    if (!hayvan) throw new ApiHatasi(HttpStatus.NOT_FOUND, 'HAYVAN_BULUNAMADI', 'Hayvan bulunamadı.');
  }

  private async benzerleriBul(tx: Islem, istek: HastaOlusturIstegi) {
    const adSoyad = aramaMetni(istek.ad, istek.soyad);
    const kosullar = [];
    if (istek.dogumTarihi) {
      kosullar.push(and(sql`${kisiler.aramaMetni} LIKE ${`${likeKacis(adSoyad)}%`}`, eq(kisiler.dogumTarihi, istek.dogumTarihi)));
    }
    if (istek.telefon) kosullar.push(eq(kisiler.telefon, istek.telefon));
    if (kosullar.length === 0) return [];
    return tx.select(OZET_ALANLAR).from(kisiler).where(or(...kosullar)).limit(5);
  }

  /** İstekteki demografik alanları veritabanı sütunlarına eşler (undefined olanlar dokunulmaz). */
  private alanlar(istek: Partial<HastaGuncelleIstegi>) {
    const alanlar: Partial<typeof kisiler.$inferInsert> = {
      ad: istek.ad,
      soyad: istek.soyad,
      dogumTarihi: istek.dogumTarihi,
      cinsiyet: istek.cinsiyet,
      uyruk: istek.uyruk,
      telefon: istek.telefon,
      eposta: istek.eposta,
      adres: istek.adres,
      kanGrubu: istek.kanGrubu,
      iletisimTercihi: istek.iletisimTercihi,
    };
    if (istek.acilKisi) Object.assign(alanlar, { acilKisiAd: istek.acilKisi.ad, acilKisiTelefon: istek.acilKisi.telefon ?? null, acilKisiYakinlik: istek.acilKisi.yakinlik ?? null });
    if (istek.temsilci) Object.assign(alanlar, { temsilciAd: istek.temsilci.ad, temsilciTelefon: istek.temsilci.telefon ?? null, temsilciYakinlik: istek.temsilci.yakinlik ?? null });
    return Object.fromEntries(Object.entries(alanlar).filter(([, d]) => d !== undefined)) as Partial<typeof kisiler.$inferInsert>;
  }
}
