import { HttpStatus, Injectable } from '@nestjs/common';
import {
  ayinGunleri,
  type Gorev,
  type GorevTuru,
  IZIN_TURLERI,
  type IzinTuru,
  type NobetAyarlari,
  nobetIhlalleri,
  trGunu,
  VARSAYILAN_NOBET_AYARLARI,
} from '@dc/shared';
import { and, asc, eq, gte, inArray, isNull, lt, or, sql } from 'drizzle-orm';
import type { Alarm } from '../alarmlar/alarm';
import { cizelgeler, gorevler, kullanicilar, nobetAyarlari, personelIzinleri, rolAtamalari, subeler } from '../db/sema';
import { type Islem, VeritabaniService } from '../db/veritabani.service';
import { DenetimService } from '../denetim/denetim.service';
import { ApiHatasi, pgHatasi } from '../ortak/dogrulama';
import type { Kimlik, YetkiBaglami } from '../yetki/baglam';
import type { AyarIstegi, GorevIstegi, IzinIstegi, KararIstegi } from './nobet.dto';

type CizelgeSatiri = typeof cizelgeler.$inferSelect;
const GUN = 86_400_000;

function subeGerekli(yetki: YetkiBaglami): string {
  if (!yetki.subeId) throw new ApiHatasi(HttpStatus.BAD_REQUEST, 'SUBE_SECILMELI', 'Nöbet çizelgesi için bir şube seçin.');
  return yetki.subeId;
}

/** Ayın Türkiye saatine göre başlangıcı ve sonu (UTC) */
function ayAraligi(ay: string): { bas: Date; bit: Date } {
  const gunler = ayinGunleri(ay);
  return { bas: new Date(`${gunler[0]}T00:00:00+03:00`), bit: new Date(Date.parse(`${gunler.at(-1)}T00:00:00+03:00`) + GUN) };
}

function sonrakiAy(gun: string): string {
  const [y, a] = gun.split('-').map(Number);
  const d = new Date(Date.UTC(y!, a!, 1));
  return d.toISOString().slice(0, 7);
}

@Injectable()
export class NobetService {
  constructor(
    private readonly db: VeritabaniService,
    private readonly denetim: DenetimService,
  ) {}

  private async ayarOku(tx: Islem): Promise<NobetAyarlari> {
    const [a] = await tx.select().from(nobetAyarlari);
    return a ? { haftalikAzamiSaat: a.haftalikAzamiSaat, nobetSonrasiDinlenmeSaat: a.nobetSonrasiDinlenmeSaat, ardisikGeceAzami: a.ardisikGeceAzami } : VARSAYILAN_NOBET_AYARLARI;
  }

  async ayarlar(kimlik: Kimlik) {
    return this.db.kiraciIslemi(kimlik, (tx) => this.ayarOku(tx));
  }

  async ayarGuncelle(kimlik: Kimlik, istek: AyarIstegi, ip: string | null) {
    return this.db.kiraciIslemi(kimlik, async (tx) => {
      const onceki = await this.ayarOku(tx);
      const degerler = { ...istek, guncelleyenId: kimlik.kullaniciId, guncellemeZamani: new Date() };
      await tx.insert(nobetAyarlari).values({ isletmeId: kimlik.isletmeId, ...degerler }).onConflictDoUpdate({ target: nobetAyarlari.isletmeId, set: degerler });
      await this.denetim.kaydet(tx, { ...kimlik, eylem: 'nobet.ayar', ip, ayrinti: { onceki, yeni: istek } });
      return istek;
    });
  }

