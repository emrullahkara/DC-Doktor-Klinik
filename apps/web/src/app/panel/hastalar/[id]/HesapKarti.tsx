'use client';

import { INDIRIM_ONAY_ESIGI_YUZDE, kalemTutari, kurusBicimle, ODEME_TURLERI, type OdemeTuru } from '@dc/shared';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Alan } from '@/bilesenler/Alan';
import { api, hataMesaji } from '@/lib/api';
import { saatBicimle, tarihBicimle } from '@/lib/bicim';
import { useOturum } from '@/lib/oturum';
import { metin } from '@/metin';
import { IadeFormu } from '../../finans/IadeFormu';
import type { Hizmet } from '../../finans/page';

const m = metin.finans;

interface Hesap {
  kalemler: { id: string; ad: string; adet: number; birimFiyatKurus: number; indirimYuzde: number; indirimKurus: number; indirimNedeni: string | null; tutarKurus: number; zaman: string; iptalZamani: string | null; iptalNedeni: string | null }[];
  tahsilatlar: { id: string; tutarKurus: number; odemeTuru: OdemeTuru; aciklama: string; iadeEdilenId: string | null; alanId: string; alan: string; zaman: string }[];
  borcKurus: number;
  odenenKurus: number;
  bakiyeKurus: number;
}

