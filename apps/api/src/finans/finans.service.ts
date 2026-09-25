import { HttpStatus, Injectable } from '@nestjs/common';
import { INDIRIM_ONAY_ESIGI_YUZDE, kalemTutari, KURUM_SAAT_DILIMI, tlKurus } from '@dc/shared';
import { aliasedTable, and, asc, desc, eq, isNull, sql } from 'drizzle-orm';
import { type Islem, VeritabaniService } from '../db/veritabani.service';
import { fiyatTalepleri, hesapKalemleri, hizmetler, kasaKapanislari, kisiler, kullanicilar, randevular, tahsilatlar } from '../db/sema';
import { DenetimService } from '../denetim/denetim.service';
import { YetkiService } from '../yetki/yetki.service';
import { ApiHatasi, benzersizlikIhlaliMi } from '../ortak/dogrulama';
import type { Kimlik, YetkiBaglami } from '../yetki/baglam';
import type { HizmetIstegi, KalemIstegi, KapanisIstegi, TahsilatIstegi } from './finans.dto';

function subeGerekli(yetki: YetkiBaglami): string {
  if (!yetki.subeId) throw new ApiHatasi(HttpStatus.BAD_REQUEST, 'SUBE_SECILMELI', 'Kasa işlemleri için bir şube seçin.');
  return yetki.subeId;
}

async function bugun(tx: Islem): Promise<string> {
  const sonuc = await tx.execute<{ gun: string }>(sql`SELECT (now() AT TIME ZONE ${KURUM_SAAT_DILIMI})::date::text AS gun`);
  return sonuc.rows[0]!.gun;
}

