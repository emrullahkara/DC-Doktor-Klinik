import { randomInt } from 'node:crypto';
import { HttpStatus, Injectable } from '@nestjs/common';
import { cevapSonTarihi, KURUM_SAAT_DILIMI, olayKapatilabilirMi, type OlaySiddeti, SIKAYET_KANALLARI, type SikayetKanali, TAKIP_KODU_ALFABESI } from '@dc/shared';
import { and, asc, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { Alarm } from '../alarmlar/alarm';
import { dofler, kisiler, kullanicilar, olayBildirimleri, sikayetler } from '../db/sema';
import { type Islem, VeritabaniService } from '../db/veritabani.service';
import { DenetimService } from '../denetim/denetim.service';
import { AlanSifrelemeService } from '../ortak/alan-sifreleme.service';
import { ApiHatasi, benzersizlikIhlaliMi } from '../ortak/dogrulama';
import type { Kimlik, YetkiBaglami } from '../yetki/baglam';
import { YetkiService } from '../yetki/yetki.service';
import type { DofIstegi, OlayGuncelleIstegi, OlayIstegi, SikayetIstegi } from './kalite.dto';

async function bugun(tx: Islem): Promise<string> {
  return (await tx.execute<{ gun: string }>(sql`SELECT (now() AT TIME ZONE ${KURUM_SAAT_DILIMI})::date::text AS gun`)).rows[0]!.gun;
}

const takipKodu = () => Array.from({ length: 8 }, () => TAKIP_KODU_ALFABESI[randomInt(TAKIP_KODU_ALFABESI.length)]).join('');
const gunFarki = (a: string, b: string) => Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000);

const SIDDET_SEVIYESI: Record<OlaySiddeti, Alarm['seviye']> = { ciddi: 'kritik', orta: 'ciddi', hafif: 'uyari', zarar_yok: 'uyari' };

@Injectable()
export class KaliteService {
  constructor(
    private readonly db: VeritabaniService,
    private readonly denetim: DenetimService,
    private readonly sifreleme: AlanSifrelemeService,
    private readonly yetkiService: YetkiService,
  ) {}

  // ——— Olay bildirimi ———

  /**
   * Herkes olay bildirebilir. İsimsiz bildirimde kimlik yalnızca şifreli saklanır; denetim izine de
   * kişi yazılmaz (suçlamasız bildirim). Bildirene takip kodu verilir.
   */
  async olayBildir(kimlik: Kimlik, yetki: YetkiBaglami, istek: OlayIstegi, ip: string | null) {
    for (let deneme = 0; deneme < 3; deneme++) {
      try {
        return await this.db.kiraciIslemi(kimlik, async (tx) => {
          if (istek.kisiId) {
            const [k] = await tx.select({ id: kisiler.id }).from(kisiler).where(eq(kisiler.id, istek.kisiId));
            if (!k) throw new ApiHatasi(HttpStatus.NOT_FOUND, 'HASTA_BULUNAMADI', 'Hasta bulunamadı.');
          }
          const kod = takipKodu();
          const { isimsiz, olayZamani, kisiId, ...geri } = istek;
          const [o] = await tx
            .insert(olayBildirimleri)
            .values({
              isletmeId: kimlik.isletmeId,
              subeId: yetki.subeId,
              takipKodu: kod,
              ...geri,
              olayZamani: new Date(olayZamani),
              kisiId: kisiId ?? null,
              isimsiz,
              bildirenId: isimsiz ? null : kimlik.kullaniciId,
              bildirenSifreli: isimsiz ? this.sifreleme.sifrele(kimlik.kullaniciId) : null,
            })
            .returning({ id: olayBildirimleri.id });
          await this.denetim.kaydet(tx, {
            isletmeId: kimlik.isletmeId,
            kullaniciId: isimsiz ? null : kimlik.kullaniciId,
            eylem: 'olay.bildirildi',
            varlikTipi: 'olay',
            varlikId: o!.id,
            subeId: yetki.subeId,
            ip: isimsiz ? null : ip,
            ayrinti: { tur: istek.tur, siddet: istek.siddet, isimsiz },
          });
          return { id: o!.id, takipKodu: kod };
        });
      } catch (hata) {
        if (!benzersizlikIhlaliMi(hata)) throw hata;
      }
    }
    throw new Error('Takip kodu üretilemedi');
  }

