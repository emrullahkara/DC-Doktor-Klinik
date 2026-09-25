'use client';

import {
  type AlarmSeviyesi,
  type BelgeDurumu,
  HAREKET_TURLERI,
  type HareketTuru,
  KONTROL_DURUMLARI,
  type KontrolDurumu,
  kontrolluMu,
  URUN_TIPLERI,
  type UrunTipi,
} from '@dc/shared';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Alan } from '@/bilesenler/Alan';
import { DurumRozeti } from '@/bilesenler/Belgeler';
import { api, ApiHatasi, hataMesaji } from '@/lib/api';
import { saatBicimle, tarihBicimle } from '@/lib/bicim';
import { useOturum } from '@/lib/oturum';
import { metin } from '@/metin';

const m = metin.stok;

interface Kart {
  urun: { id: string; kod: string; ad: string; tip: UrunTipi; birim: string; kontrol: KontrolDurumu; minSeviye: number; aktif: boolean };
  lotlar: { lot: string; skt: string | null; bakiye: number; sktDurumu: { durum: BelgeDurumu; kalanGun: number | null; seviye: AlarmSeviyesi | null } }[];
  fefo: string | null;
  hareketler: { id: string; tur: HareketTuru; lot: string; miktar: number; aciklama: string; zaman: string; yapan: string; sahit: string | null; hasta: string | null; kisiId: string | null }[];
}

