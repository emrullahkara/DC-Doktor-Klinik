'use client';

import { GOREV_TURLERI, type GorevTuru } from '@dc/shared';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { saatBicimle, tarihBicimle } from '@/lib/bicim';
import { metin } from '@/metin';

const m = metin.nobet;

interface Gorev {
  id: string;
  tur: GorevTuru;
  baslangic: string;
  bitis: string;
  sube: string;
}

/** Kişinin yayındaki çizelgelerde önümüzdeki 30 günlük görevleri. */
export function Gorevlerim() {
  const [liste, setListe] = useState<Gorev[] | null>(null);

  useEffect(() => {
    api<Gorev[]>('/gorevlerim').then(setListe).catch(() => setListe(null));
  }, []);

  if (!liste) return null;
  return (
    <section className="kart" aria-label={m.gorevlerim} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <h2>{m.gorevlerim}</h2>
      {liste.length === 0 ? (
        <p className="ikincil" style={{ margin: 0 }}>{m.gorevlerimBos}</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {liste.slice(0, 8).map((g) => (
            <li key={g.id} style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--cizgi-acik)', flexWrap: 'wrap' }}>
              <span className="mono" style={{ minWidth: 90 }}>{tarihBicimle(g.baslangic)}</span>
              <strong>{GOREV_TURLERI[g.tur].ad}</strong>
              <span className="ikincil">{saatBicimle(g.baslangic)}–{saatBicimle(g.bitis)} · {g.sube}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
