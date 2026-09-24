'use client';

import {
  type AlarmSeviyesi,
  type BelgeDurumu,
  BIRIMLER,
  KONTROL_DURUMLARI,
  type KontrolDurumu,
  SAKLAMA_KOSULLARI,
  type SaklamaKosulu,
  URUN_TIPLERI,
  type UrunTipi,
} from '@dc/shared';
import Link from 'next/link';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Alan } from '@/bilesenler/Alan';
import { DurumRozeti } from '@/bilesenler/Belgeler';
import { api, ApiHatasi, hataMesaji } from '@/lib/api';
import { tarihBicimle } from '@/lib/bicim';
import { useOturum } from '@/lib/oturum';
import { metin } from '@/metin';

const m = metin.stok;

interface Urun {
  id: string;
  kod: string;
  ad: string;
  tip: UrunTipi;
  birim: string;
  kontrol: KontrolDurumu;
  saklama: SaklamaKosulu;
  aktif: boolean;
  minSeviye: number;
  bakiye: number;
  lotSayisi: number;
  enYakinSkt: string | null;
  skt: { durum: BelgeDurumu; kalanGun: number | null; seviye: AlarmSeviyesi | null };
  seviye: AlarmSeviyesi | null;
}

const KONTROL_SINIFI: Record<KontrolDurumu, string> = { normal: '', yuksek_riskli: 'rozet rozet-uyari', psikotrop: 'rozet rozet-bilgi', narkotik: 'rozet rozet-kritik' };