  /** Şubede görev verilebilecek personel: şubede (veya tüm şubelerde) rolü olan aktif kullanıcılar; yalnızca sahip olanlar hariç. */
  private async subePersoneli(tx: Islem, subeId: string) {
    const satirlar = await tx
      .select({ id: kullanicilar.id, adSoyad: kullanicilar.adSoyad, meslek: kullanicilar.meslek, rolKodu: rolAtamalari.rolKodu })
      .from(rolAtamalari)
      .innerJoin(kullanicilar, eq(kullanicilar.id, rolAtamalari.kullaniciId))
      .where(and(eq(kullanicilar.aktif, true), or(eq(rolAtamalari.subeId, subeId), isNull(rolAtamalari.subeId))))
      .orderBy(asc(kullanicilar.adSoyad));
    const kisiler = new Map<string, { id: string; adSoyad: string; meslek: string; roller: string[] }>();
    for (const s of satirlar) {
      const k = kisiler.get(s.id) ?? { id: s.id, adSoyad: s.adSoyad, meslek: s.meslek, roller: [] };
      k.roller.push(s.rolKodu);
      kisiler.set(s.id, k);
    }
    return [...kisiler.values()].filter((k) => k.roller.some((r) => r !== 'kurum_sahibi'));
  }

  private async cizelgeBul(tx: Islem, id: string): Promise<CizelgeSatiri> {
    const [c] = await tx.select().from(cizelgeler).where(eq(cizelgeler.id, id));
    if (!c) throw new ApiHatasi(HttpStatus.NOT_FOUND, 'CIZELGE_BULUNAMADI', 'Çizelge bulunamadı.');
    return c;
  }

  /**
   * Çizelgenin süre kuralı ihlalleri. Kişilerin diğer şubelerdeki ve komşu aylardaki görevleri de
   * hesaba katılır (dinlenme ve haftalık süre şube tanımaz); yalnızca bu çizelgeye dokunan ihlaller döner.
   */
  private async ihlaller(tx: Islem, c: CizelgeSatiri) {
    const kendi = await tx.select({ id: gorevler.id, kullaniciId: gorevler.kullaniciId }).from(gorevler).where(eq(gorevler.cizelgeId, c.id));
    if (kendi.length === 0) return [];
    const kisiIdleri = [...new Set(kendi.map((g) => g.kullaniciId))];
    const { bas, bit } = ayAraligi(c.ay);
    const cevre = await tx
      .select({ id: gorevler.id, kullaniciId: gorevler.kullaniciId, tur: gorevler.tur, baslangic: gorevler.baslangic, bitis: gorevler.bitis })
      .from(gorevler)
      .where(and(inArray(gorevler.kullaniciId, kisiIdleri), gte(gorevler.bitis, new Date(bas.getTime() - 8 * GUN)), lt(gorevler.baslangic, new Date(bit.getTime() + 8 * GUN))));
    const kendiIdler = new Set(kendi.map((g) => g.id));
    return nobetIhlalleri(cevre as Gorev[], await this.ayarOku(tx)).filter((i) => i.gorevIdleri.some((id) => kendiIdler.has(id)));
  }

