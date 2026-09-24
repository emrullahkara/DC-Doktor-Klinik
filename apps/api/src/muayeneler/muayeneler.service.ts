import { createHash } from 'node:crypto';
import { HttpStatus, Injectable } from '@nestjs/common';
import { verify } from '@node-rs/argon2';
import {
  ACIL_ERISIM_SURESI_SAAT,
  aramaMetni,
  ICD10_BASLANGIC,
  type Izin,
  KURUM_SAAT_DILIMI,
  UYARI_TURLERI,
  uyariGorulebilirMi,
  type UyariTuru,
} from '@dc/shared';
import { and, asc, desc, eq, gt, isNull, ne, or, sql } from 'drizzle-orm';
import { type Islem, VeritabaniService } from '../db/veritabani.service';
import { acilErisimler, hastaUyarilari, kisiler, kullanicilar, muayeneEkleri, muayeneler, randevular, subeler } from '../db/sema';
import { DenetimService } from '../denetim/denetim.service';
import { ApiHatasi } from '../ortak/dogrulama';
import type { Kimlik, YetkiBaglami } from '../yetki/baglam';
import type { AcilErisimIstegi, MuayeneGuncelleIstegi } from './muayeneler.dto';

export type ErisimNedeni = 'denetim' | 'tedavi' | 'randevu' | 'acil';

/** Güncelleme alanlarının gerektirdiği izin: hemşire şikâyet ve vital girer; tanı, plan ve reçete hekimindir. */
const ALAN_IZNI: Record<keyof MuayeneGuncelleIstegi, Izin> = {
  sikayet: 'tibbi.kayit.yaz',
  vitaller: 'tibbi.kayit.yaz',
  fizikMuayene: 'tani.koy',
  plan: 'tani.koy',
  tanilar: 'tani.koy',
  recete: 'recete.yaz',
  kontrolTarihi: 'tani.koy',
};
const HEKIM_ALANLARI = new Set<keyof MuayeneGuncelleIstegi>(['fizikMuayene', 'plan', 'tanilar', 'recete', 'kontrolTarihi']);

function bulunamadi(): never {
  throw new ApiHatasi(HttpStatus.NOT_FOUND, 'MUAYENE_BULUNAMADI', 'Muayene kaydı bulunamadı.');
}

@Injectable()
export class MuayenelerService {
  constructor(
    private readonly db: VeritabaniService,
    private readonly denetim: DenetimService,
  ) {}

  /**
   * Tedavi ilişkisi kuralı: tıbbi kayda kim, hangi gerekçeyle erişebilir? Denetim izine en somut
   * gerekçe yazılsın diye sırayla bakılır:
   *  - tedavi:  hekimin bu hastayla son bir yıl içinde veya ileri tarihli randevusu ya da muayenesi var
   *  - randevu: hekim olmayan sağlık personeli (hemşire, tekniker…); hastanın bugün bu şubede randevusu var.
   *            Hekimler bu genişlikten yararlanmaz: yalnızca kendi hastalarını görürler.
   *  - acil:    süresi dolmamış gerekçeli acil erişim kaydı
   *  - denetim: kurumsal denetim yetkisi (başhekim, mesul müdür)
   */
  async erisimNedeni(tx: Islem, kimlik: Kimlik, yetki: YetkiBaglami, kisiId: string): Promise<ErisimNedeni | null> {
    const denetim = yetki.izinler.has('tibbi.kayit.denetim');
    if (!yetki.izinler.has('tibbi.kayit.goruntule')) return denetim ? 'denetim' : null;

    if (yetki.izinler.has('tani.koy')) {
      const [randevu] = await tx
        .select({ id: randevular.id })
        .from(randevular)
        .where(and(eq(randevular.kisiId, kisiId), eq(randevular.hekimId, kimlik.kullaniciId), ne(randevular.durum, 'iptal'), sql`${randevular.baslangic} > now() - interval '365 days'`))
        .limit(1);
      const [muayene] = randevu ? [randevu] : await tx.select({ id: muayeneler.id }).from(muayeneler).where(and(eq(muayeneler.kisiId, kisiId), eq(muayeneler.hekimId, kimlik.kullaniciId))).limit(1);
      if (muayene) return 'tedavi';
    }
    if (yetki.subeId && !yetki.izinler.has('tani.koy')) {
      const [bugun] = await tx
        .select({ id: randevular.id })
        .from(randevular)
        .where(
          and(
            eq(randevular.kisiId, kisiId),
            eq(randevular.subeId, yetki.subeId),
            ne(randevular.durum, 'iptal'),
            sql`(${randevular.baslangic} AT TIME ZONE ${KURUM_SAAT_DILIMI})::date = (now() AT TIME ZONE ${KURUM_SAAT_DILIMI})::date`,
          ),
        )
        .limit(1);
      if (bugun) return 'randevu';
    }
    const [acil] = await tx
      .select({ id: acilErisimler.id })
      .from(acilErisimler)
      .where(and(eq(acilErisimler.kullaniciId, kimlik.kullaniciId), eq(acilErisimler.kisiId, kisiId), gt(acilErisimler.bitis, sql`now()`)))
      .limit(1);
    if (acil) return 'acil';
    return denetim ? 'denetim' : null;
  }

