import { HttpStatus, Injectable } from '@nestjs/common';
import {
  DURUM_IZINLERI,
  durumGecisiGecerliMi,
  KURUM_SAAT_DILIMI,
  RANDEVU_ALAN_MESLEKLER,
  type RandevuDurumu,
} from '@dc/shared';
import { aliasedTable, and, asc, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import { type Islem, VeritabaniService } from '../db/veritabani.service';
import { hayvanlar, kaynaklar, kisiler, kullanicilar, randevular, rolAtamalari, subeler } from '../db/sema';
import { DenetimService } from '../denetim/denetim.service';
import { ApiHatasi, pgHatasi } from '../ortak/dogrulama';
import type { Kimlik, YetkiBaglami } from '../yetki/baglam';
import type { DurumIstegi, KaynakIstegi, RandevuIstegi, TasiIstegi } from './randevular.dto';

function subeGerekli(yetki: YetkiBaglami): string {
  if (!yetki.subeId) throw new ApiHatasi(HttpStatus.BAD_REQUEST, 'SUBE_SECILMELI', 'Randevu işlemleri için bir şube seçin.');
  return yetki.subeId;
}

function bulunamadi(): never {
  throw new ApiHatasi(HttpStatus.NOT_FOUND, 'RANDEVU_BULUNAMADI', 'Randevu bulunamadı.');
}

/** Veritabanının çakışma engelini anlaşılır hataya çevirir. */
function cakismaHatasi(hata: unknown): never {
  const pg = pgHatasi(hata);
  if (pg?.code === '23P01') {
    const hekim = pg.constraint === 'randevu_hekim_cakismasi';
    throw new ApiHatasi(
      HttpStatus.CONFLICT,
      hekim ? 'HEKIM_DOLU' : 'KAYNAK_DOLU',
      hekim ? 'Hekimin bu saatte başka bir randevusu var.' : 'Oda / cihaz bu saatte başka bir randevuda kullanılıyor.',
    );
  }
  throw hata;
}

@Injectable()
export class RandevularService {
  constructor(
    private readonly db: VeritabaniService,
    private readonly denetim: DenetimService,
  ) {}

  async kaynaklariListele(kimlik: Kimlik, yetki: YetkiBaglami) {
    const subeId = subeGerekli(yetki);
    return this.db.kiraciIslemi(kimlik, (tx) =>
      tx.select({ id: kaynaklar.id, ad: kaynaklar.ad, tur: kaynaklar.tur }).from(kaynaklar).where(and(eq(kaynaklar.subeId, subeId), eq(kaynaklar.aktif, true))).orderBy(asc(kaynaklar.ad)),
    );
  }

  async kaynakEkle(kimlik: Kimlik, yetki: YetkiBaglami, istek: KaynakIstegi, ip: string | null) {
    const subeId = subeGerekli(yetki);
    try {
      return await this.db.kiraciIslemi(kimlik, async (tx) => {
        const [kaynak] = await tx.insert(kaynaklar).values({ isletmeId: kimlik.isletmeId, subeId, ...istek }).returning({ id: kaynaklar.id, ad: kaynaklar.ad, tur: kaynaklar.tur });
        await this.denetim.kaydet(tx, { ...kimlik, eylem: 'kaynak.olusturuldu', varlikTipi: 'kaynak', varlikId: kaynak!.id, subeId, ip, ayrinti: { tur: istek.tur } });
        return kaynak!;
      });
    } catch (hata) {
      if (pgHatasi(hata)?.code === '23505') throw new ApiHatasi(HttpStatus.CONFLICT, 'KAYNAK_ADI_KULLANIMDA', 'Bu şubede aynı adlı bir kaynak var.');
      throw hata;
    }
  }

  /**
   * Günlük takvim: şubede takvimi olan sağlık personeli, kaynaklar ve o günün randevuları.
   * Gün, kurumun saat diliminde (Türkiye) hesaplanır.
   */
  async takvim(kimlik: Kimlik, yetki: YetkiBaglami, tarih: string) {
    const subeId = subeGerekli(yetki);
    return this.db.kiraciIslemi(kimlik, async (tx) => {
      const [sube] = await tx.select({ id: subeler.id, ad: subeler.ad, kurumTipleri: subeler.kurumTipleri }).from(subeler).where(eq(subeler.id, subeId));
      const kaynak = aliasedTable(kaynaklar, 'k');
      const liste = await tx
        .select({
          id: randevular.id,
          hekimId: randevular.hekimId,
          kaynakId: randevular.kaynakId,
          kaynakAd: kaynak.ad,
          baslangic: randevular.baslangic,
          bitis: randevular.bitis,
          tur: randevular.tur,
          durum: randevular.durum,
          notlar: randevular.notlar,
          siraNo: randevular.siraNo,
          geldiZamani: randevular.geldiZamani,
          muayeneZamani: randevular.muayeneZamani,
          iptalNedeni: randevular.iptalNedeni,
          hasta: { id: kisiler.id, ad: kisiler.ad, soyad: kisiler.soyad, telefon: kisiler.telefon },
          hayvanId: randevular.hayvanId,
          hayvanAd: hayvanlar.ad,
          hayvanTur: hayvanlar.tur,
        })
        .from(randevular)
        .innerJoin(kisiler, eq(kisiler.id, randevular.kisiId))
        .leftJoin(kaynak, eq(kaynak.id, randevular.kaynakId))
        .leftJoin(hayvanlar, eq(hayvanlar.id, randevular.hayvanId))
        .where(and(eq(randevular.subeId, subeId), sql`(${randevular.baslangic} AT TIME ZONE ${KURUM_SAAT_DILIMI})::date = ${tarih}::date`))
        .orderBy(asc(randevular.baslangic));

      const hekimler = await this.takvimiOlanlar(tx, subeId, [...new Set(liste.map((r) => r.hekimId))]);
      const kaynakListesi = await tx.select({ id: kaynaklar.id, ad: kaynaklar.ad, tur: kaynaklar.tur }).from(kaynaklar).where(and(eq(kaynaklar.subeId, subeId), eq(kaynaklar.aktif, true))).orderBy(asc(kaynaklar.ad));

      return {
        tarih,
        sube,
        hekimler,
        kaynaklar: kaynakListesi,
        randevular: liste.map(({ hayvanId, hayvanAd, hayvanTur, ...r }) => ({ ...r, hayvan: hayvanId ? { id: hayvanId, ad: hayvanAd, tur: hayvanTur } : null })),
      };
    });
  }

  async olustur(kimlik: Kimlik, yetki: YetkiBaglami, istek: RandevuIstegi, ip: string | null) {
    const subeId = subeGerekli(yetki);
    const baslangic = new Date(istek.baslangic);
    const bitis = new Date(baslangic.getTime() + istek.sureDakika * 60_000);
    try {
      return await this.db.kiraciIslemi(kimlik, async (tx) => {
        const [sube] = await tx.select({ kurumTipleri: subeler.kurumTipleri }).from(subeler).where(eq(subeler.id, subeId));
        const veterinerSubesi = sube!.kurumTipleri.includes('veteriner');

        const [kisi] = await tx.select({ id: kisiler.id }).from(kisiler).where(eq(kisiler.id, istek.kisiId));
        if (!kisi) throw new ApiHatasi(HttpStatus.NOT_FOUND, 'HASTA_BULUNAMADI', 'Hasta bulunamadı.');
        if (veterinerSubesi && !istek.hayvanId) throw new ApiHatasi(HttpStatus.UNPROCESSABLE_ENTITY, 'HAYVAN_GEREKLI', 'Veteriner şubesinde randevu bir hayvan için verilir.');
        if (!veterinerSubesi && istek.hayvanId) throw new ApiHatasi(HttpStatus.UNPROCESSABLE_ENTITY, 'HAYVAN_UYGUN_DEGIL', 'Bu şubede hayvan için randevu verilemez.');
        if (istek.hayvanId) {
          const [hayvan] = await tx.select({ id: hayvanlar.id }).from(hayvanlar).where(and(eq(hayvanlar.id, istek.hayvanId), eq(hayvanlar.sahipKisiId, istek.kisiId)));
          if (!hayvan) throw new ApiHatasi(HttpStatus.NOT_FOUND, 'HAYVAN_BULUNAMADI', 'Hayvan bulunamadı.');
        }
        await this.hekimUygunMu(tx, subeId, istek.hekimId);
        if (istek.kaynakId) await this.kaynakUygunMu(tx, subeId, istek.kaynakId);

        const [randevu] = await tx
          .insert(randevular)
          .values({
            isletmeId: kimlik.isletmeId,
            subeId,
            kisiId: istek.kisiId,
            hayvanId: istek.hayvanId ?? null,
            hekimId: istek.hekimId,
            kaynakId: istek.kaynakId ?? null,
            baslangic,
            bitis,
            tur: istek.tur,
            notlar: istek.notlar,
            olusturanId: kimlik.kullaniciId,
          })
          .returning({ id: randevular.id });
        await this.denetim.kaydet(tx, { ...kimlik, eylem: 'randevu.olusturuldu', varlikTipi: 'randevu', varlikId: randevu!.id, subeId, ip, ayrinti: { hastaId: istek.kisiId, hekimId: istek.hekimId } });
        return randevu!;
      });
    } catch (hata) {
      cakismaHatasi(hata);
    }
  }

  /**
   * Durum değişikliği. Geçiş kurallı (ör. gelmeyen hasta muayeneye alınamaz), gereken izin hedef
   * duruma göre değişir. Kabulde (“geldi”) şubede o güne ait sıradaki numara verilir.
   */
  async durumDegistir(kimlik: Kimlik, yetki: YetkiBaglami, id: string, istek: DurumIstegi, ip: string | null) {
    const subeId = subeGerekli(yetki);
    const gerekenler = DURUM_IZINLERI[istek.durum];
    if (!gerekenler.some((i) => yetki.izinler.has(i))) {
      throw new ApiHatasi(HttpStatus.FORBIDDEN, 'YETKI_YOK', 'Bu işlem için yetkiniz yok.', { eksikIzinler: gerekenler });
    }
    return this.db.kiraciIslemi(kimlik, async (tx) => {
      const [randevu] = await tx.select({ durum: randevular.durum, baslangic: randevular.baslangic }).from(randevular).where(and(eq(randevular.id, id), eq(randevular.subeId, subeId))).for('update');
      if (!randevu) bulunamadi();
      const eski = randevu.durum as RandevuDurumu;
      if (!durumGecisiGecerliMi(eski, istek.durum)) {
        throw new ApiHatasi(HttpStatus.UNPROCESSABLE_ENTITY, 'GECERSIZ_DURUM_GECISI', 'Randevu bu duruma geçirilemez.', { eski, yeni: istek.durum });
      }
      const simdi = new Date();
      const degisiklik: Partial<typeof randevular.$inferInsert> = { durum: istek.durum, guncellemeZamani: simdi };
      if (istek.durum === 'geldi') {
        degisiklik.geldiZamani = simdi;
        degisiklik.siraNo = await this.siradakiNumara(tx, subeId, randevu.baslangic);
      }
      if (istek.durum === 'muayenede') degisiklik.muayeneZamani = simdi;
      if (istek.durum === 'tamamlandi') degisiklik.tamamlanmaZamani = simdi;
      if (istek.durum === 'iptal') degisiklik.iptalNedeni = istek.neden ?? null;

      const [guncel] = await tx.update(randevular).set(degisiklik).where(eq(randevular.id, id)).returning({ id: randevular.id, durum: randevular.durum, siraNo: randevular.siraNo });
      await this.denetim.kaydet(tx, { ...kimlik, eylem: 'randevu.durum', varlikTipi: 'randevu', varlikId: id, subeId, ip, ayrinti: { eski, yeni: istek.durum, ...(istek.neden ? { neden: istek.neden } : {}) } });
      return guncel!;
    });
  }

  /** Henüz gelinmemiş randevunun saatini, hekimini veya odasını değiştirir. */
  async tasi(kimlik: Kimlik, yetki: YetkiBaglami, id: string, istek: TasiIstegi, ip: string | null) {
    const subeId = subeGerekli(yetki);
    const baslangic = new Date(istek.baslangic);
    const bitis = new Date(baslangic.getTime() + istek.sureDakika * 60_000);
    try {
      return await this.db.kiraciIslemi(kimlik, async (tx) => {
        const [randevu] = await tx.select({ durum: randevular.durum }).from(randevular).where(and(eq(randevular.id, id), eq(randevular.subeId, subeId))).for('update');
        if (!randevu) bulunamadi();
        if (randevu.durum !== 'planlandi') throw new ApiHatasi(HttpStatus.UNPROCESSABLE_ENTITY, 'TASINAMAZ', 'Yalnızca henüz gelinmemiş randevular taşınabilir.');
        if (istek.hekimId) await this.hekimUygunMu(tx, subeId, istek.hekimId);
        if (istek.kaynakId) await this.kaynakUygunMu(tx, subeId, istek.kaynakId);
        await tx
          .update(randevular)
          .set({
            baslangic,
            bitis,
            ...(istek.hekimId ? { hekimId: istek.hekimId } : {}),
            ...(istek.kaynakId !== undefined ? { kaynakId: istek.kaynakId } : {}),
            guncellemeZamani: new Date(),
          })
          .where(eq(randevular.id, id));
        await this.denetim.kaydet(tx, { ...kimlik, eylem: 'randevu.tasindi', varlikTipi: 'randevu', varlikId: id, subeId, ip, ayrinti: { baslangic: istek.baslangic } });
        return { id };
      });
    } catch (hata) {
      cakismaHatasi(hata);
    }
  }

  /** Randevu alabilen meslekten, aktif ve bu şubede (veya tüm şubelerde) rolü olan kullanıcılar. */
  private async takvimiOlanlar(tx: Islem, subeId: string, ekIdler: string[]) {
    const satirlar = await tx
      .selectDistinct({ id: kullanicilar.id, adSoyad: kullanicilar.adSoyad, meslek: kullanicilar.meslek })
      .from(kullanicilar)
      .leftJoin(rolAtamalari, eq(rolAtamalari.kullaniciId, kullanicilar.id))
      .where(
        or(
          and(
            eq(kullanicilar.aktif, true),
            inArray(kullanicilar.meslek, [...RANDEVU_ALAN_MESLEKLER]),
            or(eq(rolAtamalari.subeId, subeId), and(isNull(rolAtamalari.subeId), sql`${rolAtamalari.id} IS NOT NULL`)),
          ),
          ekIdler.length ? inArray(kullanicilar.id, ekIdler) : sql`false`,
        ),
      )
      .orderBy(asc(kullanicilar.adSoyad));
    return satirlar;
  }

  private async hekimUygunMu(tx: Islem, subeId: string, hekimId: string): Promise<void> {
    const uygunlar = await this.takvimiOlanlar(tx, subeId, []);
    if (!uygunlar.some((h) => h.id === hekimId)) {
      throw new ApiHatasi(HttpStatus.UNPROCESSABLE_ENTITY, 'HEKIM_UYGUN_DEGIL', 'Seçilen kişiye bu şubede randevu verilemez.');
    }
  }

  private async kaynakUygunMu(tx: Islem, subeId: string, kaynakId: string): Promise<void> {
    const [kaynak] = await tx.select({ id: kaynaklar.id }).from(kaynaklar).where(and(eq(kaynaklar.id, kaynakId), eq(kaynaklar.subeId, subeId), eq(kaynaklar.aktif, true)));
    if (!kaynak) throw new ApiHatasi(HttpStatus.NOT_FOUND, 'KAYNAK_BULUNAMADI', 'Oda / cihaz bulunamadı.');
  }

  /** Şubede randevu gününe ait sıradaki kabul numarası (eşzamanlı kabullerde çakışmasın diye kilitli). */
  private async siradakiNumara(tx: Islem, subeId: string, gun: Date): Promise<number> {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${subeId} || (${gun}::timestamptz AT TIME ZONE ${KURUM_SAAT_DILIMI})::date::text, 1))`);
    const [sonuc] = await tx
      .select({ enBuyuk: sql<number>`coalesce(max(${randevular.siraNo}), 0)` })
      .from(randevular)
      .where(
        and(
          eq(randevular.subeId, subeId),
          sql`(${randevular.baslangic} AT TIME ZONE ${KURUM_SAAT_DILIMI})::date = (${gun}::timestamptz AT TIME ZONE ${KURUM_SAAT_DILIMI})::date`,
        ),
      );
    return Number(sonuc?.enBuyuk ?? 0) + 1;
  }
}