  async cizelge(kimlik: Kimlik, yetki: YetkiBaglami, ay: string) {
    const subeId = subeGerekli(yetki);
    const planlayici = yetki.izinler.has('nobet.planla') || yetki.izinler.has('nobet.onayla');
    return this.db.kiraciIslemi(kimlik, async (tx) => {
      const [c] = await tx.select().from(cizelgeler).where(and(eq(cizelgeler.subeId, subeId), eq(cizelgeler.ay, ay)));
      const personel = await this.subePersoneli(tx, subeId);
      const { bas, bit } = ayAraligi(ay);
      const izinler = await tx
        .select({ id: personelIzinleri.id, kullaniciId: personelIzinleri.kullaniciId, tur: personelIzinleri.tur, baslangic: personelIzinleri.baslangic, bitis: personelIzinleri.bitis })
        .from(personelIzinleri)
        .where(and(isNull(personelIzinleri.iptalZamani), inArray(personelIzinleri.kullaniciId, personel.length ? personel.map((p) => p.id) : [kimlik.kullaniciId]), sql`${personelIzinleri.bitis} >= ${trGunu(bas.getTime())}::date`, sql`${personelIzinleri.baslangic} < ${trGunu(bit.getTime())}::date`));
      // Yayında olmayan çizelgeyi yalnızca planlayanlar görür
      const gorunur = !!c && (c.durum === 'yayinda' || planlayici);
      const liste = gorunur
        ? await tx.select({ id: gorevler.id, kullaniciId: gorevler.kullaniciId, tur: gorevler.tur, baslangic: gorevler.baslangic, bitis: gorevler.bitis, notu: gorevler.notu }).from(gorevler).where(eq(gorevler.cizelgeId, c.id)).orderBy(asc(gorevler.baslangic))
        : [];
      const kisiAdi = async (id: string | null) => (id ? (await tx.select({ ad: kullanicilar.adSoyad }).from(kullanicilar).where(eq(kullanicilar.id, id)))[0]?.ad ?? null : null);
      return {
        ay,
        subeId,
        cizelge: c
          ? {
              id: c.id,
              durum: c.durum,
              hazirlayan: await kisiAdi(c.hazirlayanId),
              onayaGonderenId: c.onayaGonderenId,
              onaylayan: await kisiAdi(c.onaylayanId),
              onayZamani: c.onayZamani,
              ihlalGerekcesi: c.ihlalGerekcesi,
              redNedeni: c.redNedeni,
            }
          : null,
        personel: personel.map(({ id, adSoyad, meslek }) => ({ id, adSoyad, meslek })),
        gorevler: liste.map((g) => ({ ...g, baslangic: g.baslangic.toISOString(), bitis: g.bitis.toISOString() })),
        izinler,
        ihlaller: gorunur && planlayici ? await this.ihlaller(tx, c) : [],
        ayar: await this.ayarOku(tx),
      };
    });
  }

  async cizelgeOlustur(kimlik: Kimlik, yetki: YetkiBaglami, ay: string, ip: string | null) {
    const subeId = subeGerekli(yetki);
    return this.db.kiraciIslemi(kimlik, async (tx) => {
      const [var_] = await tx.select({ id: cizelgeler.id }).from(cizelgeler).where(and(eq(cizelgeler.subeId, subeId), eq(cizelgeler.ay, ay)));
      if (var_) return { id: var_.id, yeni: false };
      const [c] = await tx.insert(cizelgeler).values({ isletmeId: kimlik.isletmeId, subeId, ay, hazirlayanId: kimlik.kullaniciId }).returning({ id: cizelgeler.id });
      await this.denetim.kaydet(tx, { ...kimlik, eylem: 'cizelge.olusturuldu', varlikTipi: 'cizelge', varlikId: c!.id, subeId, ip, ayrinti: { ay } });
      return { id: c!.id, yeni: true };
    });
  }