  private async erisimGerekli(tx: Islem, kimlik: Kimlik, yetki: YetkiBaglami, kisiId: string): Promise<ErisimNedeni> {
    const neden = await this.erisimNedeni(tx, kimlik, yetki, kisiId);
    if (!neden) {
      throw new ApiHatasi(
        HttpStatus.FORBIDDEN,
        'TEDAVI_ILISKISI_YOK',
        'Bu hastayla tedavi ilişkiniz yok. Gerekirse gerekçe belirterek acil erişim açabilirsiniz.',
      );
    }
    return neden;
  }

  /** Randevudan muayene kaydı açar; aynı randevunun kaydı varsa onu döndürür. */
  async olustur(kimlik: Kimlik, yetki: YetkiBaglami, randevuId: string, ip: string | null) {
    if (!yetki.subeId) throw new ApiHatasi(HttpStatus.BAD_REQUEST, 'SUBE_SECILMELI', 'Bir şube seçin.');
    return this.db.kiraciIslemi(kimlik, async (tx) => {
      const [randevu] = await tx
        .select({ kisiId: randevular.kisiId, hayvanId: randevular.hayvanId, hekimId: randevular.hekimId, durum: randevular.durum })
        .from(randevular)
        .where(and(eq(randevular.id, randevuId), eq(randevular.subeId, yetki.subeId!)));
      if (!randevu) throw new ApiHatasi(HttpStatus.NOT_FOUND, 'RANDEVU_BULUNAMADI', 'Randevu bulunamadı.');
      if (!['geldi', 'muayenede', 'tamamlandi'].includes(randevu.durum)) {
        throw new ApiHatasi(HttpStatus.UNPROCESSABLE_ENTITY, 'HASTA_GELMEDI', 'Muayene kaydı, hasta kabul edildikten sonra açılır.');
      }
      await this.erisimGerekli(tx, kimlik, yetki, randevu.kisiId);

      const [mevcut] = await tx.select({ id: muayeneler.id }).from(muayeneler).where(eq(muayeneler.randevuId, randevuId));
      if (mevcut) return { id: mevcut.id, yeni: false };

      const [muayene] = await tx
        .insert(muayeneler)
        .values({ isletmeId: kimlik.isletmeId, subeId: yetki.subeId!, kisiId: randevu.kisiId, hayvanId: randevu.hayvanId, randevuId, hekimId: randevu.hekimId, olusturanId: kimlik.kullaniciId })
        .onConflictDoNothing({ target: muayeneler.randevuId })
        .returning({ id: muayeneler.id });
      if (!muayene) {
        const [yarisan] = await tx.select({ id: muayeneler.id }).from(muayeneler).where(eq(muayeneler.randevuId, randevuId));
        return { id: yarisan!.id, yeni: false };
      }
      await this.denetim.kaydet(tx, { ...kimlik, eylem: 'muayene.acildi', varlikTipi: 'muayene', varlikId: muayene.id, subeId: yetki.subeId, ip, ayrinti: { hastaId: randevu.kisiId } });
      return { id: muayene.id, yeni: true };
    });
  }