  async olayTakip(kimlik: Kimlik, kod: string) {
    return this.db.kiraciIslemi(kimlik, async (tx) => {
      const [o] = await tx.select({ durum: olayBildirimleri.durum, tur: olayBildirimleri.tur, zaman: olayBildirimleri.zaman, kapanisZamani: olayBildirimleri.kapanisZamani }).from(olayBildirimleri).where(eq(olayBildirimleri.takipKodu, kod.toUpperCase()));
      if (!o) throw new ApiHatasi(HttpStatus.NOT_FOUND, 'OLAY_BULUNAMADI', 'Bu takip koduyla bildirim bulunamadı.');
      return o;
    });
  }

  async olaylarim(kimlik: Kimlik) {
    return this.db.kiraciIslemi(kimlik, (tx) =>
      tx
        .select({ id: olayBildirimleri.id, takipKodu: olayBildirimleri.takipKodu, tur: olayBildirimleri.tur, siddet: olayBildirimleri.siddet, durum: olayBildirimleri.durum, zaman: olayBildirimleri.zaman })
        .from(olayBildirimleri)
        .where(eq(olayBildirimleri.bildirenId, kimlik.kullaniciId))
        .orderBy(desc(olayBildirimleri.zaman)),
    );
  }

  /**
   * Kalite kayıtlarında şube kapsamı: tüm şubelerde yetkili olan hepsini, yalnız bir şubede
   * yetkili olan o şubenin ve şubesiz (işletme geneli) kayıtları görür.
   */
  private async subeKosulu(tx: Islem, kimlik: Kimlik, yetki: YetkiBaglami, sutun: typeof olayBildirimleri.subeId | typeof sikayetler.subeId, izinler: ('kalite.yonet' | 'komuta.goruntule')[]) {
    for (const izin of izinler) if (await this.yetkiService.subedeIzinVarMi(tx, kimlik.kullaniciId, izin, null)) return sql`true`;
    return yetki.subeId ? or(eq(sutun, yetki.subeId), isNull(sutun))! : isNull(sutun);
  }

  async olaylar(kimlik: Kimlik, yetki: YetkiBaglami) {
    const hastaGorur = yetki.izinler.has('hasta.demografik.goruntule');
    return this.db.kiraciIslemi(kimlik, async (tx) => {
      const kapsam = await this.subeKosulu(tx, kimlik, yetki, olayBildirimleri.subeId, ['kalite.yonet']);
      const sorumlu = alias(kullanicilar, 'sorumlu');
      const satirlar = await tx
        .select({ o: olayBildirimleri, bildiren: kullanicilar.adSoyad, sorumlu: sorumlu.adSoyad, hastaAd: kisiler.ad, hastaSoyad: kisiler.soyad })
        .from(olayBildirimleri)
        .leftJoin(kullanicilar, eq(kullanicilar.id, olayBildirimleri.bildirenId))
        .leftJoin(sorumlu, eq(sorumlu.id, olayBildirimleri.sorumluId))
        .leftJoin(kisiler, eq(kisiler.id, olayBildirimleri.kisiId))
        .where(kapsam)
        .orderBy(desc(olayBildirimleri.zaman))
        .limit(300);
      // Şifreli kimlik hiçbir zaman dışarı verilmez
      return satirlar.map(({ o: { isletmeId: _i, bildirenSifreli: _b, ...o }, bildiren, sorumlu: s, hastaAd, hastaSoyad }) => ({
        ...o,
        bildiren: o.isimsiz ? null : bildiren,
        sorumlu: s,
        hasta: o.kisiId ? (hastaGorur ? `${hastaAd} ${hastaSoyad}` : 'Hasta') : null,
        kisiId: hastaGorur ? o.kisiId : null,
      }));
    });
  }