  async gorevEkle(kimlik: Kimlik, cizelgeId: string, istek: GorevIstegi, ip: string | null) {
    try {
      return await this.db.kiraciIslemi(kimlik, async (tx) => {
        const c = await this.cizelgeBul(tx, cizelgeId);
        if (c.durum !== 'taslak') throw new ApiHatasi(HttpStatus.CONFLICT, 'CIZELGE_KILITLI', 'Onaya gönderilmiş veya yayındaki çizelge değiştirilemez.');
        const bas = Date.parse(istek.baslangic);
        const bit = Date.parse(istek.bitis);
        if (!trGunu(bas).startsWith(c.ay)) throw new ApiHatasi(HttpStatus.UNPROCESSABLE_ENTITY, 'AY_DISI', 'Görev, çizelgenin ayında başlamalı.');
        const personel = await this.subePersoneli(tx, c.subeId);
        if (!personel.some((p) => p.id === istek.kullaniciId)) throw new ApiHatasi(HttpStatus.UNPROCESSABLE_ENTITY, 'SUBE_PERSONELI_DEGIL', 'Bu kişinin bu şubede rolü yok.');

        const izin = await tx
          .select({ tur: personelIzinleri.tur, baslangic: personelIzinleri.baslangic, bitis: personelIzinleri.bitis })
          .from(personelIzinleri)
          .where(and(eq(personelIzinleri.kullaniciId, istek.kullaniciId), isNull(personelIzinleri.iptalZamani), sql`${personelIzinleri.baslangic} <= ${trGunu(bit - 1)}::date`, sql`${personelIzinleri.bitis} >= ${trGunu(bas)}::date`));
        if (izin[0]) {
          throw new ApiHatasi(HttpStatus.CONFLICT, 'IZINLI', 'Kişi bu tarihte izinli.', { izin: { ...izin[0], turAd: IZIN_TURLERI[izin[0].tur as IzinTuru] } });
        }

        const [g] = await tx
          .insert(gorevler)
          .values({ isletmeId: kimlik.isletmeId, cizelgeId, subeId: c.subeId, kullaniciId: istek.kullaniciId, tur: istek.tur, baslangic: new Date(bas), bitis: new Date(bit), notu: istek.notu, ekleyenId: kimlik.kullaniciId })
          .returning({ id: gorevler.id });
        await this.denetim.kaydet(tx, { ...kimlik, eylem: 'gorev.eklendi', varlikTipi: 'cizelge', varlikId: cizelgeId, subeId: c.subeId, ip, ayrinti: { kullaniciId: istek.kullaniciId, tur: istek.tur, baslangic: istek.baslangic } });
        const ihlaller = (await this.ihlaller(tx, c)).filter((i) => i.kullaniciId === istek.kullaniciId);
        return { id: g!.id, ihlaller };
      });
    } catch (hata) {
      const pg = pgHatasi(hata);
      if (pg?.code === '23P01') throw new ApiHatasi(HttpStatus.CONFLICT, 'GOREV_CAKISMASI', 'Kişinin bu saatlerde başka bir görevi var.');
      throw hata;
    }
  }

  async gorevSil(kimlik: Kimlik, gorevId: string, ip: string | null) {
    return this.db.kiraciIslemi(kimlik, async (tx) => {
      const [g] = await tx.select().from(gorevler).where(eq(gorevler.id, gorevId));
      if (!g) throw new ApiHatasi(HttpStatus.NOT_FOUND, 'GOREV_BULUNAMADI', 'Görev bulunamadı.');
      const c = await this.cizelgeBul(tx, g.cizelgeId);
      if (c.durum !== 'taslak') throw new ApiHatasi(HttpStatus.CONFLICT, 'CIZELGE_KILITLI', 'Onaya gönderilmiş veya yayındaki çizelge değiştirilemez.');
      await tx.delete(gorevler).where(eq(gorevler.id, gorevId));
      await this.denetim.kaydet(tx, { ...kimlik, eylem: 'gorev.silindi', varlikTipi: 'cizelge', varlikId: c.id, subeId: c.subeId, ip, ayrinti: { kullaniciId: g.kullaniciId, tur: g.tur, baslangic: g.baslangic.toISOString() } });
      return { tamam: true };
    });
  }

  async onayaGonder(kimlik: Kimlik, id: string, ip: string | null) {
    return this.db.kiraciIslemi(kimlik, async (tx) => {
      const c = await this.cizelgeBul(tx, id);
      if (c.durum !== 'taslak') throw new ApiHatasi(HttpStatus.CONFLICT, 'GECERSIZ_DURUM', 'Yalnızca taslak çizelge onaya gönderilebilir.');
      const [{ adet }] = (await tx.select({ adet: sql<number>`count(*)::int` }).from(gorevler).where(eq(gorevler.cizelgeId, id))) as [{ adet: number }];
      if (adet === 0) throw new ApiHatasi(HttpStatus.UNPROCESSABLE_ENTITY, 'CIZELGE_BOS', 'Boş çizelge onaya gönderilemez.');
      await tx.update(cizelgeler).set({ durum: 'onay_bekliyor', onayaGonderenId: kimlik.kullaniciId, redNedeni: null }).where(eq(cizelgeler.id, id));
      const ihlaller = await this.ihlaller(tx, c);
      await this.denetim.kaydet(tx, { ...kimlik, eylem: 'cizelge.onaya.gonderildi', varlikTipi: 'cizelge', varlikId: id, subeId: c.subeId, ip, ayrinti: { ay: c.ay, gorev: adet, ihlal: ihlaller.length } });
      return { tamam: true, ihlalSayisi: ihlaller.length };
    });
  }