/** Hasta kartındaki hesap: hizmetler, ödemeler, bakiye; hizmet ekleme, tahsilat, iptal ve iade. */
export function HesapKarti({ hastaId }: { hastaId: string }) {
  const { ben, izinVar, subeId } = useOturum();
  const [hesap, setHesap] = useState<Hesap | null>(null);
  const [hizmetler, setHizmetler] = useState<Hizmet[]>([]);
  const [hata, setHata] = useState<string | null>(null);
  const [iadeId, setIadeId] = useState<string | null>(null);
  const [iptalId, setIptalId] = useState<string | null>(null);
  const tahsilatYetkisi = izinVar('finans.tahsilat') && !!subeId;
  const yonetici = izinVar('finans.iade.onayla');

  const yukle = useCallback(async () => {
    try {
      setHesap(await api<Hesap>(`/hastalar/${hastaId}/hesap`));
    } catch (h) {
      setHata(hataMesaji(h));
    }
  }, [hastaId]);

  useEffect(() => {
    void yukle();
    if (izinVar('finans.tahsilat')) api<Hizmet[]>('/hizmetler').then((l) => setHizmetler(l.filter((h) => h.aktif))).catch(() => undefined);
  }, [yukle, izinVar]);

  async function islem(is: () => Promise<unknown>) {
    setHata(null);
    try {
      await is();
      await yukle();
    } catch (h) {
      setHata(hataMesaji(h));
    }
  }

  if (!hesap) return <section className="kart">{hata ?? metin.genel.yukleniyor}</section>;
  const avans = hesap.bakiyeKurus < 0;

  return (
    <section className="kart" aria-label={m.hesap} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2>{m.hesap}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
        <Ozet ad={m.borc} deger={kurusBicimle(hesap.borcKurus)} />
        <Ozet ad={m.odenen} deger={kurusBicimle(hesap.odenenKurus)} />
        <Ozet ad={avans ? m.avans : m.bakiye} deger={kurusBicimle(Math.abs(hesap.bakiyeKurus))} vurgu={hesap.bakiyeKurus > 0} />
      </div>
      {hata && <div className="kutu kutu-hata" role="alert">{hata}</div>}

      <strong className="kucuk">{m.kalemler}</strong>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {hesap.kalemler.map((k) => (
          <li key={k.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--cizgi-acik)', display: 'flex', flexDirection: 'column', gap: 6, opacity: k.iptalZamani ? 0.6 : 1 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ flex: 1, textDecoration: k.iptalZamani ? 'line-through' : undefined }}>
                {k.ad}{k.adet > 1 && ` × ${k.adet}`}
                <span className="kucuk ikincil" style={{ display: 'block' }}>
                  {tarihBicimle(k.zaman)}{k.indirimKurus > 0 && ` · %${k.indirimYuzde} indirim (${k.indirimNedeni})`}
                  {k.iptalZamani && ` · ${m.iptalEdildi}: ${k.iptalNedeni}`}
                </span>
              </span>
              <strong>{kurusBicimle(k.tutarKurus)}</strong>
              {yonetici && !k.iptalZamani && <button type="button" className="dugme dugme-sade dugme-kucuk" onClick={() => setIptalId(iptalId === k.id ? null : k.id)}>{m.iptal}</button>}
            </div>
            {iptalId === k.id && <IptalFormu gonder={(neden) => islem(async () => { await api(`/hastalar/${hastaId}/hesap/kalemler/${k.id}/iptal`, { yontem: 'POST', govde: { neden } }); setIptalId(null); })} />}
          </li>
        ))}
      </ul>

      {tahsilatYetkisi && <KalemEkle hizmetler={hizmetler} ekle={(g) => islem(() => api(`/hastalar/${hastaId}/hesap/kalemler`, { yontem: 'POST', govde: g }))} />}

      <strong className="kucuk">{m.tahsilatlar}</strong>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {hesap.tahsilatlar.map((t) => (
          <li key={t.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--cizgi-acik)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ flex: 1 }}>
                {t.tutarKurus < 0 ? m.iade : ODEME_TURLERI[t.odemeTuru]}
                <span className="kucuk ikincil" style={{ display: 'block' }}>{tarihBicimle(t.zaman)} {saatBicimle(t.zaman)} · {t.alan}{t.aciklama && ` · ${t.aciklama}`}</span>
              </span>
              <strong style={{ color: t.tutarKurus < 0 ? 'var(--kritik)' : undefined }}>{kurusBicimle(t.tutarKurus)}</strong>
              {yonetici && subeId && t.tutarKurus > 0 && t.alanId !== ben.kullanici.id && (
                <button type="button" className="dugme dugme-sade dugme-kucuk" onClick={() => setIadeId(iadeId === t.id ? null : t.id)}>{m.iadeYap}</button>
              )}
            </div>
            {iadeId === t.id && <IadeFormu tahsilatId={t.id} bitti={async () => { setIadeId(null); await yukle(); }} />}
          </li>
        ))}
      </ul>

      {tahsilatYetkisi && <TahsilatFormu varsayilanKurus={Math.max(hesap.bakiyeKurus, 0)} al={(g) => islem(() => api(`/hastalar/${hastaId}/tahsilatlar`, { yontem: 'POST', govde: g }))} />}
      <span className="kucuk ikincil">{m.faturaNot}</span>
    </section>
  );
}

function Ozet({ ad, deger, vurgu }: { ad: string; deger: string; vurgu?: boolean }) {
  return (
    <div style={{ padding: '10px 12px', borderRadius: 10, background: vurgu ? 'var(--uyari-zemin)' : '#f9f8f4', border: '1px solid var(--cizgi-acik)' }}>
      <span className="kucuk ikincil" style={{ display: 'block' }}>{ad}</span>
      <strong style={{ fontSize: 17 }}>{deger}</strong>
    </div>
  );
}

function IptalFormu({ gonder }: { gonder: (neden: string) => void }) {
  const [neden, setNeden] = useState('');
  return (
    <form onSubmit={(e) => { e.preventDefault(); gonder(neden); }} style={{ display: 'flex', gap: 8, alignItems: 'end' }}>
      <div style={{ flex: 1 }}><Alan etiket={m.iptalNedeni}><input value={neden} onChange={(e) => setNeden(e.target.value)} minLength={3} required /></Alan></div>
      <button type="submit" className="dugme dugme-kucuk" disabled={neden.trim().length < 3}>{m.iptal}</button>
    </form>
  );
}