export default function StokSayfasi() {
  const { subeId, izinVar } = useOturum();
  const [liste, setListe] = useState<Urun[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [formAcik, setFormAcik] = useState(false);

  const yukle = useCallback(async () => {
    try {
      setListe(await api<Urun[]>('/urunler'));
    } catch (h) {
      setHata(hataMesaji(h));
    }
  }, []);

  useEffect(() => {
    void yukle();
  }, [yukle, subeId]);

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <h1>{m.baslik}</h1>
          <p className="ikincil" style={{ margin: '4px 0 0' }}>{m.aciklama}</p>
        </div>
        {izinVar('stok.yonet') && (
          <button type="button" className="dugme" onClick={() => setFormAcik(!formAcik)} aria-expanded={formAcik}>+ {m.urunEkle}</button>
        )}
      </div>
      {!subeId && <div className="kutu kutu-bilgi">{m.subeSecin}</div>}
      {hata && <div className="kutu kutu-hata" role="alert">{hata}</div>}
      {formAcik && <UrunFormu eklendi={() => { setFormAcik(false); void yukle(); }} />}

      {liste && (
        <section className="kart" aria-label={m.urunler}>
          {liste.length === 0 ? (
            <p className="ikincil" style={{ margin: 0 }}>{m.urunYok}</p>
          ) : (
            <div className="tablo-kaydir">
              <table className="tablo">
                <thead>
                  <tr><th>{m.ad}</th><th>{m.tip}</th><th style={{ textAlign: 'right' }}>{m.bakiye}</th><th>{m.enYakinSkt}</th></tr>
                </thead>
                <tbody>
                  {liste.map((u) => (
                    <tr key={u.id} style={u.aktif ? undefined : { opacity: 0.6 }}>
                      <td>
                        <Link href={`/panel/stok/${u.id}`} style={{ fontWeight: 600 }}>{u.ad}</Link>
                        <span className="kucuk ikincil" style={{ display: 'block' }}>
                          <span className="mono">{u.kod}</span> · {SAKLAMA_KOSULLARI[u.saklama]}
                        </span>
                        {u.kontrol !== 'normal' && <span className={KONTROL_SINIFI[u.kontrol]} style={{ marginTop: 4 }}>{KONTROL_DURUMLARI[u.kontrol]}</span>}
                      </td>
                      <td>{URUN_TIPLERI[u.tip]}</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{u.bakiye.toLocaleString('tr-TR')} {u.birim}</strong>
                        {u.minSeviye > 0 && <span className="kucuk ikincil" style={{ display: 'block' }}>{m.minSeviye}: {u.minSeviye.toLocaleString('tr-TR')}</span>}
                        {u.seviye && <span className={u.seviye === 'kritik' ? 'rozet rozet-kritik' : 'rozet rozet-uyari'}>{u.seviye === 'kritik' ? m.kritik : m.altinda}</span>}
                      </td>
                      <td>
                        {u.enYakinSkt ? (
                          <>
                            <span style={{ display: 'block' }}>{tarihBicimle(u.enYakinSkt)}</span>
                            {u.skt.seviye && <DurumRozeti durum={u.skt.durum} kalanGun={u.skt.kalanGun} seviye={u.skt.seviye} />}
                          </>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </>
  );
}

function UrunFormu({ eklendi }: { eklendi: () => void }) {
  const [d, setD] = useState({ kod: '', ad: '', tip: 'ilac' as UrunTipi, birim: 'adet', kontrol: 'normal' as KontrolDurumu, saklama: 'oda' as SaklamaKosulu, barkod: '', minSeviye: '0' });
  const [hata, setHata] = useState<string | null>(null);
  const [alan, setAlan] = useState<Record<string, string>>({});
  const degis = (k: keyof typeof d) => (e: { target: { value: string } }) => setD({ ...d, [k]: e.target.value });

  async function gonder(olay: FormEvent) {
    olay.preventDefault();
    setHata(null);
    setAlan({});
    try {
      await api('/urunler', { yontem: 'POST', govde: { ...d, barkod: d.barkod || undefined, minSeviye: Number(d.minSeviye.replace(',', '.')) || 0 } });
      eklendi();
    } catch (h) {
      setHata(hataMesaji(h));
      if (h instanceof ApiHatasi) setAlan(h.alanHatalari());
    }
  }

  return (
    <form onSubmit={(e) => void gonder(e)} aria-label={m.urunEkle} className="kart" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2>{m.urunEkle}</h2>
      {hata && <div className="kutu kutu-hata" role="alert">{hata}</div>}
      <div className="form-izgara">
        <Alan etiket={m.kod} hata={alan.kod}><input value={d.kod} onChange={degis('kod')} maxLength={30} required /></Alan>
        <Alan etiket={m.ad} hata={alan.ad}><input value={d.ad} onChange={degis('ad')} required minLength={2} /></Alan>
        <Alan etiket={m.tip}>
          <select value={d.tip} onChange={degis('tip')}>{Object.entries(URUN_TIPLERI).map(([k, a]) => <option key={k} value={k}>{a}</option>)}</select>
        </Alan>
        <Alan etiket={m.birim}>
          <select value={d.birim} onChange={degis('birim')}>{BIRIMLER.map((b) => <option key={b} value={b}>{b}</option>)}</select>
        </Alan>
        <Alan etiket={m.kontrol}>
          <select value={d.kontrol} onChange={degis('kontrol')}>{Object.entries(KONTROL_DURUMLARI).map(([k, a]) => <option key={k} value={k}>{a}</option>)}</select>
        </Alan>
        <Alan etiket={m.saklama}>
          <select value={d.saklama} onChange={degis('saklama')}>{Object.entries(SAKLAMA_KOSULLARI).map(([k, a]) => <option key={k} value={k}>{a}</option>)}</select>
        </Alan>
        <Alan etiket={m.barkod}><input value={d.barkod} onChange={degis('barkod')} maxLength={60} /></Alan>
        <Alan etiket={m.minSeviye}><input inputMode="decimal" value={d.minSeviye} onChange={degis('minSeviye')} /></Alan>
      </div>
      <div><button type="submit" className="dugme" disabled={!d.kod || d.ad.trim().length < 2}>{m.urunEkle}</button></div>
    </form>
  );
}
