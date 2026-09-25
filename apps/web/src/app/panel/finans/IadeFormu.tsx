'use client';

import { type FormEvent, useState } from 'react';
import { Alan } from '@/bilesenler/Alan';
import { api, hataMesaji } from '@/lib/api';
import { metin } from '@/metin';

const m = metin.finans;

export function IadeFormu({ tahsilatId, bitti }: { tahsilatId: string; bitti: () => Promise<void> }) {
  const [tutar, setTutar] = useState('');
  const [neden, setNeden] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  async function gonder(olay: FormEvent) {
    olay.preventDefault();
    setHata(null);
    try {
      await api(`/tahsilatlar/${tahsilatId}/iade`, { yontem: 'POST', govde: { tutarTl: Number(tutar.replace(',', '.')), neden } });
      await bitti();
    } catch (h) {
      setHata(hataMesaji(h));
    }
  }
  return (
    <form onSubmit={gonder} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,2fr) auto', gap: 8, alignItems: 'end' }}>
      <Alan etiket={m.iadeTutari}><input inputMode="decimal" value={tutar} onChange={(e) => setTutar(e.target.value)} required /></Alan>
      <Alan etiket={m.iadeNedeni}><input value={neden} onChange={(e) => setNeden(e.target.value)} minLength={3} required /></Alan>
      <button type="submit" className="dugme dugme-kucuk" disabled={!tutar || neden.trim().length < 3}>{m.iadeYap}</button>
      {hata && <div className="kutu kutu-hata" role="alert" style={{ gridColumn: '1 / -1' }}>{hata}</div>}
    </form>
  );
}