  async getir(kimlik: Kimlik, yetki: YetkiBaglami, id: string, ip: string | null) {
    return this.db.kiraciIslemi(kimlik, async (tx) => {
      const [m] = await tx
        .select({ muayene: muayeneler, hekimAd: kullanicilar.adSoyad, subeAd: subeler.ad })
        .from(muayeneler)
        .innerJoin(kullanicilar, eq(kullanicilar.id, muayeneler.hekimId))
        .innerJoin(subeler, eq(subeler.id, muayeneler.subeId))
        .where(eq(muayeneler.id, id));
      if (!m) bulunamadi();
      const neden = await this.erisimGerekli(tx, kimlik, yetki, m.muayene.kisiId);

      const [hasta] = await tx
        .select({ id: kisiler.id, ad: kisiler.ad, soyad: kisiler.soyad, dogumTarihi: kisiler.dogumTarihi, cinsiyet: kisiler.cinsiyet, kimlikNoMaske: kisiler.kimlikNoMaske, kanGrubu: kisiler.kanGrubu })
        .from(kisiler)
        .where(eq(kisiler.id, m.muayene.kisiId));
      const uyarilar = (
        await tx
          .select({ id: hastaUyarilari.id, tur: hastaUyarilari.tur, aciklama: hastaUyarilari.aciklama })
          .from(hastaUyarilari)
          .where(and(isNull(hastaUyarilari.kaldirmaZamani), m.muayene.hayvanId ? or(eq(hastaUyarilari.kisiId, m.muayene.kisiId), eq(hastaUyarilari.hayvanId, m.muayene.hayvanId)) : eq(hastaUyarilari.kisiId, m.muayene.kisiId)))
      ).filter((u) => u.tur in UYARI_TURLERI && uyariGorulebilirMi(u.tur as UyariTuru, yetki.izinler));
      const ekler = await tx
        .select({ id: muayeneEkleri.id, metin: muayeneEkleri.metin, zaman: muayeneEkleri.zaman, yazan: kullanicilar.adSoyad })
        .from(muayeneEkleri)
        .innerJoin(kullanicilar, eq(kullanicilar.id, muayeneEkleri.yazanId))
        .where(eq(muayeneEkleri.muayeneId, id))
        .orderBy(asc(muayeneEkleri.zaman));

      await this.denetim.kaydet(tx, { ...kimlik, eylem: 'muayene.goruntulendi', varlikTipi: 'muayene', varlikId: id, subeId: yetki.subeId, ip, ayrinti: { erisimNedeni: neden, hastaId: m.muayene.kisiId } });

      const { isletmeId: _i, icerikOzeti, ...muayene } = m.muayene;
      return {
        ...muayene,
        icerikOzeti,
        hekimAd: m.hekimAd,
        subeAd: m.subeAd,
        hasta,
        uyarilar,
        ekler,
        erisimNedeni: neden,
        benimKaydim: m.muayene.hekimId === kimlik.kullaniciId,
      };
    });
  }

  /**
   * Taslak muayene kaydını günceller. Şikâyet ve vitalleri sağlık personeli, diğer alanları
   * yalnızca kaydın hekimi girer. Tanı olmadan reçete kaydedilemez.
   */
  async guncelle(kimlik: Kimlik, yetki: YetkiBaglami, id: string, istek: MuayeneGuncelleIstegi, ip: string | null) {
    const alanlar = Object.keys(istek) as (keyof MuayeneGuncelleIstegi)[];
    const eksik = [...new Set(alanlar.map((a) => ALAN_IZNI[a]).filter((i) => !yetki.izinler.has(i)))];
    if (eksik.length) throw new ApiHatasi(HttpStatus.FORBIDDEN, 'YETKI_YOK', 'Bu alanları düzenleme yetkiniz yok.', { eksikIzinler: eksik });

    return this.db.kiraciIslemi(kimlik, async (tx) => {
      const [m] = await tx.select().from(muayeneler).where(eq(muayeneler.id, id)).for('update');
      if (!m) bulunamadi();
      await this.erisimGerekli(tx, kimlik, yetki, m.kisiId);
      if (m.durum === 'imzali') throw new ApiHatasi(HttpStatus.CONFLICT, 'MUAYENE_IMZALI', 'İmzalanmış kayıt değiştirilemez; ek not ekleyin.');
      if (alanlar.some((a) => HEKIM_ALANLARI.has(a)) && m.hekimId !== kimlik.kullaniciId) {
        throw new ApiHatasi(HttpStatus.FORBIDDEN, 'KAYDIN_HEKIMI_DEGIL', 'Tanı, plan ve reçeteyi yalnızca muayeneyi yapan hekim girer.');
      }
      const tanilar = istek.tanilar ?? m.tanilar;
      const recete = istek.recete ?? m.recete;
      if (recete.length > 0 && tanilar.length === 0) {
        throw new ApiHatasi(HttpStatus.UNPROCESSABLE_ENTITY, 'TANI_GEREKLI', 'Reçete için önce tanı girin.');
      }

      const degisiklik: Partial<typeof muayeneler.$inferInsert> = { guncellemeZamani: new Date() };
      if (istek.sikayet !== undefined) degisiklik.sikayet = istek.sikayet;
      if (istek.fizikMuayene !== undefined) degisiklik.fizikMuayene = istek.fizikMuayene;
      if (istek.plan !== undefined) degisiklik.plan = istek.plan;
      if (istek.tanilar !== undefined) degisiklik.tanilar = istek.tanilar;
      if (istek.recete !== undefined) degisiklik.recete = istek.recete;
      if (istek.kontrolTarihi !== undefined) degisiklik.kontrolTarihi = istek.kontrolTarihi;
      if (istek.vitaller !== undefined) {
        const birlesik: Record<string, number> = { ...m.vitaller };
        for (const [kod, deger] of Object.entries(istek.vitaller)) {
          if (deger === null) delete birlesik[kod];
          else if (deger !== undefined) birlesik[kod] = deger;
        }
        Object.assign(degisiklik, { vitaller: birlesik, vitallerGirenId: kimlik.kullaniciId, vitallerZamani: new Date() });
      }
      await tx.update(muayeneler).set(degisiklik).where(eq(muayeneler.id, id));
      await this.denetim.kaydet(tx, { ...kimlik, eylem: 'muayene.guncellendi', varlikTipi: 'muayene', varlikId: id, subeId: yetki.subeId, ip, ayrinti: { alanlar } });
      return { id, guncellemeZamani: degisiklik.guncellemeZamani };
    });
  }