export default function UrunKarti() {
  const { id } = useParams<{ id: string }>();
  const { subeId, izinVar } = useOturum();
  const [kart, setKart] = useState<Kart | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    if (!subeId) return;
    try {
      setKart(await api<Kart>(`/urunler/${id}`));
    } catch (h) {
      setHata(hataMesaji(h));
    }
  }, [id, subeId]);

  useEffect(() => {
    void yukle();
  }, [yukle]);

  if (!subeId) return <div className="kutu kutu-bilgi">{m.subeSecin}</div>;
  if (!kart) return hata ? <div className="kutu kutu-hata" role="alert">{hata}</div> : <p>{metin.genel.yukleniyor}</p>;
  const u = kart.urun;
  const kontrollu = kontrolluMu(u.kontrol);
  const turler = (Object.keys(HAREKET_TURLERI) as HareketTuru[]).filter((t) => {
    if (kontrollu) return izinVar('narkotik.yonet');
    return t === 'kullanim' ? izinVar('stok.yonet') || izinVar('tibbi.kayit.yaz') : izinVar('stok.yonet');
  });

  return (
    <>
      <Link href="/panel/stok" className="kucuk">{m.geri}</Link>
      <section className="kart" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <h1>{u.ad}</h1>
          <p className="ikincil" style={{ margin: '4px 0 0' }}><span className="mono">{u.kod}</span> · {URUN_TIPLERI[u.tip]} · {u.birim}</p>
        </div>
        {u.kontrol !== 'normal' && <span className={u.kontrol === 'narkotik' ? 'rozet rozet-kritik' : 'rozet rozet-uyari'}>{KONTROL_DURUMLARI[u.kontrol]}</span>}
        {izinVar('stok.yonet') && <MinSeviye id={u.id} deger={u.minSeviye} birim={u.birim} kaydedildi={() => void yukle()} />}
      </section>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
        <section className="kart" aria-label={m.lotlar} style={{ flex: '1 1 380px', minWidth: 0 }}>
          <h2 style={{ marginBottom: 10 }}>{m.lotlar}</h2>
          {kart.lotlar.length === 0 ? (
            <p className="ikincil" style={{ margin: 0 }}>{m.lotYok}</p>
          ) : (
            <table className="tablo">
              <thead><tr><th>{m.lot}</th><th>{m.skt}</th><th style={{ textAlign: 'right' }}>{m.bakiye}</th></tr></thead>
              <tbody>
                {kart.lotlar.map((l) => (
                  <tr key={l.lot}>
                    <td>
                      <span className="mono">{l.lot}</span>
                      {kart.fefo === l.lot && <span className="rozet rozet-nane" style={{ marginLeft: 6 }}>{m.fefo}</span>}
                    </td>
                    <td>
                      {l.skt ? tarihBicimle(l.skt) : '—'}
                      {l.sktDurumu.seviye && <span style={{ display: 'block' }}><DurumRozeti durum={l.sktDurumu.durum} kalanGun={l.sktDurumu.kalanGun} seviye={l.sktDurumu.seviye} /></span>}
                    </td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{l.bakiye.toLocaleString('tr-TR')} {u.birim}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {turler.length > 0 && <HareketFormu kart={kart} turler={turler} kaydedildi={() => void yukle()} />}
      </div>

      <section className="kart" aria-label={m.gecmis}>
        <h2 style={{ marginBottom: 10 }}>{m.gecmis}</h2>
        {kart.hareketler.length === 0 ? (
          <p className="ikincil" style={{ margin: 0 }}>{m.gecmisYok}</p>
        ) : (
          <div className="tablo-kaydir">
            <table className="tablo">
              <thead><tr><th>{m.zaman}</th><th>{m.tur}</th><th>{m.lot}</th><th style={{ textAlign: 'right' }}>{m.miktar}</th><th>{m.yapan}</th></tr></thead>
              <tbody>
                {kart.hareketler.map((h) => (
                  <tr key={h.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{tarihBicimle(h.zaman)} {saatBicimle(h.zaman)}</td>
                    <td>
                      {HAREKET_TURLERI[h.tur].ad}
                      {h.hasta && (h.kisiId ? <Link href={`/panel/hastalar/${h.kisiId}`} className="kucuk" style={{ display: 'block' }}>{h.hasta}</Link> : <span className="kucuk ikincil" style={{ display: 'block' }}>{h.hasta}</span>)}
                      {h.aciklama && <span className="kucuk ikincil" style={{ display: 'block' }}>{h.aciklama}</span>}
                    </td>
                    <td className="mono">{h.lot}</td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: h.miktar < 0 ? 'var(--kritik)' : undefined }}>{h.miktar > 0 ? '+' : ''}{h.miktar.toLocaleString('tr-TR')}</td>
                    <td className="kucuk">{h.yapan}{h.sahit && <span className="ikincil" style={{ display: 'block' }}>{m.sahit.split(' (')[0]}: {h.sahit}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {izinVar('stok.goruntule') && izinVar('hasta.demografik.goruntule') && <LotIzleme urunId={u.id} lotlar={[...new Set(kart.hareketler.map((h) => h.lot))]} />}
    </>
  );
}

function MinSeviye({ id, deger, birim, kaydedildi }: { id: string; deger: number; birim: string; kaydedildi: () => void }) {
  const [v, setV] = useState(String(deger));
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); void api(`/urunler/${id}`, { yontem: 'PATCH', govde: { minSeviye: Number(v.replace(',', '.')) || 0 } }).then(kaydedildi); }}
      style={{ display: 'flex', gap: 8, alignItems: 'end' }}
    >
      <Alan etiket={`${m.minSeviye} (${birim})`}><input inputMode="decimal" value={v} onChange={(e) => setV(e.target.value)} style={{ width: 110 }} /></Alan>
      <button type="submit" className="dugme dugme-sade dugme-kucuk">{m.minKaydet}</button>
    </form>
  );
}

function HareketFormu({ kart, turler, kaydedildi }: { kart: Kart; turler: HareketTuru[]; kaydedildi: () => void }) {
  const u = kart.urun;
  const kontrollu = kontrolluMu(u.kontrol);
  const [tur, setTur] = useState<HareketTuru>(turler.includes('kullanim') ? 'kullanim' : turler[0]!);
  const [lot, setLot] = useState(kart.fefo ?? kart.lotlar[0]?.lot ?? '');
  const [skt, setSkt] = useState('');
  const [miktar, setMiktar] = useState('1');
  const [aciklama, setAciklama] = useState('');
  const [sahitId, setSahitId] = useState('');
  const [sahitler, setSahitler] = useState<{ id: string; adSoyad: string }[]>([]);
  const [hasta, setHasta] = useState<{ id: string; ad: string } | null>(null);
  const [sorgu, setSorgu] = useState('');
  const [sonuclar, setSonuclar] = useState<{ id: string; ad: string; soyad: string }[]>([]);
  const [durum, setDurum] = useState<{ tur: 'hata' | 'basari'; mesaj: string } | null>(null);

  useEffect(() => {
    if (kontrollu) api<{ id: string; adSoyad: string }[]>('/stok/sahitler').then(setSahitler).catch(() => undefined);
  }, [kontrollu]);

  useEffect(() => {
    if (tur !== 'kullanim' || sorgu.trim().length < 2) {
      setSonuclar([]);
      return;
    }
    let gecersiz = false;
    const z = setTimeout(() => {
      api<{ id: string; ad: string; soyad: string }[]>(`/hastalar?q=${encodeURIComponent(sorgu.trim())}`).then((l) => !gecersiz && setSonuclar(l.slice(0, 6))).catch(() => undefined);
    }, 250);
    return () => { gecersiz = true; clearTimeout(z); };
  }, [sorgu, tur]);

  async function gonder(olay: FormEvent) {
    olay.preventDefault();
    setDurum(null);
    const sayi = Number(miktar.replace(',', '.'));
    const govde: Record<string, unknown> = { tur, lot, aciklama };
    if (tur === 'giris') Object.assign(govde, { miktar: sayi, ...(skt ? { skt } : {}) });
    else if (tur === 'sayim') Object.assign(govde, { sayilan: sayi });
    else govde.miktar = sayi;
    if (tur === 'kullanim') govde.kisiId = hasta?.id;
    if (kontrollu && tur !== 'giris') govde.sahitId = sahitId || undefined;
    try {
      const sonuc = await api<{ fark?: number }>(`/urunler/${u.id}/hareketler`, { yontem: 'POST', govde });
      setDurum({ tur: 'basari', mesaj: tur === 'sayim' ? (sonuc.fark ? m.sayimFarki(`${sonuc.fark > 0 ? '+' : ''}${sonuc.fark} ${u.birim}`) : m.sayimFarkYok) : m.kaydedildi });
      setAciklama('');
      if (tur === 'kullanim') { setHasta(null); setSorgu(''); }
      kaydedildi();
    } catch (h) {
      setDurum({ tur: 'hata', mesaj: h instanceof ApiHatasi ? h.message : hataMesaji(h) });
    }
  }

  const eksik = !lot || !miktar || (tur === 'kullanim' && !hasta) || ((tur === 'fire' || tur === 'iade' || tur === 'sayim') && aciklama.trim().length < 3) || (kontrollu && tur !== 'giris' && !sahitId);

  return (
    <form onSubmit={(e) => void gonder(e)} aria-label={m.hareket} className="kart" style={{ flex: '1 1 380px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2>{m.hareket}</h2>
      {durum && <div className={durum.tur === 'hata' ? 'kutu kutu-hata' : 'kutu kutu-basari'} role={durum.tur === 'hata' ? 'alert' : 'status'}>{durum.mesaj}</div>}
      <div className="form-izgara">
        <Alan etiket={m.tur}>
          <select value={tur} onChange={(e) => { setTur(e.target.value as HareketTuru); setDurum(null); }}>
            {turler.map((t) => <option key={t} value={t}>{HAREKET_TURLERI[t].ad}</option>)}
          </select>
        </Alan>
        {tur === 'giris' ? (
          <Alan etiket={m.lot}><input value={lot} onChange={(e) => setLot(e.target.value)} maxLength={60} required /></Alan>
        ) : (
          <Alan etiket={m.lot}>
            <select value={lot} onChange={(e) => setLot(e.target.value)} required>
              <option value="">—</option>
              {kart.lotlar.map((l) => <option key={l.lot} value={l.lot}>{l.lot} · {l.bakiye} {u.birim}{l.skt ? ` · SKT ${tarihBicimle(l.skt)}` : ''}</option>)}
            </select>
          </Alan>
        )}
        {tur === 'giris' && <Alan etiket={m.skt}><input type="date" value={skt} onChange={(e) => setSkt(e.target.value)} /></Alan>}
        <Alan etiket={`${tur === 'sayim' ? m.sayilan : m.miktar} (${u.birim})`}><input inputMode="decimal" value={miktar} onChange={(e) => setMiktar(e.target.value)} required /></Alan>
        {tur === 'kullanim' && (
          <div style={{ gridColumn: '1 / -1', position: 'relative' }}>
            {hasta ? (
              <div className="kutu kutu-bilgi" style={{ alignItems: 'center' }}>
                <span style={{ flex: 1 }}>{m.hasta}: <strong>{hasta.ad}</strong></span>
                <button type="button" className="dugme dugme-sade dugme-kucuk" onClick={() => setHasta(null)}>{metin.genel.vazgec}</button>
              </div>
            ) : (
              <>
                <Alan etiket={m.hastaAra}><input type="search" value={sorgu} onChange={(e) => setSorgu(e.target.value)} autoComplete="off" /></Alan>
                {sonuclar.length > 0 && (
                  <ul aria-label={m.hasta} style={{ listStyle: 'none', margin: '6px 0 0', padding: 0, border: '1px solid var(--cizgi)', borderRadius: 12, background: 'var(--beyaz)' }}>
                    {sonuclar.map((s) => (
                      <li key={s.id}>
                        <button type="button" className="dugme dugme-sade dugme-kucuk" style={{ width: '100%', justifyContent: 'flex-start', border: 'none' }} onClick={() => { setHasta({ id: s.id, ad: `${s.ad} ${s.soyad}` }); setSonuclar([]); }}>
                          {s.ad} {s.soyad}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        )}
        {kontrollu && tur !== 'giris' && (
          <Alan etiket={m.sahit}>
            <select value={sahitId} onChange={(e) => setSahitId(e.target.value)} required>
              <option value="">—</option>
              {sahitler.map((s) => <option key={s.id} value={s.id}>{s.adSoyad}</option>)}
            </select>
          </Alan>
        )}
        <Alan etiket={m.aciklamaAlan} genis><input value={aciklama} onChange={(e) => setAciklama(e.target.value)} maxLength={300} required={tur === 'fire' || tur === 'iade' || tur === 'sayim'} /></Alan>
      </div>
      <div><button type="submit" className="dugme" disabled={eksik}>{m.kaydet}</button></div>
    </form>
  );
}

function LotIzleme({ urunId, lotlar }: { urunId: string; lotlar: string[] }) {
  const [lot, setLot] = useState(lotlar[0] ?? '');
  const [sonuc, setSonuc] = useState<{ kullanimlar: { kisiId: string; ad: string; soyad: string; telefon: string | null; zaman: string; sube: string; miktar: number }[] } | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  async function izle(olay: FormEvent) {
    olay.preventDefault();
    setHata(null);
    try {
      setSonuc(await api(`/urunler/${urunId}/lot-izleme?lot=${encodeURIComponent(lot)}`));
    } catch (h) {
      setHata(hataMesaji(h));
    }
  }

  return (
    <section className="kart" aria-label={m.lotIzleme} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <h2>{m.lotIzleme}</h2>
      <p className="ikincil kucuk" style={{ margin: 0 }}>{m.lotIzlemeAciklama}</p>
      <form onSubmit={(e) => void izle(e)} style={{ display: 'flex', gap: 8, alignItems: 'end', flexWrap: 'wrap' }}>
        <Alan etiket={m.lot}><input value={lot} onChange={(e) => setLot(e.target.value)} list="lot-listesi" required /></Alan>
        <datalist id="lot-listesi">{lotlar.map((l) => <option key={l} value={l} />)}</datalist>
        <button type="submit" className="dugme dugme-ikincil dugme-kucuk">{m.izle}</button>
      </form>
      {hata && <div className="kutu kutu-hata" role="alert">{hata}</div>}
      {sonuc && (sonuc.kullanimlar.length === 0 ? (
        <p className="ikincil" style={{ margin: 0 }}>{m.kullanimYok}</p>
      ) : (
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {sonuc.kullanimlar.map((k, i) => (
            <li key={i}><Link href={`/panel/hastalar/${k.kisiId}`}>{k.ad} {k.soyad}</Link> · {tarihBicimle(k.zaman)} · {k.sube} · {k.miktar}</li>
          ))}
        </ul>
      ))}
    </section>
  );
}