function KalemEkle({ hizmetler, ekle }: { hizmetler: Hizmet[]; ekle: (govde: object) => Promise<void> }) {
  const { izinVar } = useOturum();
  const [hizmetId, setHizmetId] = useState('');
  const [adet, setAdet] = useState(1);
  const [indirim, setIndirim] = useState(0);
  const [neden, setNeden] = useState('');
  const secili = hizmetler.find((h) => h.id === hizmetId);
  const tutar = secili ? kalemTutari(secili.fiyatKurus, adet, indirim) : null;
  const esikAsildi = indirim > INDIRIM_ONAY_ESIGI_YUZDE && !izinVar('finans.iade.onayla');

  async function gonder(olay: FormEvent) {
    olay.preventDefault();
    await ekle({ hizmetId, adet, indirimYuzde: indirim, indirimNedeni: indirim > 0 ? neden : undefined });
    setHizmetId(''); setAdet(1); setIndirim(0); setNeden('');
  }

  return (
    <form onSubmit={gonder} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, borderRadius: 12, background: '#f9f8f4' }}>
      <Alan etiket={m.hizmet}>
        <select value={hizmetId} onChange={(e) => setHizmetId(e.target.value)} required>
          <option value="">—</option>
          {hizmetler.map((h) => <option key={h.id} value={h.id}>{h.kod} · {h.ad} · {kurusBicimle(h.fiyatKurus)}</option>)}
        </select>
      </Alan>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
        <Alan etiket={m.adet}><input type="number" min={1} max={100} value={adet} onChange={(e) => setAdet(Number(e.target.value))} /></Alan>
        <Alan etiket={m.indirim} hata={esikAsildi ? m.indirimNot(INDIRIM_ONAY_ESIGI_YUZDE) : undefined}>
          <input type="number" min={0} max={100} value={indirim} onChange={(e) => setIndirim(Number(e.target.value))} />
        </Alan>
      </div>
      {indirim > 0 && <Alan etiket={m.indirimNedeni}><input value={neden} onChange={(e) => setNeden(e.target.value)} required /></Alan>}
      <button type="submit" className="dugme dugme-ikincil dugme-kucuk" disabled={!secili || esikAsildi || (indirim > 0 && !neden.trim())}>
        {m.kalemEkle}{tutar && ` · ${kurusBicimle(tutar.net)}`}
      </button>
    </form>
  );
}

function TahsilatFormu({ varsayilanKurus, al }: { varsayilanKurus: number; al: (govde: object) => Promise<void> }) {
  const [tutar, setTutar] = useState('');
  const [tur, setTur] = useState<OdemeTuru>('nakit');
  const [aciklama, setAciklama] = useState('');

  useEffect(() => {
    setTutar(varsayilanKurus > 0 ? String(varsayilanKurus / 100) : '');
  }, [varsayilanKurus]);

  async function gonder(olay: FormEvent) {
    olay.preventDefault();
    await al({ tutarTl: Number(tutar.replace(',', '.')), odemeTuru: tur, aciklama });
    setAciklama('');
  }

  return (
    <form onSubmit={gonder} aria-label={m.tahsilatAl} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, borderRadius: 12, background: 'var(--nane-acik)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
        <Alan etiket={m.tutar}><input inputMode="decimal" value={tutar} onChange={(e) => setTutar(e.target.value)} required /></Alan>
        <Alan etiket={m.odemeTuru}>
          <select value={tur} onChange={(e) => setTur(e.target.value as OdemeTuru)}>
            {Object.entries(ODEME_TURLERI).map(([k, a]) => <option key={k} value={k}>{a}</option>)}
          </select>
        </Alan>
      </div>
      <Alan etiket={m.aciklamaAlan}><input value={aciklama} onChange={(e) => setAciklama(e.target.value)} maxLength={300} /></Alan>
      <button type="submit" className="dugme dugme-kucuk" disabled={!tutar || Number(tutar.replace(',', '.')) <= 0}>{m.tahsilatAl}</button>
    </form>
  );
}