  /**
   * Kaydın hekimi, parolasını yeniden girerek kaydı imzalar (nitelikli e-imza entegrasyonu
   * yapılana kadar). İmzalı kayıt veritabanında kilitlenir; içerik özeti saklanır.
   * Bağlı randevu muayenedeyse tamamlanır.
   */
  async imzala(kimlik: Kimlik, yetki: YetkiBaglami, id: string, parola: string, ip: string | null) {
    const sonuc = await this.db.kiraciIslemi(kimlik, async (tx) => {
      const [m] = await tx.select().from(muayeneler).where(eq(muayeneler.id, id)).for('update');
      if (!m) bulunamadi();
      if (m.hekimId !== kimlik.kullaniciId || !yetki.izinler.has('tani.koy')) {
        throw new ApiHatasi(HttpStatus.FORBIDDEN, 'KAYDIN_HEKIMI_DEGIL', 'Kaydı yalnızca muayeneyi yapan hekim imzalayabilir.');
      }
      if (m.durum === 'imzali') throw new ApiHatasi(HttpStatus.CONFLICT, 'MUAYENE_IMZALI', 'Kayıt zaten imzalanmış.');

      const [ben] = await tx.select({ ozet: kullanicilar.parolaOzeti }).from(kullanicilar).where(eq(kullanicilar.id, kimlik.kullaniciId));
      if (!ben || !(await verify(ben.ozet, parola))) {
        await this.denetim.kaydet(tx, { ...kimlik, eylem: 'muayene.imza.reddedildi', varlikTipi: 'muayene', varlikId: id, subeId: yetki.subeId, ip });
        return { hata: 'PAROLA' as const };
      }
      if (m.tanilar.length === 0) throw new ApiHatasi(HttpStatus.UNPROCESSABLE_ENTITY, 'TANI_GEREKLI', 'Kayıt tanı girilmeden imzalanamaz.');

      const imzaZamani = new Date();
      const icerik = {
        id: m.id,
        kisiId: m.kisiId,
        hayvanId: m.hayvanId,
        hekimId: m.hekimId,
        sikayet: m.sikayet,
        vitaller: m.vitaller,
        fizikMuayene: m.fizikMuayene,
        tanilar: m.tanilar,
        plan: m.plan,
        recete: m.recete,
        kontrolTarihi: m.kontrolTarihi,
        imzaZamani: imzaZamani.toISOString(),
      };
      const icerikOzeti = createHash('sha256').update(JSON.stringify(icerik)).digest('hex');
      await tx.update(muayeneler).set({ durum: 'imzali', imzaZamani, icerikOzeti }).where(eq(muayeneler.id, id));
      if (m.randevuId) {
        await tx
          .update(randevular)
          .set({ durum: 'tamamlandi', tamamlanmaZamani: imzaZamani, guncellemeZamani: imzaZamani })
          .where(and(eq(randevular.id, m.randevuId), eq(randevular.durum, 'muayenede')));
      }
      await this.denetim.kaydet(tx, { ...kimlik, eylem: 'muayene.imzalandi', varlikTipi: 'muayene', varlikId: id, subeId: yetki.subeId, ip, ayrinti: { icerikOzeti } });
      // e-Nabız / e-Reçete gönderimi, aracı servis entegrasyonu yapıldığında bu noktada kuyruğa alınacak.
      return { id, durum: 'imzali', imzaZamani, icerikOzeti, eNabiz: 'entegrasyon_bekliyor' };
    });
    if ('hata' in sonuc) throw new ApiHatasi(HttpStatus.UNAUTHORIZED, 'PAROLA_HATALI', 'Parola hatalı; kayıt imzalanmadı.');
    return sonuc;
  }