  async olayGuncelle(kimlik: Kimlik, id: string, istek: OlayGuncelleIstegi, ip: string | null) {
    return this.db.kiraciIslemi(kimlik, async (tx) => {
      const [o] = await tx.select().from(olayBildirimleri).where(eq(olayBildirimleri.id, id));
      if (!o) throw new ApiHatasi(HttpStatus.NOT_FOUND, 'OLAY_BULUNAMADI', 'Olay bulunamadı.');
      if (o.subeId) await this.yetkiService.subeIzniGerekli(tx, kimlik.kullaniciId, 'kalite.yonet', o.subeId);
      if (o.durum === 'kapatildi') throw new ApiHatasi(HttpStatus.CONFLICT, 'OLAY_KAPALI', 'Kapatılmış olay değiştirilemez.');
      const kokNeden = istek.kokNeden ?? o.kokNeden;
      const onlem = istek.alinanOnlem ?? o.alinanOnlem;
      if (istek.durum === 'kapatildi' && !olayKapatilabilirMi(o.siddet as OlaySiddeti, kokNeden, onlem)) {
        throw new ApiHatasi(HttpStatus.UNPROCESSABLE_ENTITY, 'KOK_NEDEN_GEREKLI', 'Orta ve ciddi olay, kök neden ve alınan önlem yazılmadan kapatılamaz.');
      }
      if (istek.sorumluId) {
        const [k] = await tx.select({ id: kullanicilar.id }).from(kullanicilar).where(and(eq(kullanicilar.id, istek.sorumluId), eq(kullanicilar.aktif, true)));
        if (!k) throw new ApiHatasi(HttpStatus.NOT_FOUND, 'PERSONEL_BULUNAMADI', 'Personel bulunamadı.');
      }
      const kapat = istek.durum === 'kapatildi';
      await tx
        .update(olayBildirimleri)
        .set({
          ...(istek.durum ? { durum: istek.durum } : o.durum === 'yeni' ? { durum: 'inceleniyor' } : {}),
          ...(istek.sorumluId ? { sorumluId: istek.sorumluId } : {}),
          kokNeden,
          alinanOnlem: onlem,
          ...(istek.resmiBildirim !== undefined ? { resmiBildirim: istek.resmiBildirim } : {}),
          ...(kapat ? { kapatanId: kimlik.kullaniciId, kapanisZamani: new Date() } : {}),
        })
        .where(eq(olayBildirimleri.id, id));
      await this.denetim.kaydet(tx, { ...kimlik, eylem: kapat ? 'olay.kapatildi' : 'olay.guncellendi', varlikTipi: 'olay', varlikId: id, ip, ayrinti: { alanlar: Object.keys(istek) } });
      return { tamam: true };
    });
  }

  // ——— Şikâyet ———

  async sikayetKaydet(kimlik: Kimlik, yetki: YetkiBaglami, istek: SikayetIstegi, ip: string | null) {
    return this.db.kiraciIslemi(kimlik, async (tx) => {
      if (istek.kisiId) {
        const [k] = await tx.select({ id: kisiler.id }).from(kisiler).where(eq(kisiler.id, istek.kisiId));
        if (!k) throw new ApiHatasi(HttpStatus.NOT_FOUND, 'HASTA_BULUNAMADI', 'Hasta bulunamadı.');
      }
      if (istek.alinisGunu > (await bugun(tx))) throw new ApiHatasi(HttpStatus.UNPROCESSABLE_ENTITY, 'GELECEK_TARIH', 'Alınış tarihi ileri bir gün olamaz.');
      const [s] = await tx
        .insert(sikayetler)
        .values({ isletmeId: kimlik.isletmeId, subeId: yetki.subeId, ...istek, kisiId: istek.kisiId ?? null, sonTarih: cevapSonTarihi(istek.kanal, istek.alinisGunu), kaydedenId: kimlik.kullaniciId })
        .returning({ id: sikayetler.id, sonTarih: sikayetler.sonTarih });
      await this.denetim.kaydet(tx, { ...kimlik, eylem: 'sikayet.kaydedildi', varlikTipi: 'sikayet', varlikId: s!.id, subeId: yetki.subeId, ip, ayrinti: { kanal: istek.kanal, kategori: istek.kategori } });
      return s!;
    });
  }

  async sikayetler(kimlik: Kimlik, yetki: YetkiBaglami) {
    return this.db.kiraciIslemi(kimlik, async (tx) => {
      const kapsam = await this.subeKosulu(tx, kimlik, yetki, sikayetler.subeId, ['kalite.yonet', 'komuta.goruntule']);
      const gun = await bugun(tx);
      const cevaplayan = alias(kullanicilar, 'cevaplayan');
      const satirlar = await tx
        .select({ s: sikayetler, kaydeden: kullanicilar.adSoyad, cevaplayan: cevaplayan.adSoyad })
        .from(sikayetler)
        .innerJoin(kullanicilar, eq(kullanicilar.id, sikayetler.kaydedenId))
        .leftJoin(cevaplayan, eq(cevaplayan.id, sikayetler.cevaplayanId))
        .where(kapsam)
        .orderBy(asc(sikayetler.durum), asc(sikayetler.sonTarih))
        .limit(300);
      return satirlar.map(({ s: { isletmeId: _i, ...s }, kaydeden, cevaplayan: c }) => ({
        ...s,
        kaydeden,
        cevaplayan: c,
        resmi: SIKAYET_KANALLARI[s.kanal as SikayetKanali]?.resmi ?? false,
        kalanGun: s.durum === 'acik' ? gunFarki(s.sonTarih, gun) : null,
      }));
    });
  }

