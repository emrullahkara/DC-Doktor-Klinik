'use client';

import type { AlarmSeviyesi } from '@dc/shared';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useOturum } from '@/lib/oturum';
import { metin } from '@/metin';

const m = metin.alarmlar;
const ILK_GOSTERIM = 6;

interface Alarm {
  anahtar: string;
  kapsam: 'personel' | 'kurum';
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

function alarmMetni(a: Satir): string {
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
            const yol = a.kapsam === 'kurum' ? '/panel/belgeler' : `/panel/personel/${a.kullaniciId}`;
            const kim = a.kapsam === 'kurum' ? a.sube ?? metin.kurumBelgeleri.tumIsletme : a.kullaniciId === ben.kullanici.id ? metin.personel.kendiKartim : a.kisi;
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
