'use client';

import { HIZMET_KATEGORILERI, type HizmetKategorisi, KDV_ORANLARI, kurusBicimle, ODEME_TURLERI, type OdemeTuru } from '@dc/shared';
import Link from 'next/link';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Alan } from '@/bilesenler/Alan';
import { api, hataMesaji } from '@/lib/api';
import { bugunTarihi, saatBicimle, uzunTarih } from '@/lib/bicim';
import { useOturum } from '@/lib/oturum';
import { metin } from '@/metin';
import { IadeFormu } from './IadeFormu';

const m = metin.finans;

export interface Hizmet {
  id: string;
  kod: string;
  ad: string;
  kategori: HizmetKategorisi;
  kdvOrani: number;
  fiyatKurus: number;
  aktif: boolean;
  onayBekliyor: boolean;
}

export default function FinansSayfasi() {
  const { izinVar } = useOturum();
  return (
    <>
      <div>
        <h1>{m.baslik}</h1>
        <p className="ikincil" style={{ margin: '4px 0 0', maxWidth: 760 }}>{m.aciklama}</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 20, alignItems: 'start' }}>
        {(izinVar('finans.tahsilat') || izinVar('finans.goruntule')) && <Kasa />}
        <Hizmetler />
      </div>
    </>
  );
}

interface KasaGunu {
  gun: string;
  hareketler: { id: string; tutarKurus: number; odemeTuru: OdemeTuru; aciklama: string; iadeEdilenId: string | null; zaman: string; hasta: string; kisiId: string; alan: string }[];
  turler: Partial<Record<OdemeTuru, { tahsilatKurus: number; iadeKurus: number }>>;
  netKurus: number;
  beklenenNakitKurus: number;
  kapanis: { sayilanNakitKurus: number; farkKurus: number; aciklama: string; zaman: string; kapatan: string } | null;
}