  /** Tıbbi içerikli şikâyete cevabı yalnızca tıbbi denetim yetkisi olan (başhekim, mesul müdür) verir. */
  async sikayetCevapla(kimlik: Kimlik, yetki: YetkiBaglami, id: string, cevap: string, ip: string | null) {
    return this.db.kiraciIslemi(kimlik, async (tx) => {
      const [s] = await tx.select().from(sikayetler).where(eq(sikayetler.id, id));
      if (!s) throw new ApiHatasi(HttpStatus.NOT_FOUND, 'SIKAYET_BULUNAMADI', 'Şikâyet bulunamadı.');
      if (s.subeId) await this.yetkiService.subeIzniGerekli(tx, kimlik.kullaniciId, 'kalite.yonet', s.subeId);
      if (s.durum !== 'acik') throw new ApiHatasi(HttpStatus.CONFLICT, 'SIKAYET_CEVAPLANMIS', 'Bu şikâyet zaten cevaplandı.');
      if (s.kategori === 'tibbi' && !yetki.izinler.has('tibbi.kayit.denetim')) {
        throw new ApiHatasi(HttpStatus.FORBIDDEN, 'TIBBI_DEGERLENDIRME', 'Tıbbi içerikli şikâyeti başhekim veya mesul müdür cevaplamalı.');
      }
      await tx.update(sikayetler).set({ durum: 'cevaplandi', cevap, cevaplayanId: kimlik.kullaniciId, cevapZamani: new Date() }).where(eq(sikayetler.id, id));
      await this.denetim.kaydet(tx, { ...kimlik, eylem: 'sikayet.cevaplandi', varlikTipi: 'sikayet', varlikId: id, ip, ayrinti: { gecikme: gunFarki(await bugun(tx), s.sonTarih) > 0 } });
      return { tamam: true };
    });
  }

  async sikayetKapat(kimlik: Kimlik, id: string, ip: string | null) {
    return this.db.kiraciIslemi(kimlik, async (tx) => {
      const [s] = await tx.select({ durum: sikayetler.durum, subeId: sikayetler.subeId }).from(sikayetler).where(eq(sikayetler.id, id));
      if (!s) throw new ApiHatasi(HttpStatus.NOT_FOUND, 'SIKAYET_BULUNAMADI', 'Şikâyet bulunamadı.');
      if (s.subeId) await this.yetkiService.subeIzniGerekli(tx, kimlik.kullaniciId, 'kalite.yonet', s.subeId);
      if (s.durum !== 'cevaplandi') throw new ApiHatasi(HttpStatus.CONFLICT, 'GECERSIZ_DURUM', 'Önce şikâyet cevaplanmalı.');
      await tx.update(sikayetler).set({ durum: 'kapatildi' }).where(eq(sikayetler.id, id));
      await this.denetim.kaydet(tx, { ...kimlik, eylem: 'sikayet.kapatildi', varlikTipi: 'sikayet', varlikId: id, ip });
      return { tamam: true };
    });
  }

  // ——— DÖF ———

  async dofAc(kimlik: Kimlik, istek: DofIstegi, ip: string | null) {
    return this.db.kiraciIslemi(kimlik, async (tx) => {
      const [k] = await tx.select({ id: kullanicilar.id }).from(kullanicilar).where(and(eq(kullanicilar.id, istek.sorumluId), eq(kullanicilar.aktif, true)));
      if (!k) throw new ApiHatasi(HttpStatus.NOT_FOUND, 'PERSONEL_BULUNAMADI', 'Personel bulunamadı.');
      if (istek.olayId && !(await tx.select({ id: olayBildirimleri.id }).from(olayBildirimleri).where(eq(olayBildirimleri.id, istek.olayId)))[0]) {
        throw new ApiHatasi(HttpStatus.NOT_FOUND, 'OLAY_BULUNAMADI', 'Olay bulunamadı.');
      }
      if (istek.sikayetId && !(await tx.select({ id: sikayetler.id }).from(sikayetler).where(eq(sikayetler.id, istek.sikayetId)))[0]) {
        throw new ApiHatasi(HttpStatus.NOT_FOUND, 'SIKAYET_BULUNAMADI', 'Şikâyet bulunamadı.');
      }
      const [d] = await tx.insert(dofler).values({ isletmeId: kimlik.isletmeId, ...istek, olayId: istek.olayId ?? null, sikayetId: istek.sikayetId ?? null, acanId: kimlik.kullaniciId }).returning({ id: dofler.id });
      await this.denetim.kaydet(tx, { ...kimlik, eylem: 'dof.acildi', varlikTipi: 'dof', varlikId: d!.id, ip, ayrinti: { kaynak: istek.kaynak, sorumluId: istek.sorumluId, termin: istek.termin } });
      return { id: d!.id };
    });
  }

