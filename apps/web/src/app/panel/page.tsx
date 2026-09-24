'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { KURUM_SAAT_DILIMI, kurusBicimle } from '@dc/shared';
import { api } from '@/lib/api';
import { KULLANICI_LISTESI_IZINLERI, useOturum } from '@/lib/oturum';
import { metin } from '@/metin';

const m = metin.panel.komuta;

interface Ozet {
  subeId: string | null;
  randevu: { toplam: number; gelen: number; gelmedi: number; bekleniyor: number; salonda: number };
  ortalamaBeklemeDk: number | null;
  bugunCiroKurus: number;
  ciro14Gun: { gun: string; netKurus: number }[];
  alacak: { toplamKurus: number; hastaSayisi: number };
}

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
          {m.hosgeldin(adi)} · {new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: KURUM_SAAT_DILIMI })}
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

      <Gostergeler />
    </>
  );
}

/** Bugünün toplu göstergeleri ve 14 günlük tahsilat grafiği (hasta adı veya tıbbi içerik yok). */
function Gostergeler() {
  const { subeId } = useOturum();
  const [ozet, setOzet] = useState<Ozet | null>(null);

  useEffect(() => {
    api<Ozet>('/komuta/ozet').then(setOzet).catch(() => setOzet(null));
  }, [subeId]);

  const k = m.kartlar;
  const kartlar = [
    { baslik: k.randevu, deger: ozet ? String(ozet.randevu.toplam) : '—', alt: ozet ? k.randevuAlt(ozet.randevu.gelen, ozet.randevu.salonda, ozet.randevu.gelmedi) : k.veriYok },
    { baslik: k.ciro, deger: ozet ? kurusBicimle(ozet.bugunCiroKurus) : '—', alt: k.ciroAlt },
    { baslik: k.alacak, deger: ozet ? kurusBicimle(ozet.alacak.toplamKurus) : '—', alt: ozet ? k.alacakAlt(ozet.alacak.hastaSayisi) : k.veriYok },
    { baslik: k.bekleme, deger: ozet?.ortalamaBeklemeDk != null ? k.dakika(ozet.ortalamaBeklemeDk) : '—', alt: ozet?.ortalamaBeklemeDk != null ? k.beklemeAlt : k.veriYok },
  ];

  return (
    <>
      <section aria-label={m.baslik} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
        {kartlar.map((c) => (
          <div key={c.baslik} className="kart" data-kpi={c.baslik} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="ikincil kucuk">{c.baslik}</span>
            <span style={{ fontSize: 30, fontWeight: 600, color: c.deger === '—' ? '#8c9a9f' : 'var(--gece)', fontVariantNumeric: 'tabular-nums' }}>{c.deger}</span>
            <span className="kucuk ikincil">{c.alt}</span>
          </div>
        ))}
      </section>
      {ozet && <CiroGrafigi seri={ozet.ciro14Gun} tumSubeler={!ozet.subeId} />}
    </>
  );
}

const GUN_KISA = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const gunEtiketi = (gun: string) => GUN_KISA.format(new Date(`${gun}T00:00:00Z`));