  async ekNot(kimlik: Kimlik, yetki: YetkiBaglami, id: string, metin: string, ip: string | null) {
    return this.db.kiraciIslemi(kimlik, async (tx) => {
      const [m] = await tx.select({ kisiId: muayeneler.kisiId, durum: muayeneler.durum }).from(muayeneler).where(eq(muayeneler.id, id));
      if (!m) bulunamadi();
      await this.erisimGerekli(tx, kimlik, yetki, m.kisiId);
      if (m.durum !== 'imzali') throw new ApiHatasi(HttpStatus.UNPROCESSABLE_ENTITY, 'MUAYENE_TASLAK', 'Taslak kayıt doğrudan düzenlenir; ek not imzadan sonra eklenir.');
      const [ek] = await tx.insert(muayeneEkleri).values({ isletmeId: kimlik.isletmeId, muayeneId: id, yazanId: kimlik.kullaniciId, metin }).returning({ id: muayeneEkleri.id });
      await this.denetim.kaydet(tx, { ...kimlik, eylem: 'muayene.ek.not', varlikTipi: 'muayene', varlikId: id, subeId: yetki.subeId, ip });
      return ek!;
    });
  }

  /** Hastanın muayene geçmişi (tedavi ilişkisi şartıyla). */
  async hastaGecmisi(kimlik: Kimlik, yetki: YetkiBaglami, kisiId: string, ip: string | null) {
    return this.db.kiraciIslemi(kimlik, async (tx) => {
      const [kisi] = await tx.select({ id: kisiler.id }).from(kisiler).where(eq(kisiler.id, kisiId));
      if (!kisi) throw new ApiHatasi(HttpStatus.NOT_FOUND, 'HASTA_BULUNAMADI', 'Hasta bulunamadı.');
      const neden = await this.erisimGerekli(tx, kimlik, yetki, kisiId);
      const liste = await tx
        .select({ id: muayeneler.id, tarih: muayeneler.olusturmaZamani, durum: muayeneler.durum, tanilar: muayeneler.tanilar, hekimAd: kullanicilar.adSoyad, subeAd: subeler.ad })
        .from(muayeneler)
        .innerJoin(kullanicilar, eq(kullanicilar.id, muayeneler.hekimId))
        .innerJoin(subeler, eq(subeler.id, muayeneler.subeId))
        .where(eq(muayeneler.kisiId, kisiId))
        .orderBy(desc(muayeneler.olusturmaZamani))
        .limit(100);
      await this.denetim.kaydet(tx, { ...kimlik, eylem: 'muayene.listelendi', varlikTipi: 'hasta', varlikId: kisiId, subeId: yetki.subeId, ip, ayrinti: { erisimNedeni: neden } });
      return { erisimNedeni: neden, muayeneler: liste };
    });
  }

  /** Acil erişim (break-the-glass): gerekçeli, süreli ve denetim izine işaretli olarak kaydedilir. */
  async acilErisim(kimlik: Kimlik, yetki: YetkiBaglami, kisiId: string, istek: AcilErisimIstegi, ip: string | null) {
    return this.db.kiraciIslemi(kimlik, async (tx) => {
      const [kisi] = await tx.select({ id: kisiler.id }).from(kisiler).where(eq(kisiler.id, kisiId));
      if (!kisi) throw new ApiHatasi(HttpStatus.NOT_FOUND, 'HASTA_BULUNAMADI', 'Hasta bulunamadı.');
      const bitis = new Date(Date.now() + ACIL_ERISIM_SURESI_SAAT * 3_600_000);
      await tx.insert(acilErisimler).values({ isletmeId: kimlik.isletmeId, kullaniciId: kimlik.kullaniciId, kisiId, gerekce: istek.gerekce, aciklama: istek.aciklama, bitis });
      await this.denetim.kaydet(tx, { ...kimlik, eylem: 'acil.erisim', varlikTipi: 'hasta', varlikId: kisiId, subeId: yetki.subeId, ip, ayrinti: { gerekce: istek.gerekce, aciklama: istek.aciklama } });
      return { bitis };
    });
  }

  icd10Ara(sorgu: string) {
    const q = aramaMetni(sorgu);
    if (!q) return ICD10_BASLANGIC.slice(0, 20);
    const kodMu = /^[a-z]\d/.test(q);
    return ICD10_BASLANGIC.filter((t) => (kodMu ? t.kod.toLowerCase().startsWith(q.replace(/\s/g, '')) : aramaMetni(t.ad).includes(q))).slice(0, 20);
  }
}

