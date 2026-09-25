import { HttpStatus, Injectable } from '@nestjs/common';
import {
  bindeMiktar,
  fefoSirala,
  kontrolluMu,
  KURUM_SAAT_DILIMI,
  meslekMi,
  miktarBinde,
  SAGLIK_MESLEKLERI,
  sktDurumu,
  stokSeviyesi,
} from '@dc/shared';
import { and, asc, desc, eq, gte, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { Alarm } from '../alarmlar/alarm';
import { kisiler, kullanicilar, stokHareketleri, subeler, urunler } from '../db/sema';
import { type Islem, VeritabaniService } from '../db/veritabani.service';
import { DenetimService } from '../denetim/denetim.service';
import { ApiHatasi, benzersizlikIhlaliMi } from '../ortak/dogrulama';
import type { Kimlik, YetkiBaglami } from '../yetki/baglam';
import type { HareketIstegi, UrunGuncelleIstegi, UrunIstegi } from './stok.dto';

async function bugun(tx: Islem): Promise<string> {
  return (await tx.execute<{ gun: string }>(sql`SELECT (now() AT TIME ZONE ${KURUM_SAAT_DILIMI})::date::text AS gun`)).rows[0]!.gun;
}

function subeGerekli(yetki: YetkiBaglami): string {
  if (!yetki.subeId) throw new ApiHatasi(HttpStatus.BAD_REQUEST, 'SUBE_SECILMELI', 'Stok işlemleri için bir şube seçin.');
  return yetki.subeId;
}

interface LotBakiyesi {
  urunId: string;
  lot: string;
  skt: string | null;
  bakiye: number;
}

/** Şube(ler)deki lot bakiyeleri (binde birim). */
async function lotBakiyeleri(tx: Islem, subeId: string | null, urunId?: string): Promise<(LotBakiyesi & { subeId: string })[]> {
  const kosul = sql.join(
    [sql`true`, ...(subeId ? [sql`sube_id = ${subeId}`] : []), ...(urunId ? [sql`urun_id = ${urunId}`] : [])],
    sql` AND `,
  );
  const s = await tx.execute<{ sube_id: string; urun_id: string; lot: string; skt: string | null; bakiye: string }>(sql`
    SELECT sube_id, urun_id, lot, max(skt)::text AS skt, sum(miktar_binde) AS bakiye
      FROM stok_hareketleri WHERE ${kosul}
     GROUP BY sube_id, urun_id, lot`);
  return s.rows.map((r) => ({ subeId: r.sube_id, urunId: r.urun_id, lot: r.lot, skt: r.skt, bakiye: Number(r.bakiye) }));
}

@Injectable()
export class StokService {
  constructor(
    private readonly db: VeritabaniService,
    private readonly denetim: DenetimService,
  ) {}

  async urunler(kimlik: Kimlik, yetki: YetkiBaglami) {
    return this.db.kiraciIslemi(kimlik, async (tx) => {
      const gun = await bugun(tx);
      const liste = await tx.select().from(urunler).orderBy(asc(urunler.ad));
      const lotlar = await lotBakiyeleri(tx, yetki.subeId);
      return liste.map(({ isletmeId: _i, olusturanId: _o, minBinde, ...u }) => {
        const kendi = lotlar.filter((l) => l.urunId === u.id && l.bakiye > 0);
        const bakiye = kendi.reduce((t, l) => t + l.bakiye, 0);
        const enYakin = kendi.map((l) => l.skt).filter((s): s is string => !!s).sort()[0] ?? null;
        return {
          ...u,
          minSeviye: bindeMiktar(minBinde),
          bakiye: bindeMiktar(bakiye),
          lotSayisi: kendi.length,
          enYakinSkt: enYakin,
          skt: sktDurumu(enYakin, gun),
          seviye: stokSeviyesi(bakiye, minBinde),
        };
      });
    });
  }

  async urunEkle(kimlik: Kimlik, istek: UrunIstegi, ip: string | null) {
    try {
      return await this.db.kiraciIslemi(kimlik, async (tx) => {
        const { minSeviye, ...geri } = istek;
        const [u] = await tx
          .insert(urunler)
          .values({ isletmeId: kimlik.isletmeId, ...geri, barkod: istek.barkod ?? null, minBinde: miktarBinde(minSeviye), olusturanId: kimlik.kullaniciId })
          .returning({ id: urunler.id });
        await this.denetim.kaydet(tx, { ...kimlik, eylem: 'urun.olusturuldu', varlikTipi: 'urun', varlikId: u!.id, ip, ayrinti: { kod: istek.kod, kontrol: istek.kontrol } });
        return { id: u!.id };
      });
    } catch (hata) {
      if (benzersizlikIhlaliMi(hata)) throw new ApiHatasi(HttpStatus.CONFLICT, 'URUN_KODU_KULLANIMDA', 'Bu kodla bir ürün var.');
      throw hata;
    }
  }

  async urunGuncelle(kimlik: Kimlik, id: string, istek: UrunGuncelleIstegi, ip: string | null) {
    return this.db.kiraciIslemi(kimlik, async (tx) => {
      const [u] = await tx.select({ id: urunler.id }).from(urunler).where(eq(urunler.id, id));
      if (!u) throw new ApiHatasi(HttpStatus.NOT_FOUND, 'URUN_BULUNAMADI', 'Ürün bulunamadı.');
      await tx
        .update(urunler)
        .set({ ...(istek.minSeviye !== undefined ? { minBinde: miktarBinde(istek.minSeviye) } : {}), ...(istek.aktif !== undefined ? { aktif: istek.aktif } : {}) })
        .where(eq(urunler.id, id));
      await this.denetim.kaydet(tx, { ...kimlik, eylem: 'urun.guncellendi', varlikTipi: 'urun', varlikId: id, ip, ayrinti: istek });
      return { tamam: true };
    });
  }

  private async urunBul(tx: Islem, id: string) {
    const [u] = await tx.select().from(urunler).where(eq(urunler.id, id));
    if (!u) throw new ApiHatasi(HttpStatus.NOT_FOUND, 'URUN_BULUNAMADI', 'Ürün bulunamadı.');
    return u;
  }

  async urunKarti(kimlik: Kimlik, yetki: YetkiBaglami, id: string) {
    const subeId = subeGerekli(yetki);
    const hastaGorur = yetki.izinler.has('hasta.demografik.goruntule');
    return this.db.kiraciIslemi(kimlik, async (tx) => {
      const gun = await bugun(tx);
      const { isletmeId: _i, minBinde, ...u } = await this.urunBul(tx, id);
      const lotlar = (await lotBakiyeleri(tx, subeId, id)).map(({ subeId: _s, urunId: _u, ...l }) => ({ ...l, bakiye: bindeMiktar(l.bakiye), skt: l.skt, sktDurumu: sktDurumu(l.skt, gun) }));
      const sahit = alias(kullanicilar, 'sahit');
      const hareketler = await tx
        .select({
          id: stokHareketleri.id,
          tur: stokHareketleri.tur,
          lot: stokHareketleri.lot,
          miktarBinde: stokHareketleri.miktarBinde,
          aciklama: stokHareketleri.aciklama,
          zaman: stokHareketleri.zaman,
          yapan: kullanicilar.adSoyad,
          sahit: sahit.adSoyad,
          kisiId: stokHareketleri.kisiId,
          hastaAd: kisiler.ad,
          hastaSoyad: kisiler.soyad,
        })
        .from(stokHareketleri)
        .innerJoin(kullanicilar, eq(kullanicilar.id, stokHareketleri.yapanId))
        .leftJoin(sahit, eq(sahit.id, stokHareketleri.sahitId))
        .leftJoin(kisiler, eq(kisiler.id, stokHareketleri.kisiId))
        .where(and(eq(stokHareketleri.urunId, id), eq(stokHareketleri.subeId, subeId)))
        .orderBy(desc(stokHareketleri.zaman))
        .limit(100);
      return {
        urun: { ...u, minSeviye: bindeMiktar(minBinde) },
        lotlar: lotlar.filter((l) => l.bakiye !== 0).sort((a, b) => (a.skt ?? '9999').localeCompare(b.skt ?? '9999')),
        fefo: fefoSirala(lotlar, gun)[0]?.lot ?? null,
        hareketler: hareketler.map(({ miktarBinde: mb, hastaAd, hastaSoyad, kisiId, ...h }) => ({
          ...h,
          miktar: bindeMiktar(mb),
          kisiId: hastaGorur ? kisiId : null,
          hasta: kisiId ? (hastaGorur ? `${hastaAd} ${hastaSoyad}` : 'Hasta') : null,
        })),
      };
    });
  }

  /**
   * Stok hareketi. Kurallar:
   *  - Çıkışta lot bakiyesi yeterli olmalı (lot başına kilitle yarış önlenir).
   *  - SKT'si geçmiş lot hastaya kullanılamaz (fire ile imha edilir).
   *  - Narkotik/psikotrop: yetkili kişi (narkotik.yonet) ve çıkış/sayımda farklı bir sağlık meslek
   *    mensubu şahit zorunlu.
   */
  async hareket(kimlik: Kimlik, yetki: YetkiBaglami, urunId: string, istek: HareketIstegi, ip: string | null) {
    const subeId = subeGerekli(yetki);
    return this.db.kiraciIslemi(kimlik, async (tx) => {
      const gun = await bugun(tx);
      const u = await this.urunBul(tx, urunId);
      if (!u.aktif && istek.tur === 'giris') throw new ApiHatasi(HttpStatus.UNPROCESSABLE_ENTITY, 'URUN_PASIF', 'Pasif ürüne giriş yapılamaz.');
      // Narkotik/psikotrop her hareketi narkotik sorumlusu yapar; diğerlerinde kullanım klinik personel, geri kalanı stok yöneticisi
      const kontrollu = kontrolluMu(u.kontrol);
      if (kontrollu && !yetki.izinler.has('narkotik.yonet')) {
        throw new ApiHatasi(HttpStatus.FORBIDDEN, 'NARKOTIK_YETKI', 'Narkotik ve psikotrop ilaç hareketi için yetkiniz yok.', { eksikIzinler: ['narkotik.yonet'] });
      }
      const gereken = istek.tur === 'kullanim' ? ['stok.yonet', 'tibbi.kayit.yaz'] : ['stok.yonet'];
      if (!kontrollu && !gereken.some((i) => yetki.izinler.has(i as never))) {
        throw new ApiHatasi(HttpStatus.FORBIDDEN, 'YETKI_YOK', 'Bu işlem için yetkiniz yok.', { eksikIzinler: gereken });
      }
      const sahitId = 'sahitId' in istek ? istek.sahitId : undefined;
      if (kontrollu && istek.tur !== 'giris') {
        if (!sahitId) throw new ApiHatasi(HttpStatus.UNPROCESSABLE_ENTITY, 'SAHIT_GEREKLI', 'Bu ilaç için şahit seçin.');
        if (sahitId === kimlik.kullaniciId) throw new ApiHatasi(HttpStatus.UNPROCESSABLE_ENTITY, 'SAHIT_UYGUN_DEGIL', 'Şahit, işlemi yapandan farklı bir sağlık meslek mensubu olmalı.');
        const [s] = await tx.select({ meslek: kullanicilar.meslek, aktif: kullanicilar.aktif }).from(kullanicilar).where(eq(kullanicilar.id, sahitId));
        if (!s || !s.aktif || !meslekMi(s.meslek) || !SAGLIK_MESLEKLERI.has(s.meslek)) {
          throw new ApiHatasi(HttpStatus.UNPROCESSABLE_ENTITY, 'SAHIT_UYGUN_DEGIL', 'Şahit, işlemi yapandan farklı bir sağlık meslek mensubu olmalı.');
        }
      }

      // Aynı lotta eşzamanlı çıkışları sırala
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${subeId}:${urunId}:${istek.lot}`}, 0))`);
      const [lot] = await lotBakiyeleri(tx, subeId, urunId).then((l) => l.filter((x) => x.lot === istek.lot));

      let miktar: number;
      let skt: string | null = null;
      if (istek.tur === 'giris') {
        if ((u.tip === 'ilac' || u.tip === 'asi' || u.tip === 'estetik') && !istek.skt) {
          throw new ApiHatasi(HttpStatus.BAD_REQUEST, 'GECERSIZ_ISTEK', 'Bu ürün için SKT zorunlu.', [{ alan: 'skt', mesaj: 'Bu ürün için SKT zorunlu.' }]);
        }
        if (lot && lot.skt && istek.skt && lot.skt !== istek.skt) {
          throw new ApiHatasi(HttpStatus.UNPROCESSABLE_ENTITY, 'LOT_SKT_FARKLI', 'Bu lot numarası farklı bir SKT ile kayıtlı.');
        }
        miktar = miktarBinde(istek.miktar);
        skt = istek.skt ?? lot?.skt ?? null;
      } else {
        if (!lot || lot.bakiye <= 0) {
          if (istek.tur !== 'sayim') throw new ApiHatasi(HttpStatus.CONFLICT, 'STOK_YETERSIZ', 'Bu lotta stok yok.', { bakiye: 0 });
        }
        skt = lot?.skt ?? null;
        if (istek.tur === 'sayim') {
          miktar = miktarBinde(istek.sayilan) - (lot?.bakiye ?? 0);
          if (miktar === 0) return { fark: 0 };
        } else {
          miktar = -miktarBinde(istek.miktar);
          if (lot!.bakiye + miktar < 0) throw new ApiHatasi(HttpStatus.CONFLICT, 'STOK_YETERSIZ', 'Lot bakiyesi yetersiz.', { bakiye: bindeMiktar(lot!.bakiye) });
          if (istek.tur === 'kullanim' && skt && skt < gun) {
            throw new ApiHatasi(HttpStatus.UNPROCESSABLE_ENTITY, 'SKT_GECMIS', 'Son kullanma tarihi geçmiş ürün hastaya kullanılamaz; fire olarak imha edin.');
          }
        }
        if (istek.tur === 'kullanim') {
          const [k] = await tx.select({ id: kisiler.id }).from(kisiler).where(eq(kisiler.id, istek.kisiId));
          if (!k) throw new ApiHatasi(HttpStatus.NOT_FOUND, 'HASTA_BULUNAMADI', 'Hasta bulunamadı.');
        }
      }

      const [h] = await tx
        .insert(stokHareketleri)
        .values({
          isletmeId: kimlik.isletmeId,
          subeId,
          urunId,
          lot: istek.lot,
          skt,
          tur: istek.tur,
          miktarBinde: miktar,
          kisiId: istek.tur === 'kullanim' ? istek.kisiId : null,
          aciklama: istek.aciklama,
          yapanId: kimlik.kullaniciId,
          sahitId: sahitId ?? null,
        })
        .returning({ id: stokHareketleri.id });
      await this.denetim.kaydet(tx, {
        ...kimlik,
        eylem: istek.tur === 'sayim' ? 'stok.sayim.farki' : 'stok.hareket',
        varlikTipi: 'urun',
        varlikId: urunId,
        subeId,
        ip,
        ayrinti: { tur: istek.tur, lot: istek.lot, miktar: bindeMiktar(miktar), kontrol: u.kontrol, ...(sahitId ? { sahitId } : {}), ...(istek.tur === 'kullanim' ? { kisiId: istek.kisiId } : {}) },
      });
      return { id: h!.id, ...(istek.tur === 'sayim' ? { fark: bindeMiktar(miktar) } : {}), bakiye: bindeMiktar((lot?.bakiye ?? 0) + miktar) };
    });
  }

  /** Narkotik şahidi olabilecek kişiler: aktif sağlık meslek mensupları (kendisi hariç). */
  async sahitler(kimlik: Kimlik) {
    return this.db.kiraciIslemi(kimlik, async (tx) => {
      const liste = await tx.select({ id: kullanicilar.id, adSoyad: kullanicilar.adSoyad, meslek: kullanicilar.meslek }).from(kullanicilar).where(eq(kullanicilar.aktif, true)).orderBy(asc(kullanicilar.adSoyad));
      return liste.filter((k) => k.id !== kimlik.kullaniciId && meslekMi(k.meslek) && SAGLIK_MESLEKLERI.has(k.meslek));
    });
  }

  /** Geri çağırma: bu lot hangi hastalara uygulandı? Görüntüleme kayda geçer. */
  async lotIzleme(kimlik: Kimlik, urunId: string, lot: string, ip: string | null) {
    return this.db.kiraciIslemi(kimlik, async (tx) => {
      const u = await this.urunBul(tx, urunId);
      const satirlar = await tx
        .select({ zaman: stokHareketleri.zaman, miktarBinde: stokHareketleri.miktarBinde, kisiId: kisiler.id, ad: kisiler.ad, soyad: kisiler.soyad, telefon: kisiler.telefon, sube: subeler.ad, yapan: kullanicilar.adSoyad })
        .from(stokHareketleri)
        .innerJoin(kisiler, eq(kisiler.id, stokHareketleri.kisiId))
        .innerJoin(subeler, eq(subeler.id, stokHareketleri.subeId))
        .innerJoin(kullanicilar, eq(kullanicilar.id, stokHareketleri.yapanId))
        .where(and(eq(stokHareketleri.urunId, urunId), eq(stokHareketleri.lot, lot), eq(stokHareketleri.tur, 'kullanim')))
        .orderBy(asc(stokHareketleri.zaman));
      await this.denetim.kaydet(tx, { ...kimlik, eylem: 'lot.izleme', varlikTipi: 'urun', varlikId: urunId, ip, ayrinti: { lot, hastaSayisi: new Set(satirlar.map((s) => s.kisiId)).size } });
      return { urun: u.ad, lot, kullanimlar: satirlar.map(({ miktarBinde: mb, ...s }) => ({ ...s, miktar: -bindeMiktar(mb) })) };
    });
  }

  // ——— Alarm kaynağı ———

  async stokAlarmlari(tx: Islem, gun: string, subeId: string | null): Promise<Alarm[]> {
    const alarmlar: Alarm[] = [];
    const urunListesi = await tx.select().from(urunler).where(eq(urunler.aktif, true));
    if (urunListesi.length === 0) return alarmlar;
    const subeListesi = await tx.select({ id: subeler.id, ad: subeler.ad }).from(subeler);
    const lotlar = await lotBakiyeleri(tx, subeId);
    const hedef: Alarm['hedefIzinler'] = ['stok.yonet', 'stok.goruntule'];
    for (const s of subeListesi) {
      if (subeId && s.id !== subeId) continue;
      for (const u of urunListesi) {
        const kendi = lotlar.filter((l) => l.subeId === s.id && l.urunId === u.id && l.bakiye > 0);
        for (const l of kendi) {
          const d = sktDurumu(l.skt, gun);
          if (!d.seviye) continue;
          alarmlar.push({ anahtar: `skt:${s.id}:${u.id}:${l.lot}`, kapsam: 'stok', seviye: d.seviye, tur: 'skt', turAd: u.ad, kullaniciId: null, kisi: null, subeId: s.id, sube: s.ad, bitis: l.skt, kalanGun: d.kalanGun, askiyaAliyor: false, hedefIzinler: hedef, ek: { urunId: u.id, lot: l.lot, miktar: bindeMiktar(l.bakiye), birim: u.birim } });
        }
        // Kritik seviye yalnızca şubede stok tutulan (hareketi olan) ürünler için
        const hareketliMi = lotlar.some((l) => l.subeId === s.id && l.urunId === u.id);
        const bakiye = kendi.reduce((t, l) => t + l.bakiye, 0);
        const seviye = hareketliMi ? stokSeviyesi(bakiye, u.minBinde) : null;
        if (seviye) {
          alarmlar.push({ anahtar: `min:${s.id}:${u.id}`, kapsam: 'stok', seviye, tur: 'kritik_stok', turAd: u.ad, kullaniciId: null, kisi: null, subeId: s.id, sube: s.ad, bitis: null, kalanGun: null, askiyaAliyor: false, hedefIzinler: ['stok.yonet'], ek: { urunId: u.id, miktar: bindeMiktar(bakiye), min: bindeMiktar(u.minBinde), birim: u.birim } });
        }
      }
    }
    // Son 7 günde narkotik/psikotrop sayım farkı: mesul müdür ve narkotik sorumlularına kritik
    const farklar = await tx
      .select({ id: stokHareketleri.id, subeId: stokHareketleri.subeId, urunId: stokHareketleri.urunId, lot: stokHareketleri.lot, miktarBinde: stokHareketleri.miktarBinde, zaman: stokHareketleri.zaman })
      .from(stokHareketleri)
      .innerJoin(urunler, eq(urunler.id, stokHareketleri.urunId))
      .where(and(eq(stokHareketleri.tur, 'sayim'), sql`${urunler.kontrol} IN ('narkotik', 'psikotrop')`, gte(stokHareketleri.zaman, sql`now() - interval '7 days'`)));
    for (const f of farklar) {
      if (subeId && f.subeId !== subeId) continue;
      const u = urunListesi.find((x) => x.id === f.urunId);
      alarmlar.push({ anahtar: `nf:${f.id}`, kapsam: 'stok', seviye: 'kritik', tur: 'narkotik_fark', turAd: u?.ad ?? '', kullaniciId: null, kisi: null, subeId: f.subeId, sube: subeListesi.find((x) => x.id === f.subeId)?.ad ?? null, bitis: null, kalanGun: null, askiyaAliyor: false, hedefIzinler: ['narkotik.yonet'], ek: { urunId: f.urunId, lot: f.lot, fark: bindeMiktar(f.miktarBinde), birim: u?.birim ?? '' } });
    }
    return alarmlar;
  }
}