  /** Kalite yetkilisi tümünü, diğerleri yalnızca sorumlusu oldukları DÖF'leri görür. */
  async dofler(kimlik: Kimlik, yetki: YetkiBaglami) {
    const hepsi = yetki.izinler.has('kalite.yonet');
    return this.db.kiraciIslemi(kimlik, async (tx) => {
      const gun = await bugun(tx);
      const tamamlayan = alias(kullanicilar, 'tamamlayan');
      const dogrulayan = alias(kullanicilar, 'dogrulayan');
      const satirlar = await tx
        .select({ d: dofler, sorumlu: kullanicilar.adSoyad, tamamlayan: tamamlayan.adSoyad, dogrulayan: dogrulayan.adSoyad })
        .from(dofler)
        .innerJoin(kullanicilar, eq(kullanicilar.id, dofler.sorumluId))
        .leftJoin(tamamlayan, eq(tamamlayan.id, dofler.tamamlayanId))
        .leftJoin(dogrulayan, eq(dogrulayan.id, dofler.dogrulayanId))
        .where(hepsi ? sql`true` : eq(dofler.sorumluId, kimlik.kullaniciId))
        .orderBy(asc(dofler.durum), asc(dofler.termin));
      return satirlar.map(({ d: { isletmeId: _i, ...d }, sorumlu, tamamlayan: t, dogrulayan: g }) => ({ ...d, sorumlu, tamamlayan: t, dogrulayan: g, kalanGun: d.durum === 'acik' ? gunFarki(d.termin, gun) : null }));
    });
  }

  async dofTamamla(kimlik: Kimlik, yetki: YetkiBaglami, id: string, not: string, ip: string | null) {
    return this.db.kiraciIslemi(kimlik, async (tx) => {
      const [d] = await tx.select().from(dofler).where(eq(dofler.id, id));
      if (!d) throw new ApiHatasi(HttpStatus.NOT_FOUND, 'DOF_BULUNAMADI', 'DÖF bulunamadı.');
      if (d.sorumluId !== kimlik.kullaniciId && !yetki.izinler.has('kalite.yonet')) throw new ApiHatasi(HttpStatus.FORBIDDEN, 'YETKI_YOK', 'Bu işlem için yetkiniz yok.');
      if (d.durum !== 'acik') throw new ApiHatasi(HttpStatus.CONFLICT, 'GECERSIZ_DURUM', 'DÖF açık değil.');
      await tx.update(dofler).set({ durum: 'tamamlandi', tamamlamaNotu: not, tamamlayanId: kimlik.kullaniciId, tamamlamaZamani: new Date() }).where(eq(dofler.id, id));
      await this.denetim.kaydet(tx, { ...kimlik, eylem: 'dof.tamamlandi', varlikTipi: 'dof', varlikId: id, ip });
      return { tamam: true };
    });
  }

  /** Dört göz: aksiyonu tamamlayan, etkinliğini doğrulayamaz. */
  async dofDogrula(kimlik: Kimlik, id: string, not: string, ip: string | null) {
    return this.db.kiraciIslemi(kimlik, async (tx) => {
      const [d] = await tx.select().from(dofler).where(eq(dofler.id, id));
      if (!d) throw new ApiHatasi(HttpStatus.NOT_FOUND, 'DOF_BULUNAMADI', 'DÖF bulunamadı.');
      if (d.durum !== 'tamamlandi') throw new ApiHatasi(HttpStatus.CONFLICT, 'GECERSIZ_DURUM', 'DÖF doğrulama beklemiyor.');
      if (d.tamamlayanId === kimlik.kullaniciId) throw new ApiHatasi(HttpStatus.FORBIDDEN, 'KENDI_DOF', 'Tamamladığınız DÖF’ün etkinliğini başka bir yetkili doğrulamalı.');
      await tx.update(dofler).set({ durum: 'dogrulandi', dogrulayanId: kimlik.kullaniciId, dogrulamaNotu: not, dogrulamaZamani: new Date() }).where(eq(dofler.id, id));
      await this.denetim.kaydet(tx, { ...kimlik, eylem: 'dof.dogrulandi', varlikTipi: 'dof', varlikId: id, ip });
      return { tamam: true };
    });
  }

