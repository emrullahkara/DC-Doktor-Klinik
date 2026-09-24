'use client';

import { HAYVAN_TURLERI, type HayvanTuru, RANDEVU_TURLERI, type RandevuTuru } from '@dc/shared';
import Link from 'next/link';
import { type FormEvent, useEffect, useState } from 'react';
import { Alan } from '@/bilesenler/Alan';
import { api, hataMesaji } from '@/lib/api';
import { tarihBicimle } from '@/lib/bicim';
import { metin } from '@/metin';
import type { HastaOzeti } from '../hastalar/page';
import type { Takvim } from './tipler';

const m = metin.randevular;
const SURELER = [10, 15, 20, 30, 45, 60, 90, 120];

interface Props {
  takvim: Takvim;
  baslangic: { hekimId: string; dakika: number } | null;
  kapat: () => void;
  kaydedildi: () => Promise<void>;
}

export function YeniRandevu({ takvim, baslangic, kapat, kaydedildi }: Props) {
  const veteriner = takvim.sube.kurumTipleri.includes('veteriner');
  const [sorgu, setSorgu] = useState('');
  const [sonuclar, setSonuclar] = useState<HastaOzeti[]>([]);
  const [hasta, setHasta] = useState<HastaOzeti | null>(null);
  const [hayvanlar, setHayvanlar] = useState<{ id: string; ad: string; tur: HayvanTuru }[]>([]);
  const [hayvanId, setHayvanId] = useState('');
  const [hekimId, setHekimId] = useState(baslangic?.hekimId ?? takvim.hekimler[0]?.id ?? '');
  const [kaynakId, setKaynakId] = useState('');
  const baslangicDakika = baslangic?.dakika ?? 9 * 60;
  const [saat, setSaat] = useState(`${String(Math.floor(baslangicDakika / 60)).padStart(2, '0')}:${String(baslangicDakika % 60).padStart(2, '0')}`);
  const [sure, setSure] = useState(30);
  const [tur, setTur] = useState<RandevuTuru>(veteriner ? 'asi' : 'ilk_muayene');
  const [notlar, setNotlar] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  useEffect(() => {
    if (baslangic) {
      setHekimId(baslangic.hekimId);
      setSaat(`${String(Math.floor(baslangic.dakika / 60)).padStart(2, '0')}:${String(baslangic.dakika % 60).padStart(2, '0')}`);
    }
  }, [baslangic]);

  useEffect(() => {
    if (hasta || sorgu.trim().length < 2) {
      setSonuclar([]);
      return;
    }
    const z = setTimeout(() => {
      api<HastaOzeti[]>(`/hastalar?q=${encodeURIComponent(sorgu.trim())}`).then(setSonuclar).catch(() => setSonuclar([]));
    }, 300);
    return () => clearTimeout(z);
  }, [sorgu, hasta]);

  useEffect(() => {
    if (!hasta || !veteriner) return;
    api<{ hayvanlar: { id: string; ad: string; tur: HayvanTuru }[] }>(`/hastalar/${hasta.id}`)
      .then((kart) => {
        setHayvanlar(kart.hayvanlar);
        setHayvanId(kart.hayvanlar[0]?.id ?? '');
      })
      .catch((h) => setHata(hataMesaji(h)));
  }, [hasta, veteriner]);

  async function gonder(olay: FormEvent) {
    olay.preventDefault();
    if (!hasta) return;
    setHata(null);
    setGonderiliyor(true);
    try {
      await api('/randevular', {
        yontem: 'POST',
        govde: {
          kisiId: hasta.id,
          hayvanId: veteriner ? hayvanId || undefined : undefined,
          hekimId,
          kaynakId: kaynakId || undefined,
          baslangic: `${takvim.tarih}T${saat}:00+03:00`,
          sureDakika: sure,
          tur,
          notlar,
        },
      });
      await kaydedildi();
    } catch (h) {
      setHata(hataMesaji(h));
      setGonderiliyor(false);
    }
  }

  const hazir = hasta && hekimId && saat && (!veteriner || hayvanId);

  return (
    <form className="kart" onSubmit={gonder} aria-label={m.form.baslik} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="kart-baslik" style={{ marginBottom: 0 }}>
        <h2>{m.form.baslik}</h2>
        <button type="button" className="dugme dugme-sade dugme-kucuk" onClick={kapat}>{m.kapat}</button>
      </div>
      <span className="kucuk ikincil">{tarihBicimle(takvim.tarih)} · {takvim.sube.ad}</span>

      {hasta ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 12, background: 'var(--nane-acik)', border: '1px solid var(--nane)' }}>
          <span style={{ flex: 1 }}>
            <strong>{hasta.ad} {hasta.soyad}</strong>
            <span className="kucuk ikincil" style={{ display: 'block' }}>{hasta.kimlikNoMaske ?? tarihBicimle(hasta.dogumTarihi)}</span>
          </span>
          <button type="button" className="dugme dugme-sade dugme-kucuk" onClick={() => { setHasta(null); setHayvanlar([]); }}>{m.form.hastaDegistir}</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Alan etiket={m.form.hasta} ipucu={m.form.hastaAra}>
            <input type="search" value={sorgu} onChange={(e) => setSorgu(e.target.value)} autoComplete="off" autoFocus />
          </Alan>
          {sonuclar.length > 0 && (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, border: '1px solid var(--cizgi)', borderRadius: 12, maxHeight: 220, overflowY: 'auto' }}>
              {sonuclar.map((h) => (
                <li key={h.id}>
                  <button type="button" onClick={() => setHasta(h)} style={{ width: '100%', textAlign: 'left', padding: '10px 12px', border: 'none', borderBottom: '1px solid var(--cizgi-acik)', background: 'var(--beyaz)', font: 'inherit', cursor: 'pointer', minHeight: 44 }}>
                    <strong>{h.ad} {h.soyad}</strong> <span className="kucuk ikincil">{tarihBicimle(h.dogumTarihi)} · {h.kimlikNoMaske ?? ''}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Link href="/panel/hastalar/yeni" className="kucuk">{m.form.yeniHasta}</Link>
        </div>
      )}

      {veteriner && hasta && (
        hayvanlar.length === 0 ? (
          <div className="kutu kutu-uyari">{m.form.hayvanYok}</div>
        ) : (
          <Alan etiket={m.form.hayvan}>
            <select value={hayvanId} onChange={(e) => setHayvanId(e.target.value)}>
              {hayvanlar.map((h) => <option key={h.id} value={h.id}>{h.ad} ({HAYVAN_TURLERI[h.tur] ?? h.tur})</option>)}
            </select>
          </Alan>
        )
      )}

      <Alan etiket={m.hekim}>
        <select value={hekimId} onChange={(e) => setHekimId(e.target.value)}>
          {takvim.hekimler.map((h) => <option key={h.id} value={h.id}>{h.adSoyad}</option>)}
        </select>
      </Alan>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
        <Alan etiket={m.saat}><input type="time" value={saat} step={300} onChange={(e) => setSaat(e.target.value)} required /></Alan>
        <Alan etiket={m.sure}>
          <select value={sure} onChange={(e) => setSure(Number(e.target.value))}>
            {SURELER.map((s) => <option key={s} value={s}>{m.dakika(s)}</option>)}
          </select>
        </Alan>
      </div>
      <Alan etiket={m.kaynak}>
        <select value={kaynakId} onChange={(e) => setKaynakId(e.target.value)}>
          <option value="">{m.kaynakYok}</option>
          {takvim.kaynaklar.map((k) => <option key={k.id} value={k.id}>{k.ad}</option>)}
        </select>
      </Alan>
      <Alan etiket={m.tur}>
        <select value={tur} onChange={(e) => setTur(e.target.value as RandevuTuru)}>
          {Object.entries(RANDEVU_TURLERI).map(([k, a]) => <option key={k} value={k}>{a}</option>)}
        </select>
      </Alan>
      <Alan etiket={m.not}><input value={notlar} onChange={(e) => setNotlar(e.target.value)} maxLength={500} /></Alan>

      {hata && <div className="kutu kutu-hata" role="alert">{hata}</div>}
      <button type="submit" className="dugme" disabled={!hazir || gonderiliyor}>{gonderiliyor ? metin.genel.yukleniyor : m.form.kaydet}</button>
    </form>
  );
}
