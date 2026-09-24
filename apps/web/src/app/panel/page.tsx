'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { KULLANICI_LISTESI_IZINLERI, useOturum } from '@/lib/oturum';
import { metin } from '@/metin';

const m = metin.panel.komuta;

interface ListeKullanici {
  id: string;
  roller: { rolKodu: string }[];
}

export default function KomutaMerkezi() {
  const { ben, izinVar } = useOturum();
  // “Dr.”, “Uzm.”, “Prof.” gibi unvanlar atlanır
  const adi = ben.kullanici.adSoyad.split(/\s+/).find((p) => !p.endsWith('.')) ?? ben.kullanici.adSoyad;

  if (!izinVar('komuta.goruntule')) {
    return (
      <>
        <h1>{m.hosgeldin(adi)}</h1>
        <div className="kart" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2>{m.rolleriniz}</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {ben.roller.map((r) => (
              <span key={`${r.rolKodu}-${r.subeId}`} className="cip">
                {r.ad} · {r.subeId ? (ben.subeler.find((s) => s.id === r.subeId)?.ad ?? '') : metin.genel.tumSubeler}
              </span>
            ))}
          </div>
          <p className="ikincil" style={{ margin: 0 }}>{m.yetkisiz}</p>
        </div>
      </>
    );
  }

  return (
    <>
      <div>
        <h1>{m.baslik}</h1>
        <p className="ikincil" style={{ margin: '2px 0 0' }}>
          {m.hosgeldin(adi)} · {new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
        <div className="kart" style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <svg width="112" height="112" viewBox="0 0 132 132" aria-hidden="true">
            <circle cx="66" cy="66" r="54" fill="none" stroke="#E7EFEC" strokeWidth="12" />
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <h2>{m.skor}</h2>
            <span className="ikincil kucuk">{m.skorBos}</span>
          </div>
        </div>
        <Kurulum />
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
        {[m.kartlar.randevu, m.kartlar.ciro, m.kartlar.alacak, m.kartlar.bekleme].map((baslik) => (
          <div key={baslik} className="kart" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="ikincil kucuk">{baslik}</span>
            <span style={{ fontSize: 30, fontWeight: 600, color: '#8c9a9f' }}>—</span>
            <span className="kucuk ikincil">{m.kartlar.veriYok}</span>
          </div>
        ))}
      </section>
    </>
  );
}

/** Kurumun kullanıma hazır olması için gereken ilk adımlar. */
function Kurulum() {
  const { ben, izinVar } = useOturum();
  const [mesulVar, setMesulVar] = useState<boolean | null>(ben.roller.some((r) => r.rolKodu === 'mesul_mudur') || null);
  const [kullaniciSayisi, setKullaniciSayisi] = useState<number | null>(null);
  const kullaniciYonetimi = KULLANICI_LISTESI_IZINLERI.some(izinVar);

  useEffect(() => {
    if (!kullaniciYonetimi) return;
    api<ListeKullanici[]>('/kullanicilar')
      .then((liste) => {
        setMesulVar(liste.some((k) => k.roller.some((r) => r.rolKodu === 'mesul_mudur')));
        setKullaniciSayisi(liste.length);
      })
      .catch(() => undefined);
  }, [kullaniciYonetimi]);

  const adimlar = [
    { ad: mesulVar ? m.adimMesulTamam : m.adimMesul, tamam: mesulVar === true, yol: '/panel/kullanicilar' },
    { ad: m.adimEkip, tamam: (kullaniciSayisi ?? 0) > 1, yol: '/panel/kullanicilar' },
    { ad: m.adimFiyat, tamam: false },
    { ad: m.adimBelge, tamam: false },
  ];

  return (
    <div className="kart">
      <div className="kart-baslik">
        <h2>{m.kurulum}</h2>
        <span className="kucuk ikincil">{m.kurulumAlt}</span>
      </div>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {adimlar.map((a) => (
          <li key={a.ad} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              aria-hidden="true"
              style={{
                width: 22, height: 22, borderRadius: 11, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                background: a.tamam ? 'var(--yolunda)' : 'transparent', border: a.tamam ? 'none' : '2px solid #8c9a9f',
              }}
            >
              {a.tamam && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
              )}
            </span>
            {a.yol && !a.tamam && kullaniciYonetimi ? <Link href={a.yol}>{a.ad}</Link> : <span className={a.tamam ? 'ikincil' : undefined}>{a.ad}</span>}
            {!a.yol && <span className="rozet" style={{ marginLeft: 'auto' }}>{metin.genel.yakinda}</span>}
            <span className="gizli">{a.tamam ? '(tamamlandı)' : '(bekliyor)'}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