  async kisiler(kimlik: Kimlik) {
    return this.db.kiraciIslemi(kimlik, (tx) => tx.select({ id: kullanicilar.id, adSoyad: kullanicilar.adSoyad }).from(kullanicilar).where(eq(kullanicilar.aktif, true)).orderBy(asc(kullanicilar.adSoyad)));
  }

  // ——— Alarm kaynağı ———

  async kaliteAlarmlari(tx: Islem, gun: string, subeId: string | null): Promise<Alarm[]> {
    const alarmlar: Alarm[] = [];
    const hedef: Alarm['hedefIzinler'] = ['kalite.yonet'];
    const subeUygun = (s: string | null) => !subeId || !s || s === subeId;

    const acikOlaylar = await tx.select({ id: olayBildirimleri.id, subeId: olayBildirimleri.subeId, tur: olayBildirimleri.tur, siddet: olayBildirimleri.siddet, durum: olayBildirimleri.durum, zaman: olayBildirimleri.zaman }).from(olayBildirimleri).where(inArray(olayBildirimleri.durum, ['yeni', 'inceleniyor']));
    for (const o of acikOlaylar) {
      if (!subeUygun(o.subeId)) continue;
      alarmlar.push({ anahtar: `olay:${o.id}`, kapsam: 'kalite', seviye: SIDDET_SEVIYESI[o.siddet as OlaySiddeti] ?? 'uyari', tur: 'olay', turAd: o.tur, kullaniciId: null, kisi: null, subeId: o.subeId, sube: null, bitis: null, kalanGun: null, askiyaAliyor: false, hedefIzinler: hedef, ek: { olayTuru: o.tur, siddet: o.siddet, durum: o.durum } });
    }

    const acikSikayetler = await tx.select({ id: sikayetler.id, subeId: sikayetler.subeId, konu: sikayetler.konu, kanal: sikayetler.kanal, sonTarih: sikayetler.sonTarih }).from(sikayetler).where(eq(sikayetler.durum, 'acik'));
    for (const s of acikSikayetler) {
      if (!subeUygun(s.subeId)) continue;
      const kalan = gunFarki(s.sonTarih, gun);
      const resmi = SIKAYET_KANALLARI[s.kanal as SikayetKanali]?.resmi ?? false;
      const seviye: Alarm['seviye'] = kalan < 0 ? 'kritik' : kalan <= 5 && resmi ? 'ciddi' : 'uyari';
      alarmlar.push({ anahtar: `sik:${s.id}`, kapsam: 'kalite', seviye, tur: 'sikayet', turAd: s.konu, kullaniciId: null, kisi: null, subeId: s.subeId, sube: null, bitis: s.sonTarih, kalanGun: kalan, askiyaAliyor: false, hedefIzinler: hedef, ek: { kanal: s.kanal, resmi: resmi ? 1 : 0 } });
    }

    const acikDofler = await tx.select({ id: dofler.id, baslik: dofler.baslik, termin: dofler.termin, durum: dofler.durum, sorumluId: dofler.sorumluId }).from(dofler).where(or(eq(dofler.durum, 'acik'), eq(dofler.durum, 'tamamlandi')));
    for (const d of acikDofler) {
      if (d.durum === 'tamamlandi') {
        alarmlar.push({ anahtar: `dofd:${d.id}`, kapsam: 'kalite', seviye: 'uyari', tur: 'dof_dogrulama', turAd: d.baslik, kullaniciId: null, kisi: null, subeId: null, sube: null, bitis: null, kalanGun: null, askiyaAliyor: false, hedefIzinler: hedef });
        continue;
      }
      const kalan = gunFarki(d.termin, gun);
      if (kalan > 7) continue;
      alarmlar.push({ anahtar: `dof:${d.id}`, kapsam: 'kalite', seviye: kalan < 0 ? 'ciddi' : 'uyari', tur: 'dof', turAd: d.baslik, kullaniciId: d.sorumluId, kisi: null, subeId: null, sube: null, bitis: d.termin, kalanGun: kalan, askiyaAliyor: false, hedefIzinler: hedef });
    }
    return alarmlar;
  }
}
