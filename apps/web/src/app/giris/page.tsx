'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { Alan } from '@/bilesenler/Alan';
import { GirisDuzeni } from '@/bilesenler/GirisDuzeni';
import { api, hataMesaji } from '@/lib/api';
import { metin } from '@/metin';

const m = metin.giris;

export default function GirisSayfasi() {
  const router = useRouter();
  const [eposta, setEposta] = useState('');
  const [parola, setParola] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  async function gonder(olay: FormEvent) {
    olay.preventDefault();
    setHata(null);
    setGonderiliyor(true);
    try {
      await api('/kimlik/giris', { yontem: 'POST', govde: { eposta, parola } });
      router.replace('/panel');
    } catch (h) {
      setHata(hataMesaji(h));
      setGonderiliyor(false);
    }
  }

  return (
    <GirisDuzeni>
      <form onSubmit={gonder} className="kart" style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 18, padding: 28 }}>
        <div>
          <h1>{m.baslik}</h1>
          <p className="ikincil" style={{ margin: '4px 0 0' }}>{m.altBaslik}</p>
        </div>
        {hata && <div className="kutu kutu-hata" role="alert">{hata}</div>}
        <Alan etiket={m.eposta}>
          <input type="email" autoComplete="username" required value={eposta} onChange={(e) => setEposta(e.target.value)} />
        </Alan>
        <Alan etiket={m.parola}>
          <input type="password" autoComplete="current-password" required value={parola} onChange={(e) => setParola(e.target.value)} />
        </Alan>
        <button type="submit" className="dugme" disabled={gonderiliyor}>
          {gonderiliyor ? metin.genel.yukleniyor : m.dugme}
        </button>
        <p className="kucuk ikincil" style={{ margin: 0, textAlign: 'center' }}>
          {m.hesabinYokMu} <Link href="/kayit">{m.kayitOl}</Link>
        </p>
      </form>
    </GirisDuzeni>
  );
}