/** Aynı şubenin aynı kasa gününe ait tahsilat ve kapanışları sıraya sokar. */
async function kasaKilidi(tx: Islem, subeId: string, gun: string): Promise<void> {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`kasa:${subeId}:${gun}`}, 2))`);
}

@Injectable()
export class FinansService {
  constructor(
    private readonly db: VeritabaniService,
    private readonly denetim: DenetimService,
    private readonly yetkiService: YetkiService,
  ) {}

  // ——— Hizmetler ve fiyatlar ———

  async hizmetler(kimlik: Kimlik) {
    return this.db.kiraciIslemi(kimlik, async (tx) => {
      const liste = await tx.select().from(hizmetler).orderBy(asc(hizmetler.kategori), asc(hizmetler.ad));
      const bekleyen = await tx.select({ hizmetId: fiyatTalepleri.hizmetId }).from(fiyatTalepleri).where(eq(fiyatTalepleri.durum, 'bekliyor'));
      const bekleyenler = new Set(bekleyen.map((b) => b.hizmetId));
      return liste.map(({ isletmeId: _i, ...h }) => ({ ...h, onayBekliyor: bekleyenler.has(h.id) }));
    });
  }

  /**
   * Yeni hizmet. Fiyat onay yetkisi olan (kurum sahibi) doğrudan yayınlar; diğerlerinin (genel müdür)
   * önerdiği fiyat, onaylanana kadar hizmeti pasif bırakır.
   */
  async hizmetEkle(kimlik: Kimlik, yetki: YetkiBaglami, istek: HizmetIstegi, ip: string | null) {
    const dogrudan = yetki.izinler.has('fiyat.onayla');
    try {
      return await this.db.kiraciIslemi(kimlik, async (tx) => {
        const fiyatKurus = tlKurus(istek.fiyatTl);
        const [hizmet] = await tx
          .insert(hizmetler)
          .values({ isletmeId: kimlik.isletmeId, kod: istek.kod, ad: istek.ad, kategori: istek.kategori, kdvOrani: istek.kdvOrani, fiyatKurus, aktif: dogrudan, olusturanId: kimlik.kullaniciId })
          .returning({ id: hizmetler.id, aktif: hizmetler.aktif });
        if (!dogrudan) {
          await tx.insert(fiyatTalepleri).values({ isletmeId: kimlik.isletmeId, hizmetId: hizmet!.id, eskiFiyatKurus: null, yeniFiyatKurus: fiyatKurus, talepEdenId: kimlik.kullaniciId });
        }
        await this.denetim.kaydet(tx, { ...kimlik, eylem: 'hizmet.olusturuldu', varlikTipi: 'hizmet', varlikId: hizmet!.id, ip, ayrinti: { kod: istek.kod, fiyatKurus, onayBekliyor: !dogrudan } });
        return { id: hizmet!.id, aktif: hizmet!.aktif, onayBekliyor: !dogrudan };
      });
    } catch (hata) {
      if (benzersizlikIhlaliMi(hata)) throw new ApiHatasi(HttpStatus.CONFLICT, 'HIZMET_KODU_KULLANIMDA', 'Bu kodla bir hizmet var.');
      throw hata;
    }
  }

  /** Fiyat değişikliği: onay yetkisi olan doğrudan uygular, olmayan onaya gönderir (dört göz). */
  async fiyatDegistir(kimlik: Kimlik, yetki: YetkiBaglami, hizmetId: string, fiyatTl: number, ip: string | null) {
    const yeni = tlKurus(fiyatTl);
    return this.db.kiraciIslemi(kimlik, async (tx) => {
      const [hizmet] = await tx.select({ fiyatKurus: hizmetler.fiyatKurus, aktif: hizmetler.aktif }).from(hizmetler).where(eq(hizmetler.id, hizmetId)).for('update');
      if (!hizmet) throw new ApiHatasi(HttpStatus.NOT_FOUND, 'HIZMET_BULUNAMADI', 'Hizmet bulunamadı.');
      const [bekleyen] = await tx.select({ id: fiyatTalepleri.id }).from(fiyatTalepleri).where(and(eq(fiyatTalepleri.hizmetId, hizmetId), eq(fiyatTalepleri.durum, 'bekliyor')));
      if (bekleyen) throw new ApiHatasi(HttpStatus.CONFLICT, 'BEKLEYEN_TALEP_VAR', 'Bu hizmet için onay bekleyen bir fiyat talebi var.');

      if (yetki.izinler.has('fiyat.onayla')) {
        await tx.update(hizmetler).set({ fiyatKurus: yeni, aktif: true }).where(eq(hizmetler.id, hizmetId));
        await this.denetim.kaydet(tx, { ...kimlik, eylem: 'fiyat.degisti', varlikTipi: 'hizmet', varlikId: hizmetId, ip, ayrinti: { eski: hizmet.fiyatKurus, yeni } });
        return { uygulandi: true };
      }
      const [talep] = await tx
        .insert(fiyatTalepleri)
        .values({ isletmeId: kimlik.isletmeId, hizmetId, eskiFiyatKurus: hizmet.aktif ? hizmet.fiyatKurus : null, yeniFiyatKurus: yeni, talepEdenId: kimlik.kullaniciId })
        .returning({ id: fiyatTalepleri.id });
      await this.denetim.kaydet(tx, { ...kimlik, eylem: 'fiyat.talep', varlikTipi: 'hizmet', varlikId: hizmetId, ip, ayrinti: { eski: hizmet.fiyatKurus, yeni } });
      return { uygulandi: false, talepId: talep!.id };
    });
  }

  async fiyatTalepleri(kimlik: Kimlik) {
    return this.db.kiraciIslemi(kimlik, (tx) =>
      tx
        .select({
          id: fiyatTalepleri.id,
          hizmetId: fiyatTalepleri.hizmetId,
          hizmetAd: hizmetler.ad,
          hizmetKod: hizmetler.kod,
          eskiFiyatKurus: fiyatTalepleri.eskiFiyatKurus,
          yeniFiyatKurus: fiyatTalepleri.yeniFiyatKurus,
          talepEdenId: fiyatTalepleri.talepEdenId,
          talepEden: kullanicilar.adSoyad,
          talepZamani: fiyatTalepleri.talepZamani,
        })
        .from(fiyatTalepleri)
        .innerJoin(hizmetler, eq(hizmetler.id, fiyatTalepleri.hizmetId))
        .innerJoin(kullanicilar, eq(kullanicilar.id, fiyatTalepleri.talepEdenId))
        .where(eq(fiyatTalepleri.durum, 'bekliyor'))
        .orderBy(asc(fiyatTalepleri.talepZamani)),
    );
  }

  async fiyatKarari(kimlik: Kimlik, talepId: string, onay: boolean, ip: string | null) {
    return this.db.kiraciIslemi(kimlik, async (tx) => {
      const [talep] = await tx.select().from(fiyatTalepleri).where(eq(fiyatTalepleri.id, talepId)).for('update');
      if (!talep || talep.durum !== 'bekliyor') throw new ApiHatasi(HttpStatus.NOT_FOUND, 'TALEP_BULUNAMADI', 'Onay bekleyen talep bulunamadı.');
      if (talep.talepEdenId === kimlik.kullaniciId) {
        throw new ApiHatasi(HttpStatus.FORBIDDEN, 'KENDI_TALEBI', 'Kendi fiyat talebinizi onaylayamazsınız; başka bir yetkili onaylamalıdır.');
      }
      const simdi = new Date();
      await tx.update(fiyatTalepleri).set({ durum: onay ? 'onaylandi' : 'reddedildi', kararVerenId: kimlik.kullaniciId, kararZamani: simdi }).where(eq(fiyatTalepleri.id, talepId));
      if (onay) await tx.update(hizmetler).set({ fiyatKurus: talep.yeniFiyatKurus, aktif: true }).where(eq(hizmetler.id, talep.hizmetId));
      await this.denetim.kaydet(tx, { ...kimlik, eylem: onay ? 'fiyat.onaylandi' : 'fiyat.reddedildi', varlikTipi: 'hizmet', varlikId: talep.hizmetId, ip, ayrinti: { eski: talep.eskiFiyatKurus, yeni: talep.yeniFiyatKurus } });
      return { durum: onay ? 'onaylandi' : 'reddedildi' };
    });
  }

  // ——— Hasta hesabı ———

  async hesap(kimlik: Kimlik, kisiId: string) {
    return this.db.kiraciIslemi(kimlik, async (tx) => {
      const [kisi] = await tx.select({ id: kisiler.id }).from(kisiler).where(eq(kisiler.id, kisiId));
      if (!kisi) throw new ApiHatasi(HttpStatus.NOT_FOUND, 'HASTA_BULUNAMADI', 'Hasta bulunamadı.');
      const kalemler = await tx
        .select({
          id: hesapKalemleri.id,
          ad: hesapKalemleri.ad,
          adet: hesapKalemleri.adet,
          birimFiyatKurus: hesapKalemleri.birimFiyatKurus,
          indirimYuzde: hesapKalemleri.indirimYuzde,
          indirimKurus: hesapKalemleri.indirimKurus,
          indirimNedeni: hesapKalemleri.indirimNedeni,
          tutarKurus: hesapKalemleri.tutarKurus,
          kdvOrani: hesapKalemleri.kdvOrani,
          zaman: hesapKalemleri.zaman,
          iptalZamani: hesapKalemleri.iptalZamani,
          iptalNedeni: hesapKalemleri.iptalNedeni,
        })
        .from(hesapKalemleri)
        .where(eq(hesapKalemleri.kisiId, kisiId))
        .orderBy(desc(hesapKalemleri.zaman));
      const alan = aliasedTable(kullanicilar, 'alan');
      const hareketler = await tx
        .select({
          id: tahsilatlar.id,
          tutarKurus: tahsilatlar.tutarKurus,
          odemeTuru: tahsilatlar.odemeTuru,
          kasaGunu: tahsilatlar.kasaGunu,
          aciklama: tahsilatlar.aciklama,
          iadeEdilenId: tahsilatlar.iadeEdilenId,
          alanId: tahsilatlar.alanId,
          alan: alan.adSoyad,
          zaman: tahsilatlar.zaman,
        })
        .from(tahsilatlar)
        .innerJoin(alan, eq(alan.id, tahsilatlar.alanId))
        .where(eq(tahsilatlar.kisiId, kisiId))
        .orderBy(desc(tahsilatlar.zaman));
      const borc = kalemler.filter((k) => !k.iptalZamani).reduce((t, k) => t + k.tutarKurus, 0);
      const odenen = hareketler.reduce((t, h) => t + h.tutarKurus, 0);
      return { kalemler, tahsilatlar: hareketler, borcKurus: borc, odenenKurus: odenen, bakiyeKurus: borc - odenen };
    });
  }

  async kalemEkle(kimlik: Kimlik, yetki: YetkiBaglami, kisiId: string, istek: KalemIstegi, ip: string | null) {
    const subeId = subeGerekli(yetki);
    if (istek.indirimYuzde > INDIRIM_ONAY_ESIGI_YUZDE && !yetki.izinler.has('finans.iade.onayla')) {
      throw new ApiHatasi(HttpStatus.FORBIDDEN, 'INDIRIM_ONAY_GEREKLI', `%${INDIRIM_ONAY_ESIGI_YUZDE} üzerindeki indirimi yalnızca yetkili yönetici uygulayabilir.`, { esikYuzde: INDIRIM_ONAY_ESIGI_YUZDE });
    }
    return this.db.kiraciIslemi(kimlik, async (tx) => {
      const [kisi] = await tx.select({ id: kisiler.id }).from(kisiler).where(eq(kisiler.id, kisiId));
      if (!kisi) throw new ApiHatasi(HttpStatus.NOT_FOUND, 'HASTA_BULUNAMADI', 'Hasta bulunamadı.');
      const [hizmet] = await tx.select().from(hizmetler).where(eq(hizmetler.id, istek.hizmetId));
      if (!hizmet) throw new ApiHatasi(HttpStatus.NOT_FOUND, 'HIZMET_BULUNAMADI', 'Hizmet bulunamadı.');
      if (!hizmet.aktif) throw new ApiHatasi(HttpStatus.UNPROCESSABLE_ENTITY, 'HIZMET_ONAYSIZ', 'Hizmetin fiyatı henüz onaylanmadı.');
      if (istek.randevuId) {
        const [r] = await tx.select({ id: randevular.id }).from(randevular).where(and(eq(randevular.id, istek.randevuId), eq(randevular.kisiId, kisiId)));
        if (!r) throw new ApiHatasi(HttpStatus.NOT_FOUND, 'RANDEVU_BULUNAMADI', 'Randevu bulunamadı.');
      }
      const tutar = kalemTutari(hizmet.fiyatKurus, istek.adet, istek.indirimYuzde);
      const [kalem] = await tx
        .insert(hesapKalemleri)
        .values({
          isletmeId: kimlik.isletmeId,
          subeId,
          kisiId,
          randevuId: istek.randevuId ?? null,
          hizmetId: hizmet.id,
          ad: hizmet.ad,
          birimFiyatKurus: hizmet.fiyatKurus,
          adet: istek.adet,
          kdvOrani: hizmet.kdvOrani,
          indirimYuzde: istek.indirimYuzde,
          indirimKurus: tutar.indirim,
          indirimNedeni: istek.indirimYuzde > 0 ? istek.indirimNedeni! : null,
          tutarKurus: tutar.net,
          ekleyenId: kimlik.kullaniciId,
        })
        .returning({ id: hesapKalemleri.id, tutarKurus: hesapKalemleri.tutarKurus });
      await this.denetim.kaydet(tx, { ...kimlik, eylem: 'hesap.kalem', varlikTipi: 'hasta', varlikId: kisiId, subeId, ip, ayrinti: { hizmet: hizmet.kod, tutarKurus: tutar.net, indirimYuzde: istek.indirimYuzde } });
      return kalem!;
    });
  }

  async kalemIptal(kimlik: Kimlik, yetki: YetkiBaglami, kisiId: string, kalemId: string, neden: string, ip: string | null) {
    return this.db.kiraciIslemi(kimlik, async (tx) => {
      const [kalem] = await tx
        .select({ id: hesapKalemleri.id, tutarKurus: hesapKalemleri.tutarKurus, subeId: hesapKalemleri.subeId })
        .from(hesapKalemleri)
        .where(and(eq(hesapKalemleri.id, kalemId), eq(hesapKalemleri.kisiId, kisiId), isNull(hesapKalemleri.iptalZamani)));
      if (!kalem) throw new ApiHatasi(HttpStatus.NOT_FOUND, 'KALEM_BULUNAMADI', 'Kalem bulunamadı veya zaten iptal edilmiş.');
      await this.yetkiService.subeIzniGerekli(tx, kimlik.kullaniciId, 'finans.iade.onayla', kalem.subeId);
      await tx.update(hesapKalemleri).set({ iptalEdenId: kimlik.kullaniciId, iptalZamani: new Date(), iptalNedeni: neden }).where(eq(hesapKalemleri.id, kalemId));
      await this.denetim.kaydet(tx, { ...kimlik, eylem: 'hesap.kalem.iptal', varlikTipi: 'hasta', varlikId: kisiId, subeId: yetki.subeId, ip, ayrinti: { tutarKurus: kalem.tutarKurus, neden } });
      return { id: kalemId };
    });
  }

  // ——— Tahsilat, iade, kasa ———

  async tahsilatAl(kimlik: Kimlik, yetki: YetkiBaglami, kisiId: string, istek: TahsilatIstegi, ip: string | null) {
    const subeId = subeGerekli(yetki);
    return this.db.kiraciIslemi(kimlik, async (tx) => {
      const [kisi] = await tx.select({ id: kisiler.id }).from(kisiler).where(eq(kisiler.id, kisiId));
      if (!kisi) throw new ApiHatasi(HttpStatus.NOT_FOUND, 'HASTA_BULUNAMADI', 'Hasta bulunamadı.');
      const gun = await bugun(tx);
      await this.kasaAcikMi(tx, subeId, gun);
      const tutarKurus = tlKurus(istek.tutarTl);
      const [t] = await tx
        .insert(tahsilatlar)
        .values({ isletmeId: kimlik.isletmeId, subeId, kisiId, tutarKurus, odemeTuru: istek.odemeTuru, kasaGunu: gun, aciklama: istek.aciklama, alanId: kimlik.kullaniciId })
        .returning({ id: tahsilatlar.id, kasaGunu: tahsilatlar.kasaGunu });
      await this.denetim.kaydet(tx, { ...kimlik, eylem: 'tahsilat', varlikTipi: 'hasta', varlikId: kisiId, subeId, ip, ayrinti: { tutarKurus, odemeTuru: istek.odemeTuru } });
      return t!;
    });
  }

  /**
   * İade: tahsilatı alan kişi, aynı tahsilatın iadesini onaylayamaz (görevler ayrılığı).
   * İade tutarı toplamı asıl tahsilatı aşamaz; iade asıl ödeme türüyle ve bugünün kasasından yapılır.
   */
  async iade(kimlik: Kimlik, yetki: YetkiBaglami, tahsilatId: string, tutarTl: number, neden: string, ip: string | null) {
    const subeId = subeGerekli(yetki);
    return this.db.kiraciIslemi(kimlik, async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`iade:${tahsilatId}`}, 3))`);
      const [asil] = await tx.select().from(tahsilatlar).where(eq(tahsilatlar.id, tahsilatId));
      if (!asil || asil.tutarKurus <= 0) throw new ApiHatasi(HttpStatus.NOT_FOUND, 'TAHSILAT_BULUNAMADI', 'Tahsilat bulunamadı.');
      // İade, tahsilatın alındığı şubenin kasasından yapılır
      if (asil.subeId !== subeId) throw new ApiHatasi(HttpStatus.FORBIDDEN, 'SUBE_KAPSAMI_DISI', 'Bu tahsilat başka bir şubeye ait; iadeyi o şubede yapın.');
      if (asil.alanId === kimlik.kullaniciId) {
        throw new ApiHatasi(HttpStatus.FORBIDDEN, 'GOREVLER_AYRILIGI', 'Tahsilatı alan kişi iadesini onaylayamaz; başka bir yetkili yapmalıdır.');
      }
      const [onceki] = await tx.select({ toplam: sql<number>`coalesce(sum(${tahsilatlar.tutarKurus}), 0)` }).from(tahsilatlar).where(eq(tahsilatlar.iadeEdilenId, tahsilatId));
      const iadeKurus = tlKurus(tutarTl);
      if (iadeKurus - Number(onceki?.toplam ?? 0) > asil.tutarKurus) {
        throw new ApiHatasi(HttpStatus.UNPROCESSABLE_ENTITY, 'IADE_TUTARI_ASIMI', 'İade toplamı tahsil edilen tutarı aşamaz.', { kalanKurus: asil.tutarKurus + Number(onceki?.toplam ?? 0) });
      }
      const gun = await bugun(tx);
      await this.kasaAcikMi(tx, subeId, gun);
      const [iade] = await tx
        .insert(tahsilatlar)
        .values({ isletmeId: kimlik.isletmeId, subeId, kisiId: asil.kisiId, tutarKurus: -iadeKurus, odemeTuru: asil.odemeTuru, kasaGunu: gun, aciklama: neden, iadeEdilenId: tahsilatId, alanId: kimlik.kullaniciId })
        .returning({ id: tahsilatlar.id });
      await this.denetim.kaydet(tx, { ...kimlik, eylem: 'iade', varlikTipi: 'hasta', varlikId: asil.kisiId, subeId, ip, ayrinti: { tahsilatId, iadeKurus, neden } });
      return iade!;
    });
  }

  async kasaGunu(kimlik: Kimlik, yetki: YetkiBaglami, gunIstegi: string | undefined) {
    const subeId = subeGerekli(yetki);
    return this.db.kiraciIslemi(kimlik, async (tx) => {
      const gun = gunIstegi ?? (await bugun(tx));
      const alan = aliasedTable(kullanicilar, 'alan');
      const hareketler = await tx
        .select({
          id: tahsilatlar.id,
          tutarKurus: tahsilatlar.tutarKurus,
          odemeTuru: tahsilatlar.odemeTuru,
          aciklama: tahsilatlar.aciklama,
          iadeEdilenId: tahsilatlar.iadeEdilenId,
          zaman: tahsilatlar.zaman,
          hasta: sql<string>`${kisiler.ad} || ' ' || ${kisiler.soyad}`,
          kisiId: tahsilatlar.kisiId,
          alan: alan.adSoyad,
        })
        .from(tahsilatlar)
        .innerJoin(kisiler, eq(kisiler.id, tahsilatlar.kisiId))
        .innerJoin(alan, eq(alan.id, tahsilatlar.alanId))
        .where(and(eq(tahsilatlar.subeId, subeId), eq(tahsilatlar.kasaGunu, gun)))
        .orderBy(asc(tahsilatlar.zaman));
      const turler: Record<string, { tahsilatKurus: number; iadeKurus: number }> = {};
      for (const h of hareketler) {
        const t = (turler[h.odemeTuru] ??= { tahsilatKurus: 0, iadeKurus: 0 });
        if (h.tutarKurus > 0) t.tahsilatKurus += h.tutarKurus;
        else t.iadeKurus += -h.tutarKurus;
      }
      const beklenenNakit = (turler.nakit?.tahsilatKurus ?? 0) - (turler.nakit?.iadeKurus ?? 0);
      const [kapanis] = await tx
        .select({ sayilanNakitKurus: kasaKapanislari.sayilanNakitKurus, farkKurus: kasaKapanislari.farkKurus, aciklama: kasaKapanislari.aciklama, zaman: kasaKapanislari.zaman, kapatan: kullanicilar.adSoyad })
        .from(kasaKapanislari)
        .innerJoin(kullanicilar, eq(kullanicilar.id, kasaKapanislari.kapatanId))
        .where(and(eq(kasaKapanislari.subeId, subeId), eq(kasaKapanislari.gun, gun)));
      return {
        gun,
        hareketler,
        turler,
        netKurus: hareketler.reduce((t, h) => t + h.tutarKurus, 0),
        beklenenNakitKurus: beklenenNakit,
        kapanis: kapanis ?? null,
      };
    });
  }

  /** Gün sonu kasa kapanışı: sayılan nakit ile sistemdeki nakit karşılaştırılır; fark varsa açıklama zorunludur. */
  async kasaKapat(kimlik: Kimlik, yetki: YetkiBaglami, istek: KapanisIstegi, ip: string | null) {
    const subeId = subeGerekli(yetki);
    try {
      return await this.db.kiraciIslemi(kimlik, async (tx) => {
        const gun = await bugun(tx);
        if (istek.gun > gun) throw new ApiHatasi(HttpStatus.UNPROCESSABLE_ENTITY, 'GELECEK_GUN', 'Gelecek bir günün kasası kapatılamaz.');
        await kasaKilidi(tx, subeId, istek.gun);
        const [toplam] = await tx
          .select({ nakit: sql<number>`coalesce(sum(${tahsilatlar.tutarKurus}), 0)` })
          .from(tahsilatlar)
          .where(and(eq(tahsilatlar.subeId, subeId), eq(tahsilatlar.kasaGunu, istek.gun), eq(tahsilatlar.odemeTuru, 'nakit')));
        const beklenen = Number(toplam?.nakit ?? 0);
        const sayilan = tlKurus(istek.sayilanNakitTl);
        const fark = sayilan - beklenen;
        if (fark !== 0 && !istek.aciklama) {
          throw new ApiHatasi(HttpStatus.UNPROCESSABLE_ENTITY, 'FARK_ACIKLAMASI_GEREKLI', 'Kasada fark var; açıklama yazın.', { farkKurus: fark });
        }
        await tx.insert(kasaKapanislari).values({ isletmeId: kimlik.isletmeId, subeId, gun: istek.gun, beklenenNakitKurus: beklenen, sayilanNakitKurus: sayilan, farkKurus: fark, aciklama: istek.aciklama, kapatanId: kimlik.kullaniciId });
        await this.denetim.kaydet(tx, { ...kimlik, eylem: fark === 0 ? 'kasa.kapandi' : 'kasa.kapandi.farkli', subeId, ip, ayrinti: { gun: istek.gun, beklenen, sayilan, fark } });
        return { gun: istek.gun, beklenenNakitKurus: beklenen, sayilanNakitKurus: sayilan, farkKurus: fark };
      });
    } catch (hata) {
      if (benzersizlikIhlaliMi(hata)) throw new ApiHatasi(HttpStatus.CONFLICT, 'KASA_ZATEN_KAPALI', 'Bu günün kasası zaten kapatılmış.');
      throw hata;
    }
  }

  private async kasaAcikMi(tx: Islem, subeId: string, gun: string): Promise<void> {
    await kasaKilidi(tx, subeId, gun);
    const [kapanis] = await tx.select({ id: kasaKapanislari.id }).from(kasaKapanislari).where(and(eq(kasaKapanislari.subeId, subeId), eq(kasaKapanislari.gun, gun)));
    if (kapanis) throw new ApiHatasi(HttpStatus.CONFLICT, 'KASA_KAPALI', 'Bugünün kasası kapatıldı; yeni hareket girilemez.');
  }
}
