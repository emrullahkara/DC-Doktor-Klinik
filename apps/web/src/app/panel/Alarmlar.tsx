'use client';

import type { AlarmKapsami, AlarmSeviyesi } from '@dc/shared';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useOturum } from '@/lib/oturum';
import { metin } from '@/metin';

const m = metin.alarmlar;
const ILK_GOSTERIM = 6;

interface Alarm {
  anahtar: string;
  kapsam: AlarmKapsami;
  tur: string;
  ek?: Record<string, string | number>;
  seviye: AlarmSeviyesi;
  turAd: string;
  kullaniciId: string | null;
  kisi: string | null;
  sube: string | null;
  kalanGun: number | null;
  askiyaAliyor: boolean;
}

const SINIF: Record<AlarmSeviyesi, string> = { kritik: 'rozet rozet-kritik', ciddi: 'rozet rozet-uyari', uyari: 'rozet rozet-bilgi', eksik: 'rozet rozet-uyari' };

interface Satir extends Alarm {
  /** Aynı kişinin eksik belgeleri tek satırda toplanır */
  eksikTurler?: string[];
}

function grupla(liste: Alarm[]): Satir[] {
  const sonuc: Satir[] = [];
  const kisiEksik = new Map<string, Satir>();
  for (const a of liste) {
    if (a.kapsam === 'personel' && a.seviye === 'eksik' && a.kullaniciId) {
      const var_ = kisiEksik.get(a.kullaniciId);
      if (var_) {
        var_.eksikTurler!.push(a.turAd);
        continue;
      }
      const satir = { ...a, eksikTurler: [a.turAd] };
      kisiEksik.set(a.kullaniciId, satir);
      sonuc.push(satir);
      continue;
    }
    sonuc.push(a);
  }
  return sonuc;
}

const ayAdi = (ay: string) => new Date(`${ay}-15T12:00:00+03:00`).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric', timeZone: 'Europe/Istanbul' });

/** Alarmın bağlantısı ve başlığı (kişi, şube …) */
function hedef(a: Satir, benId: string): { yol: string; kim: string } {
  switch (a.kapsam) {
    case 'personel':
      return { yol: `/panel/personel/${a.kullaniciId}`, kim: a.kullaniciId === benId ? metin.personel.kendiKartim : a.kisi ?? '' };
    case 'kurum':
      return { yol: '/panel/belgeler', kim: a.sube ?? metin.kurumBelgeleri.tumIsletme };
    case 'nobet':
      return { yol: '/panel/nobet', kim: a.sube ?? '' };
    case 'stok':
      return { yol: a.ek?.urunId ? `/panel/stok/${a.ek.urunId}` : '/panel/stok', kim: a.sube ?? '' };
    case 'kalite':
      return { yol: '/panel/kalite', kim: a.sube ?? metin.kurumBelgeleri.tumIsletme };
  }
}

function alarmMetni(a: Satir): string {
  if (a.kapsam === 'nobet') return a.tur === 'cizelge_onay' ? m.cizelgeOnay(ayAdi(String(a.ek?.ay))) : m.cizelgeYok(ayAdi(String(a.ek?.ay)), a.kalanGun ?? 0);
  if (a.kapsam === 'stok') {
    const e = a.ek ?? {};
    if (a.tur === 'kritik_stok') return m.kritikStok(a.turAd, `${e.miktar} ${e.birim}`, `${e.min} ${e.birim}`);
    if (a.tur === 'narkotik_fark') return m.narkotikFark(a.turAd, String(e.lot), `${e.fark} ${e.birim}`);
    return (a.kalanGun ?? 0) < 0 ? m.sktDoldu(a.turAd, String(e.lot), -(a.kalanGun ?? 0)) : m.sktYaklasan(a.turAd, String(e.lot), a.kalanGun ?? 0);
  }
  if (a.kapsam === 'kalite') return String(a.ek?.metin ?? a.turAd);
  if (a.eksikTurler && a.eksikTurler.length > 1) return m.eksikBelgeler(a.eksikTurler.length, a.eksikTurler.join(', '));
  if (a.seviye === 'eksik') return m.eksikBelge(a.turAd);
  if ((a.kalanGun ?? 0) < 0) return m.dolmus(a.turAd, -(a.kalanGun ?? 0));
  return m.yaklasan(a.turAd, a.kalanGun ?? 0);
}

/** Kullanıcının görebileceği alarmlar (eskalasyon API'de); kritikler önce. */
export function Alarmlar() {
  const { ben, subeId } = useOturum();
  const [liste, setListe] = useState<Alarm[] | null>(null);
  const [hepsi, setHepsi] = useState(false);

  useEffect(() => {
    api<Alarm[]>('/alarmlar').then(setListe).catch(() => setListe(null));
  }, [subeId]);

  if (!liste) return null;
  const satirlar = grupla(liste);
  const gosterilen = hepsi ? satirlar : satirlar.slice(0, ILK_GOSTERIM);
  const sayilar = (['kritik', 'ciddi', 'eksik', 'uyari'] as const).map((s) => [s, liste.filter((a) => a.seviye === s).length] as const).filter(([, n]) => n > 0);

  return (
    <section className="kart" aria-label={m.baslik} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="kart-baslik" style={{ marginBottom: 0, flexWrap: 'wrap' }}>
        <h2>{m.baslik}</h2>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {sayilar.map(([s, n]) => <span key={s} className={SINIF[s]}>{n} {m.seviye[s].toLocaleLowerCase('tr')}</span>)}
        </div>
      </div>
      {liste.length === 0 ? (
        <p className="ikincil" style={{ margin: 0 }}>{m.bos}</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {gosterilen.map((a) => {
            const { yol, kim } = hedef(a, ben.kullanici.id);
            return (
              <li key={a.anahtar} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--cizgi-acik)', flexWrap: 'wrap' }}>
                <span className={SINIF[a.seviye]} style={{ minWidth: 60, justifyContent: 'center' }}>{m.seviye[a.seviye]}</span>
                <span style={{ flex: 1, minWidth: 180 }}>
                  <Link href={yol} style={{ fontWeight: 600 }}>{kim}</Link>
                  <span className="ikincil"> · {alarmMetni(a)}</span>
                  {a.askiyaAliyor && <strong style={{ color: 'var(--kritik)' }}> · {m.askida}</strong>}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {satirlar.length > ILK_GOSTERIM && (
        <div>
          <button type="button" className="dugme dugme-sade dugme-kucuk" onClick={() => setHepsi(!hepsi)} aria-expanded={hepsi}>
            {hepsi ? m.daha : m.tumu(satirlar.length)}
          </button>
        </div>
      )}
    </section>
  );
}