/** Tek seri çubuk grafik: bugün mercan, diğer günler petrol; üzerine gelince tutar görünür. */
function CiroGrafigi({ seri, tumSubeler }: { seri: { gun: string; netKurus: number }[]; tumSubeler: boolean }) {
  const [odak, setOdak] = useState<number | null>(null);
  const [tablo, setTablo] = useState(false);
  const G = 960, Y = 220, ALT = 24, UST = 8;
  const enBuyuk = Math.max(1, ...seri.map((s) => s.netKurus));
  const adim = G / seri.length;
  const cubuk = Math.min(28, adim - 8);
  const yuk = (v: number) => (Math.max(0, v) / enBuyuk) * (Y - ALT - UST);
  const secili = odak != null ? seri[odak] : undefined;

  return (
    <section className="kart" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="kart-baslik">
        <div>
          <h2>{m.ciroGrafik}</h2>
          <span className="kucuk ikincil">{m.ciroGrafikAlt}{tumSubeler ? ` · ${m.tumSubelerNotu}` : ''}</span>
        </div>
        <button type="button" className="dugme dugme-ikincil" onClick={() => setTablo((t) => !t)} aria-pressed={tablo}>
          {m.tabloGoster}
        </button>
      </div>
      {tablo ? (
        <table className="tablo">
          <thead><tr><th scope="col">{m.gun}</th><th scope="col" style={{ textAlign: 'right' }}>{m.tutar}</th></tr></thead>
          <tbody>
            {seri.map((s) => (
              <tr key={s.gun}><td>{gunEtiketi(s.gun)}</td><td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{kurusBicimle(s.netKurus)}</td></tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div style={{ position: 'relative' }}>
          <svg viewBox={`0 0 ${G} ${Y}`} width="100%" role="img" aria-label={`${m.ciroGrafik}: ${seri.map((s) => `${gunEtiketi(s.gun)} ${kurusBicimle(s.netKurus)}`).join(', ')}`} onMouseLeave={() => setOdak(null)}>
            <line x1="0" x2={G} y1={Y - ALT} y2={Y - ALT} stroke="var(--cizgi)" strokeWidth="1" />
            {seri.map((s, i) => {
              const h = yuk(s.netKurus);
              const x = i * adim + (adim - cubuk) / 2;
              const bugun = i === seri.length - 1;
              const r = Math.min(4, h);
              return (
                <g key={s.gun} onMouseEnter={() => setOdak(i)}>
                  <rect x={i * adim} y={0} width={adim} height={Y} fill="transparent" />
                  {h > 0 && (
                    <path
                      d={`M${x},${Y - ALT} V${Y - ALT - h + r} Q${x},${Y - ALT - h} ${x + r},${Y - ALT - h} H${x + cubuk - r} Q${x + cubuk},${Y - ALT - h} ${x + cubuk},${Y - ALT - h + r} V${Y - ALT} Z`}
                      fill={bugun ? 'var(--mercan)' : 'var(--petrol)'}
                      opacity={odak == null || odak === i ? 1 : 0.55}
                    />
                  )}
                  {(i % 2 === 1 || bugun) && (
                    <text x={i * adim + adim / 2} y={Y - 6} textAnchor="middle" fontSize="12" fill="var(--ikincil)">{gunEtiketi(s.gun)}</text>
                  )}
                </g>
              );
            })}
          </svg>
          {secili && odak != null && (
            <div
              role="status"
              style={{
                position: 'absolute', top: 0, left: `${((odak + 0.5) / seri.length) * 100}%`, transform: `translateX(${odak > seri.length / 2 ? '-100%' : '0'})`,
                background: 'var(--beyaz)', border: '1px solid var(--cizgi)', borderRadius: 8, padding: '6px 10px', pointerEvents: 'none', whiteSpace: 'nowrap',
                boxShadow: '0 4px 12px rgba(19,35,42,.08)',
              }}
            >
              <div className="kucuk ikincil">{gunEtiketi(secili.gun)}</div>
              <div style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{kurusBicimle(secili.netKurus)}</div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/** Kurumun kullanıma hazır olması için gereken ilk adımlar. */
function Kurulum() {
  const { ben, izinVar } = useOturum();
  const [mesulVar, setMesulVar] = useState<boolean | null>(ben.roller.some((r) => r.rolKodu === 'mesul_mudur') || null);
  const [kullaniciSayisi, setKullaniciSayisi] = useState<number | null>(null);
  const kullaniciYonetimi = KULLANICI_LISTESI_IZINLERI.some(izinVar);
  const fiyatYonetimi = izinVar('fiyat.yonet') || izinVar('fiyat.onayla');
  const [hizmetVar, setHizmetVar] = useState(false);

  useEffect(() => {
    if (!fiyatYonetimi) return;
    api<{ aktif: boolean }[]>('/hizmetler')
      .then((liste) => setHizmetVar(liste.some((h) => h.aktif)))
      .catch(() => undefined);
  }, [fiyatYonetimi]);

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
    { ad: mesulVar ? m.adimMesulTamam : m.adimMesul, tamam: mesulVar === true, yol: '/panel/kullanicilar', izinli: kullaniciYonetimi },
    { ad: m.adimEkip, tamam: (kullaniciSayisi ?? 0) > 1, yol: '/panel/kullanicilar', izinli: kullaniciYonetimi },
    { ad: m.adimFiyat, tamam: hizmetVar, yol: '/panel/finans', izinli: fiyatYonetimi },
    { ad: m.adimBelge, tamam: false, yol: undefined, izinli: false },
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
            {a.yol && !a.tamam && a.izinli ? <Link href={a.yol}>{a.ad}</Link> : <span className={a.tamam ? 'ikincil' : undefined}>{a.ad}</span>}
            {!a.yol && <span className="rozet" style={{ marginLeft: 'auto' }}>{metin.genel.yakinda}</span>}
            <span className="gizli">{a.tamam ? '(tamamlandı)' : '(bekliyor)'}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
