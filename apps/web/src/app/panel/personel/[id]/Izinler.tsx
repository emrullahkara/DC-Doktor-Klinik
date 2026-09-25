'use client';

import { IZIN_TURLERI, type IzinTuru } from '@dc/shared';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Alan } from '@/bilesenler/Alan';
import { api, hataMesaji } from '@/lib/api';
import { tarihBicimle } from '@/lib/bicim';
import { metin } from '@/metin';

const m = metin.izinler;

interface Izin {
  id: string;
  tur: IzinTuru;
  baslangic: string;
  bitis: string;
  aciklama: string;
  iptalZamani: string | null;
}

/** Personel izinleri: izinli günlere nöbet/vardiya verilemez. */
export function Izinler({ kullaniciId, yonetebilir }: { kullaniciId: string; yonetebilir: boolean }) {
  const [liste, setListe] = useState<Izin[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [tur, setTur] = useState<IzinTuru>('yillik');
  const [baslangic, setBaslangic] = useState('');
  const [bitis, setBitis] = useState('');
  const [aciklama, setAciklama] = useState('');

  const yukle = useCallback(async () => {
    try {
      setListe(await api<Izin[]>(`/personel/${kullaniciId}/izinler`));
    } catch (h) {
      setHata(hataMesaji(h));
    }
  }, [kullaniciId]);

  useEffect(() => {
    void yukle();
  }, [yukle]);

  async function islem(is: () => Promise<unknown>) {
    setHata(null);
    try {
      await is();
      await yukle();
      return true;
    } catch (h) {
      setHata(hataMesaji(h));
      return false;
    }
  }

  async function ekle(olay: FormEvent) {
    olay.preventDefault();
    if (await islem(() => api(`/personel/${kullaniciId}/izinler`, { yontem: 'POST', govde: { tur, baslangic, bitis, aciklama } }))) {
      setBaslangic(''); setBitis(''); setAciklama('');
    }
  }

  return (
    <section className="kart" aria-label={m.baslik} style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: '1 1 300px', minWidth: 0 }}>
      <h2>{m.baslik}</h2>
      {hata && <div className="kutu kutu-hata" role="alert">{hata}</div>}
      {liste && liste.length === 0 && <p className="ikincil kucuk" style={{ margin: 0 }}>{m.yok}</p>}
      {liste && liste.length > 0 && (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {liste.map((i) => (
            <li key={i.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--cizgi-acik)', opacity: i.iptalZamani ? 0.6 : 1 }}>
              <span style={{ flex: 1 }}>
                <strong style={{ fontWeight: 600 }}>{IZIN_TURLERI[i.tur]}</strong>{' '}
                <span className="ikincil">{tarihBicimle(i.baslangic)} – {tarihBicimle(i.bitis)}</span>
                {i.aciklama && <span className="kucuk ikincil" style={{ display: 'block' }}>{i.aciklama}</span>}
              </span>
              {i.iptalZamani ? (
                <span className="rozet">{m.iptalEdildi}</span>
              ) : (
                yonetebilir && <button type="button" className="dugme dugme-sade dugme-kucuk" onClick={() => void islem(() => api(`/izinler/${i.id}/iptal`, { yontem: 'POST' }))}>{m.iptal}</button>
              )}
            </li>
          ))}
        </ul>
      )}
      {yonetebilir && (
        <form onSubmit={(e) => void ekle(e)} aria-label={m.ekle} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, alignItems: 'end' }}>
          <Alan etiket={m.tur}>
            <select value={tur} onChange={(e) => setTur(e.target.value as IzinTuru)}>
              {Object.entries(IZIN_TURLERI).map(([k, a]) => <option key={k} value={k}>{a}</option>)}
            </select>
          </Alan>
          <Alan etiket={m.baslangic}><input type="date" value={baslangic} onChange={(e) => setBaslangic(e.target.value)} required /></Alan>
          <Alan etiket={m.bitis}><input type="date" value={bitis} onChange={(e) => setBitis(e.target.value)} min={baslangic || undefined} required /></Alan>
          <Alan etiket={m.aciklama}><input value={aciklama} onChange={(e) => setAciklama(e.target.value)} maxLength={300} /></Alan>
          <button type="submit" className="dugme dugme-ikincil dugme-kucuk" disabled={!baslangic || !bitis}>{m.ekle}</button>
        </form>
      )}
    </section>
  );
}