function Kasa() {
  const { subeId, izinVar } = useOturum();
  const [gun, setGun] = useState(() => bugunTarihi());
  const [kasa, setKasa] = useState<KasaGunu | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [sayilan, setSayilan] = useState('');
  const [aciklama, setAciklama] = useState('');
  const [iadeId, setIadeId] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    if (!subeId) return;
    try {
      setKasa(await api<KasaGunu>(`/kasa?gun=${gun}`));
      setHata(null);
    } catch (h) {
      setHata(hataMesaji(h));
    }
  }, [gun, subeId]);

  useEffect(() => {
    void yukle();
  }, [yukle]);

  async function kapat(olay: FormEvent) {
    olay.preventDefault();
    setHata(null);
    try {
      await api('/kasa/kapanis', { yontem: 'POST', govde: { gun, sayilanNakitTl: Number(sayilan.replace(',', '.')), aciklama } });
      await yukle();
    } catch (h) {
      setHata(hataMesaji(h));
    }
  }

  if (!subeId) return <section className="kart">{m.subeSecin}</section>;

  const sayilanKurus = Math.round(Number(sayilan.replace(',', '.')) * 100);
  const fark = sayilan && kasa ? sayilanKurus - kasa.beklenenNakitKurus : 0;

  return (
    <section className="kart" aria-label={m.kasa} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="kart-baslik" style={{ marginBottom: 0, flexWrap: 'wrap' }}>
        <h2>{m.kasa}</h2>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span className="gizli">{m.gun}</span>
          <input type="date" value={gun} max={bugunTarihi()} onChange={(e) => e.target.value && setGun(e.target.value)} style={{ minHeight: 44, padding: '0 10px', borderRadius: 12, border: '1px solid var(--cizgi)', font: 'inherit' }} />
        </label>
      </div>
      <span className="ikincil kucuk">{uzunTarih(gun)}</span>
      {hata && <div className="kutu kutu-hata" role="alert">{hata}</div>}
      {kasa && (
        <>
          <table className="tablo">
            <thead>
              <tr>
                <th>{m.odemeTuru}</th>
                <th style={{ textAlign: 'right' }}>{m.tahsilat}</th>
                <th style={{ textAlign: 'right' }}>{m.iade}</th>
                <th style={{ textAlign: 'right' }}>{m.net}</th>
              </tr>
            </thead>
            <tbody>
              {(Object.keys(ODEME_TURLERI) as OdemeTuru[]).map((t) => {
                const d = kasa.turler[t] ?? { tahsilatKurus: 0, iadeKurus: 0 };
                return (
                  <tr key={t}>
                    <td>{ODEME_TURLERI[t]}</td>
                    <td style={{ textAlign: 'right' }}>{kurusBicimle(d.tahsilatKurus)}</td>
                    <td style={{ textAlign: 'right' }}>{d.iadeKurus ? `−${kurusBicimle(d.iadeKurus)}` : '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{kurusBicimle(d.tahsilatKurus - d.iadeKurus)}</td>
                  </tr>
                );
              })}
              <tr>
                <td style={{ fontWeight: 600 }}>{m.toplam}</td>
                <td colSpan={3} style={{ textAlign: 'right', fontWeight: 600 }}>{kurusBicimle(kasa.netKurus)}</td>
              </tr>
            </tbody>
          </table>

          <details>
            <summary style={{ cursor: 'pointer', fontWeight: 600, minHeight: 32 }}>{m.hareketler} ({kasa.hareketler.length})</summary>
            {kasa.hareketler.length === 0 ? (
              <p className="ikincil kucuk">{m.hareketYok}</p>
            ) : (
              <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0 }}>
                {kasa.hareketler.map((h) => (
                  <li key={h.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--cizgi-acik)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span className="mono ikincil">{saatBicimle(h.zaman)}</span>
                      <Link href={`/panel/hastalar/${h.kisiId}`} style={{ flex: 1 }}>{h.hasta}</Link>
                      <span className="kucuk ikincil">{ODEME_TURLERI[h.odemeTuru]} · {h.alan}</span>
                      <strong style={{ color: h.tutarKurus < 0 ? 'var(--kritik)' : 'inherit' }}>{kurusBicimle(h.tutarKurus)}</strong>
                      {h.tutarKurus > 0 && izinVar('finans.iade.onayla') && !kasa.kapanis && (
                        <button type="button" className="dugme dugme-sade dugme-kucuk" onClick={() => setIadeId(iadeId === h.id ? null : h.id)}>{m.iadeYap}</button>
                      )}
                    </div>
                    {h.aciklama && <span className="kucuk ikincil">{h.aciklama}</span>}
                    {iadeId === h.id && <IadeFormu tahsilatId={h.id} bitti={async () => { setIadeId(null); await yukle(); }} />}
                  </li>
                ))}
              </ul>
            )}
          </details>

          {kasa.kapanis ? (
            <div className={kasa.kapanis.farkKurus === 0 ? 'kutu kutu-basari' : 'kutu kutu-uyari'} role="status">
              {m.kapandi(kasa.kapanis.kapatan, kurusBicimle(kasa.kapanis.farkKurus))}
              {kasa.kapanis.aciklama && ` — ${kasa.kapanis.aciklama}`}
            </div>
          ) : (
            izinVar('finans.tahsilat') && (
              <form onSubmit={kapat} style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid var(--cizgi)', paddingTop: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{m.beklenenNakit}</span>
                  <strong>{kurusBicimle(kasa.beklenenNakitKurus)}</strong>
                </div>
                <Alan etiket={m.sayilanNakit} ipucu={sayilan ? `Fark: ${kurusBicimle(fark)}` : undefined}>
                  <input inputMode="decimal" value={sayilan} onChange={(e) => setSayilan(e.target.value)} required />
                </Alan>
                {fark !== 0 && (
                  <Alan etiket={m.farkAciklama}><input value={aciklama} onChange={(e) => setAciklama(e.target.value)} required /></Alan>
                )}
                <button type="submit" className="dugme" disabled={!sayilan || (fark !== 0 && !aciklama.trim())}>{m.kapat}</button>
              </form>
            )
          )}
        </>
      )}
    </section>
  );
}