  /** Dört göz: onaya gönderen onaylayamaz. Kural ihlali varsa onay gerekçe ister. */
  async karar(kimlik: Kimlik, id: string, istek: KararIstegi, ip: string | null) {
    return this.db.kiraciIslemi(kimlik, async (tx) => {
      const c = await this.cizelgeBul(tx, id);
      if (c.durum !== 'onay_bekliyor') throw new ApiHatasi(HttpStatus.CONFLICT, 'GECERSIZ_DURUM', 'Çizelge onay beklemiyor.');
      if (c.onayaGonderenId === kimlik.kullaniciId) {
        await this.denetim.kaydet(tx, { ...kimlik, eylem: 'cizelge.karar.reddedildi', varlikTipi: 'cizelge', varlikId: id, subeId: c.subeId, ip, ayrinti: { neden: 'kendi_cizelgesi' } });
        throw new ApiHatasi(HttpStatus.FORBIDDEN, 'KENDI_CIZELGESI', 'Onaya kendi gönderdiğiniz çizelgeyi onaylayamazsınız.');
      }
      if (!istek.onay) {
        await tx.update(cizelgeler).set({ durum: 'taslak', redNedeni: istek.redNedeni! }).where(eq(cizelgeler.id, id));
        await this.denetim.kaydet(tx, { ...kimlik, eylem: 'cizelge.reddedildi', varlikTipi: 'cizelge', varlikId: id, subeId: c.subeId, ip, ayrinti: { ay: c.ay, neden: istek.redNedeni } });
        return { durum: 'taslak' };
      }
      const ihlaller = await this.ihlaller(tx, c);
      if (ihlaller.length > 0 && (istek.gerekce?.length ?? 0) < 5) {
        throw new ApiHatasi(HttpStatus.UNPROCESSABLE_ENTITY, 'IHLAL_GEREKCESI', 'Çizelgede kural ihlali var; onay için gerekçe yazın.', { ihlaller });
      }
      await tx.update(cizelgeler).set({ durum: 'yayinda', onaylayanId: kimlik.kullaniciId, onayZamani: new Date(), ihlalGerekcesi: ihlaller.length ? istek.gerekce! : null }).where(eq(cizelgeler.id, id));
      await this.denetim.kaydet(tx, {
        ...kimlik,
        eylem: ihlaller.length ? 'cizelge.ihlalle.onaylandi' : 'cizelge.onaylandi',
        varlikTipi: 'cizelge',
        varlikId: id,
        subeId: c.subeId,
        ip,
        ayrinti: { ay: c.ay, ...(ihlaller.length ? { ihlaller: ihlaller.map((i) => i.aciklama), gerekce: istek.gerekce } : {}) },
      });
      return { durum: 'yayinda' };
    });
  }

  async revizyon(kimlik: Kimlik, id: string, ip: string | null) {
    return this.db.kiraciIslemi(kimlik, async (tx) => {
      const c = await this.cizelgeBul(tx, id);
      if (c.durum === 'taslak') return { durum: 'taslak' };
      await tx.update(cizelgeler).set({ durum: 'taslak', onaylayanId: null, onayZamani: null, onayaGonderenId: null, ihlalGerekcesi: null }).where(eq(cizelgeler.id, id));
      await this.denetim.kaydet(tx, { ...kimlik, eylem: 'cizelge.revizyon', varlikTipi: 'cizelge', varlikId: id, subeId: c.subeId, ip, ayrinti: { ay: c.ay, oncekiDurum: c.durum } });
      return { durum: 'taslak' };
    });
  }

