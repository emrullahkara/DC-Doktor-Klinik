'use client';

import { OLAY_DURUMLARI, OLAY_SIDDETLERI, OLAY_TURLERI, type OlayDurumu, type OlaySiddeti, type OlayTuru } from '@dc/shared';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Alan } from '@/bilesenler/Alan';
import { api, ApiHatasi, hataMesaji } from '@/lib/api';
import { tarihBicimle } from '@/lib/bicim';
import { metin } from '@/metin';

const m = metin.kalite;

/** datetime-local için şimdiki Türkiye saati (YYYY-AA-GGTSS:DD) */
const simdi = () => new Date(Date.now() + 3 * 3_600_000).toISOString().slice(0, 16);

/** Herkese açık olay bildirimi, takip kodu sorgusu ve isimli bildirimlerim. */
export function OlayBildir() {
  const [tur, setTur] = useState<OlayTuru>('ramak_kala');
  const [siddet, setSiddet] = useState<OlaySiddeti>('zarar_yok');
  const [zaman, setZaman] = useState(simdi);
  const [yer, setYer] = useState('');
  const [aciklama, setAciklama] = useState('');
  const [ilkMudahale, setIlkMudahale] = useState('');
  const [isimsiz, setIsimsiz] = useState(false);
  const [sonuc, setSonuc] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [alan, setAlan] = useState<Record<string, string>>({});
  const [benim, setBenim] = useState<{ id: string; takipKodu: string; tur: OlayTuru; durum: OlayDurumu; zaman: string }[]>([]);
  const [kod, setKod] = useState('');
  const [takip, setTakip] = useState<string | null>(null);

  const yukle = useCallback(() => {
    api<typeof benim>('/olaylarim').then(setBenim).catch(() => undefined);
  }, []);
  useEffect(yukle, [yukle]);

  async function gonder(olay: FormEvent) {
    olay.preventDefault();
    setHata(null);
    setAlan({});
    try {
      const y = await api<{ takipKodu: string }>('/olaylar', { yontem: 'POST', govde: { tur, siddet, olayZamani: new Date(`${zaman}:00+03:00`).toISOString(), yer, aciklama, ilkMudahale, isimsiz } });
      setSonuc(y.takipKodu);
      setAciklama(''); setIlkMudahale(''); setYer(''); setIsimsiz(false); setZaman(simdi());
      yukle();
    } catch (h) {
      setHata(hataMesaji(h));
      if (h instanceof ApiHatasi) setAlan(h.alanHatalari());
    }
  }

  async function sorgula(olay: FormEvent) {
    olay.preventDefault();
    try {
      const y = await api<{ durum: OlayDurumu }>(`/olaylar/takip/${encodeURIComponent(kod.trim())}`);
      setTakip(m.takipSonuc(OLAY_DURUMLARI[y.durum]));
    } catch (h) {
      setTakip(hataMesaji(h));
    }
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
      <form onSubmit={(e) => void gonder(e)} aria-label={m.bildir} className="kart" style={{ flex: '2 1 480px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2>{m.bildir}</h2>
        <p className="ikincil kucuk" style={{ margin: 0 }}>{m.bildirAciklama}</p>
        {sonuc && (
          <div className="kutu kutu-basari" role="status" style={{ flexDirection: 'column', gap: 4 }}>
            <strong>{m.gonderildi(sonuc)}</strong>
            <span>{m.kodNot}</span>
          </div>
        )}
        {hata && <div className="kutu kutu-hata" role="alert">{hata}</div>}
        <div className="form-izgara">
          <Alan etiket={m.tur}>
            <select value={tur} onChange={(e) => setTur(e.target.value as OlayTuru)}>{Object.entries(OLAY_TURLERI).map(([k, a]) => <option key={k} value={k}>{a}</option>)}</select>
          </Alan>
          <Alan etiket={m.siddet}>
            <select value={siddet} onChange={(e) => setSiddet(e.target.value as OlaySiddeti)}>{Object.entries(OLAY_SIDDETLERI).map(([k, a]) => <option key={k} value={k}>{a}</option>)}</select>
          </Alan>
          <Alan etiket={m.zaman}><input type="datetime-local" value={zaman} onChange={(e) => setZaman(e.target.value)} required /></Alan>
          <Alan etiket={m.yer}><input value={yer} onChange={(e) => setYer(e.target.value)} maxLength={120} /></Alan>
          <Alan etiket={m.olayAciklama} hata={alan.aciklama} genis><textarea rows={4} value={aciklama} onChange={(e) => setAciklama(e.target.value)} minLength={10} required style={{ padding: 12 }} /></Alan>
          <Alan etiket={m.ilkMudahale} genis><input value={ilkMudahale} onChange={(e) => setIlkMudahale(e.target.value)} maxLength={1000} /></Alan>
        </div>
        <div style={{ padding: 12, borderRadius: 12, background: 'var(--nane-acik)' }}>
          <label style={{ display: 'flex', gap: 10, alignItems: 'center', minHeight: 32 }}>
            <input type="checkbox" checked={isimsiz} onChange={(e) => setIsimsiz(e.target.checked)} style={{ width: 22, height: 22 }} aria-describedby="isimsiz-ipucu" />
            <strong>{m.isimsiz}</strong>
          </label>
          <span id="isimsiz-ipucu" className="kucuk ikincil" style={{ display: 'block', marginLeft: 32 }}>{m.isimsizIpucu}</span>
        </div>
        <div><button type="submit" className="dugme" disabled={aciklama.trim().length < 10}>{m.gonder}</button></div>
      </form>

      <div style={{ flex: '1 1 280px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <section className="kart" aria-label={m.takip} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h2 style={{ fontSize: 16 }}>{m.takip}</h2>
          <form onSubmit={(e) => void sorgula(e)} style={{ display: 'flex', gap: 8, alignItems: 'end' }}>
            <div style={{ flex: 1 }}><Alan etiket={m.takipKodu}><input value={kod} onChange={(e) => setKod(e.target.value.toUpperCase())} maxLength={8} className="mono" required /></Alan></div>
            <button type="submit" className="dugme dugme-sade dugme-kucuk">{m.sorgula}</button>
          </form>
          {takip && <p role="status" style={{ margin: 0 }}>{takip}</p>}
        </section>
        <section className="kart" aria-label={m.bildirimlerim}>
          <h2 style={{ fontSize: 16, marginBottom: 8 }}>{m.bildirimlerim}</h2>
          {benim.length === 0 ? (
            <p className="ikincil kucuk" style={{ margin: 0 }}>{m.bildirimYok}</p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {benim.map((b) => (
                <li key={b.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--cizgi-acik)' }}>
                  <strong style={{ fontWeight: 600 }}>{OLAY_TURLERI[b.tur]}</strong>
                  <span className="kucuk ikincil" style={{ display: 'block' }}>{tarihBicimle(b.zaman)} · <span className="mono">{b.takipKodu}</span> · {OLAY_DURUMLARI[b.durum]}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