function Hizmetler() {
  const { ben, izinVar } = useOturum();
  const [liste, setListe] = useState<Hizmet[] | null>(null);
  const [talepler, setTalepler] = useState<{ id: string; hizmetAd: string; hizmetKod: string; eskiFiyatKurus: number | null; yeniFiyatKurus: number; talepEdenId: string; talepEden: string }[]>([]);
  const [hata, setHata] = useState<string | null>(null);
  const [bildirim, setBildirim] = useState<string | null>(null);
  const [duzenlenen, setDuzenlenen] = useState<string | null>(null);
  const [yeniFiyat, setYeniFiyat] = useState('');
  const fiyatYonetir = izinVar('fiyat.yonet');
  const onaylar = izinVar('fiyat.onayla');

  const yukle = useCallback(async () => {
    try {
      setListe(await api<Hizmet[]>('/hizmetler'));
      if (fiyatYonetir || onaylar) setTalepler(await api('/fiyat-talepleri'));
    } catch (h) {
      setHata(hataMesaji(h));
    }
  }, [fiyatYonetir, onaylar]);

  useEffect(() => {
    void yukle();
  }, [yukle]);

  async function islem(is: () => Promise<string | void>) {
    setHata(null);
    setBildirim(null);
    try {
      const b = await is();
      if (b) setBildirim(b);
      await yukle();
    } catch (h) {
      setHata(hataMesaji(h));
    }
  }

  return (
    <section className="kart" aria-label={m.hizmetler} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <h2>{m.hizmetler}</h2>
      {hata && <div className="kutu kutu-hata" role="alert">{hata}</div>}
      {bildirim && <div className="kutu kutu-basari" role="status">{bildirim}</div>}

      {(fiyatYonetir || onaylar) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <strong>{m.talepler}</strong>
          {talepler.length === 0 && <span className="ikincil kucuk">{m.talepYok}</span>}
          {talepler.map((t) => (
            <div key={t.id} className="kutu kutu-uyari" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ flex: 1 }}>
                <strong>{t.hizmetKod}</strong> {t.hizmetAd}: {t.eskiFiyatKurus !== null ? `${kurusBicimle(t.eskiFiyatKurus)} → ` : ''}<strong>{kurusBicimle(t.yeniFiyatKurus)}</strong>
                <span className="kucuk" style={{ display: 'block' }}>{t.talepEden}</span>
              </span>
              {onaylar && t.talepEdenId !== ben.kullanici.id ? (
                <span style={{ display: 'flex', gap: 6 }}>
                  <button type="button" className="dugme dugme-kucuk" onClick={() => islem(async () => { await api(`/fiyat-talepleri/${t.id}/karar`, { yontem: 'POST', govde: { onay: true } }); })}>{m.onayla}</button>
                  <button type="button" className="dugme dugme-sade dugme-kucuk" onClick={() => islem(async () => { await api(`/fiyat-talepleri/${t.id}/karar`, { yontem: 'POST', govde: { onay: false } }); })}>{m.reddet}</button>
                </span>
              ) : (
                <span className="kucuk">{t.talepEdenId === ben.kullanici.id ? m.kendiTalebin : ''}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {liste === null ? (
        <span className="ikincil">{metin.genel.yukleniyor}</span>
      ) : liste.length === 0 ? (
        <span className="ikincil">{m.hizmetYok}</span>
      ) : (
        <div className="tablo-kaydir">
          <table className="tablo">
            <thead>
              <tr>
                <th>{m.kod}</th>
                <th>{m.ad}</th>
                <th>{m.kdv}</th>
                <th style={{ textAlign: 'right' }}>{m.fiyat}</th>
              </tr>
            </thead>
            <tbody>
              {liste.map((h) => (
                <tr key={h.id}>
                  <td className="mono">{h.kod}</td>
                  <td>
                    {h.ad}
                    <span className="kucuk ikincil" style={{ display: 'block' }}>{HIZMET_KATEGORILERI[h.kategori]}</span>
                    {h.onayBekliyor && <span className="rozet" style={{ marginTop: 4 }}>{m.onayBekliyor}</span>}
                    {!h.aktif && !h.onayBekliyor && <span className="rozet" style={{ marginTop: 4 }}>{m.pasif}</span>}
                  </td>
                  <td>%{h.kdvOrani}</td>
                  <td style={{ textAlign: 'right' }}>
                    <strong>{kurusBicimle(h.fiyatKurus)}</strong>
                    {fiyatYonetir && !h.onayBekliyor && (
                      duzenlenen === h.id ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            void islem(async () => {
                              const r = await api<{ uygulandi: boolean }>(`/hizmetler/${h.id}/fiyat`, { yontem: 'POST', govde: { fiyatTl: Number(yeniFiyat.replace(',', '.')) } });
                              setDuzenlenen(null);
                              setYeniFiyat('');
                              return r.uygulandi ? m.uygulandi : m.talepGonderildi;
                            });
                          }}
                          style={{ display: 'flex', gap: 6, marginTop: 6, justifyContent: 'flex-end' }}
                        >
                          <label className="gizli" htmlFor={`fiyat-${h.id}`}>{m.yeniFiyat}</label>
                          <input id={`fiyat-${h.id}`} inputMode="decimal" value={yeniFiyat} onChange={(e) => setYeniFiyat(e.target.value)} style={{ width: 110, minHeight: 40, borderRadius: 10, border: '1px solid #d5d0c5', padding: '0 8px', font: 'inherit' }} required autoFocus />
                          <button type="submit" className="dugme dugme-kucuk">{metin.genel.kaydet}</button>
                        </form>
                      ) : (
                        <button type="button" className="dugme dugme-sade dugme-kucuk" style={{ display: 'block', marginLeft: 'auto', marginTop: 6 }} onClick={() => { setDuzenlenen(h.id); setYeniFiyat(String(h.fiyatKurus / 100)); }}>
                          {m.fiyatDegistir}
                        </button>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {fiyatYonetir && <HizmetEkle eklendi={(b) => islem(async () => b)} />}
    </section>
  );
}

function HizmetEkle({ eklendi }: { eklendi: (bildirim: string) => void }) {
  const [kod, setKod] = useState('');
  const [ad, setAd] = useState('');
  const [kategori, setKategori] = useState<HizmetKategorisi>('muayene');
  const [kdv, setKdv] = useState<number>(10);
  const [fiyat, setFiyat] = useState('');
  const [hata, setHata] = useState<string | null>(null);

  async function gonder(olay: FormEvent) {
    olay.preventDefault();
    setHata(null);
    try {
      const r = await api<{ onayBekliyor: boolean }>('/hizmetler', { yontem: 'POST', govde: { kod, ad, kategori, kdvOrani: kdv, fiyatTl: Number(fiyat.replace(',', '.')) } });
      setKod(''); setAd(''); setFiyat('');
      eklendi(r.onayBekliyor ? m.talepGonderildi : m.uygulandi);
    } catch (h) {
      setHata(hataMesaji(h));
    }
  }

  return (
    <form onSubmit={gonder} style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid var(--cizgi)', paddingTop: 14 }}>
      <strong>{m.hizmetEkle}</strong>
      <div className="form-izgara">
        <Alan etiket={m.kod}><input value={kod} onChange={(e) => setKod(e.target.value.toUpperCase())} maxLength={20} required /></Alan>
        <Alan etiket={m.ad}><input value={ad} onChange={(e) => setAd(e.target.value)} required minLength={2} /></Alan>
        <Alan etiket={m.kategori}>
          <select value={kategori} onChange={(e) => setKategori(e.target.value as HizmetKategorisi)}>
            {Object.entries(HIZMET_KATEGORILERI).map(([k, a]) => <option key={k} value={k}>{a}</option>)}
          </select>
        </Alan>
        <Alan etiket={m.kdv}>
          <select value={kdv} onChange={(e) => setKdv(Number(e.target.value))}>
            {KDV_ORANLARI.map((k) => <option key={k} value={k}>%{k}</option>)}
          </select>
        </Alan>
        <Alan etiket={m.fiyat}><input inputMode="decimal" value={fiyat} onChange={(e) => setFiyat(e.target.value)} required /></Alan>
      </div>
      {hata && <div className="kutu kutu-hata" role="alert">{hata}</div>}
      <div><button type="submit" className="dugme dugme-ikincil" disabled={!kod || ad.trim().length < 2 || !fiyat}>{m.hizmetEkle}</button></div>
    </form>
  );
}