  /** Kişinin yayındaki çizelgelerde bugünden itibaren 30 günlük görevleri. */
  async gorevlerim(kimlik: Kimlik) {
    return this.db.kiraciIslemi(kimlik, async (tx) => {
      const satirlar = await tx
        .select({ id: gorevler.id, tur: gorevler.tur, baslangic: gorevler.baslangic, bitis: gorevler.bitis, notu: gorevler.notu, sube: subeler.ad })
        .from(gorevler)
        .innerJoin(cizelgeler, eq(cizelgeler.id, gorevler.cizelgeId))
        .innerJoin(subeler, eq(subeler.id, gorevler.subeId))
        .where(and(eq(gorevler.kullaniciId, kimlik.kullaniciId), eq(cizelgeler.durum, 'yayinda'), gte(gorevler.bitis, new Date()), lt(gorevler.baslangic, new Date(Date.now() + 30 * GUN))))
        .orderBy(asc(gorevler.baslangic));
      return satirlar.map((g) => ({ ...g, tur: g.tur as GorevTuru, baslangic: g.baslangic.toISOString(), bitis: g.bitis.toISOString() }));
    });
  }

  // ——— Personel izinleri ———

  async izinler(kimlik: Kimlik, yetki: YetkiBaglami, kullaniciId: string) {
    if (kullaniciId !== kimlik.kullaniciId && !['personel.goruntule', 'personel.yonet', 'nobet.planla', 'nobet.onayla'].some((i) => yetki.izinler.has(i as never))) {
      throw new ApiHatasi(HttpStatus.FORBIDDEN, 'YETKI_YOK', 'Bu işlem için yetkiniz yok.');
    }
    return this.db.kiraciIslemi(kimlik, (tx) =>
      tx
        .select({ id: personelIzinleri.id, tur: personelIzinleri.tur, baslangic: personelIzinleri.baslangic, bitis: personelIzinleri.bitis, aciklama: personelIzinleri.aciklama, iptalZamani: personelIzinleri.iptalZamani })
        .from(personelIzinleri)
        .where(eq(personelIzinleri.kullaniciId, kullaniciId))
        .orderBy(sql`${personelIzinleri.baslangic} DESC`),
    );
  }

  async izinEkle(kimlik: Kimlik, kullaniciId: string, istek: IzinIstegi, ip: string | null) {
    return this.db.kiraciIslemi(kimlik, async (tx) => {
      const [k] = await tx.select({ id: kullanicilar.id }).from(kullanicilar).where(eq(kullanicilar.id, kullaniciId));
      if (!k) throw new ApiHatasi(HttpStatus.NOT_FOUND, 'PERSONEL_BULUNAMADI', 'Personel bulunamadı.');
      const bas = new Date(`${istek.baslangic}T00:00:00+03:00`);
      const bit = new Date(Date.parse(`${istek.bitis}T00:00:00+03:00`) + GUN);
      // Yayındaki veya hazırlanan çizelgede bu tarihlerde görevi varsa önce görev değiştirilmeli
      const cakisan = await tx
        .select({ baslangic: gorevler.baslangic, sube: subeler.ad })
        .from(gorevler)
        .innerJoin(subeler, eq(subeler.id, gorevler.subeId))
        .where(and(eq(gorevler.kullaniciId, kullaniciId), lt(gorevler.baslangic, bit), sql`${gorevler.bitis} > ${bas.toISOString()}::timestamptz`));
      if (cakisan.length) {
        throw new ApiHatasi(HttpStatus.CONFLICT, 'IZIN_GOREV_CAKISMASI', 'Bu tarihlerde kişinin çizelgede görevi var; önce görevi değiştirin.', { gorevler: cakisan.map((g) => ({ gun: trGunu(g.baslangic.getTime()), sube: g.sube })) });
      }
      const [i] = await tx.insert(personelIzinleri).values({ isletmeId: kimlik.isletmeId, kullaniciId, ...istek, ekleyenId: kimlik.kullaniciId }).returning({ id: personelIzinleri.id });
      await this.denetim.kaydet(tx, { ...kimlik, eylem: 'izin.eklendi', varlikTipi: 'kullanici', varlikId: kullaniciId, ip, ayrinti: { tur: istek.tur, baslangic: istek.baslangic, bitis: istek.bitis } });
      return { id: i!.id };
    });
  }

  async izinIptal(kimlik: Kimlik, izinId: string, ip: string | null) {
    return this.db.kiraciIslemi(kimlik, async (tx) => {
      const [i] = await tx.select().from(personelIzinleri).where(eq(personelIzinleri.id, izinId));
      if (!i) throw new ApiHatasi(HttpStatus.NOT_FOUND, 'IZIN_BULUNAMADI', 'İzin kaydı bulunamadı.');
      if (i.iptalZamani) return { tamam: true };
      await tx.update(personelIzinleri).set({ iptalEdenId: kimlik.kullaniciId, iptalZamani: new Date() }).where(eq(personelIzinleri.id, izinId));
      await this.denetim.kaydet(tx, { ...kimlik, eylem: 'izin.iptal', varlikTipi: 'kullanici', varlikId: i.kullaniciId, ip, ayrinti: { tur: i.tur, baslangic: i.baslangic } });
      return { tamam: true };
    });
  }

  // ——— Alarm kaynağı ———

  /**
   * - Gelecek ayın çizelgesi ay başına 7 gün kala yayında değilse (şube modülü kullanıyorsa):
   *   planlayıcı ve onaylayana; 3 gün kala kritik.
   * - Onay bekleyen çizelge: onaylayana.
   */
  async nobetAlarmlari(tx: Islem, gun: string, subeId: string | null): Promise<Alarm[]> {
    const alarmlar: Alarm[] = [];
    const tumu = await tx.select({ id: cizelgeler.id, subeId: cizelgeler.subeId, ay: cizelgeler.ay, durum: cizelgeler.durum, sube: subeler.ad }).from(cizelgeler).innerJoin(subeler, eq(subeler.id, cizelgeler.subeId));
    const kullananSubeler = new Map(tumu.map((c) => [c.subeId, c.sube]));
    const ay = sonrakiAy(gun);
    const kalan = Math.round((Date.parse(`${ay}-01T00:00:00Z`) - Date.parse(`${gun}T00:00:00Z`)) / GUN);
    for (const [sid, sube] of kullananSubeler) {
      if (subeId && sid !== subeId) continue;
      const c = tumu.find((x) => x.subeId === sid && x.ay === ay);
      if (kalan <= 7 && c?.durum !== 'yayinda') {
        alarmlar.push({ anahtar: `n:${sid}:${ay}`, kapsam: 'nobet', seviye: kalan <= 3 ? 'kritik' : 'ciddi', tur: 'cizelge_yok', turAd: ay, kullaniciId: null, kisi: null, subeId: sid, sube, bitis: `${ay}-01`, kalanGun: kalan, askiyaAliyor: false, hedefIzinler: ['nobet.planla', 'nobet.onayla'], ek: { ay } });
      }
    }
    for (const c of tumu) {
      if (c.durum !== 'onay_bekliyor' || (subeId && c.subeId !== subeId)) continue;
      alarmlar.push({ anahtar: `o:${c.id}`, kapsam: 'nobet', seviye: 'uyari', tur: 'cizelge_onay', turAd: c.ay, kullaniciId: null, kisi: null, subeId: c.subeId, sube: c.sube, bitis: null, kalanGun: null, askiyaAliyor: false, hedefIzinler: ['nobet.onayla'], ek: { ay: c.ay } });
    }
    return alarmlar;
  }
}
