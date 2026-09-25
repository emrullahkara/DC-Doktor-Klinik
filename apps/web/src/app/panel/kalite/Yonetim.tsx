'use client';

import {
  DOF_DURUMLARI,
  DOF_KAYNAKLARI,
  type DofDurumu,
  type DofKaynagi,
  OLAY_DURUMLARI,
  OLAY_SIDDETLERI,
  OLAY_TURLERI,
  olayKapatilabilirMi,
  type OlayDurumu,
  type OlaySiddeti,
  type OlayTuru,
  SIKAYET_DURUMLARI,
  SIKAYET_KANALLARI,
  SIKAYET_KATEGORILERI,
  type SikayetDurumu,
  type SikayetKanali,
  type SikayetKategorisi,
} from '@dc/shared';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Alan } from '@/bilesenler/Alan';
import { api, hataMesaji } from '@/lib/api';
import { bugunTarihi, saatBicimle, tarihBicimle } from '@/lib/bicim';
import { useOturum } from '@/lib/oturum';
import { metin } from '@/metin';

const m = metin.kalite;
type Kisi = { id: string; adSoyad: string };

const SIDDET_SINIFI: Record<OlaySiddeti, string> = { zarar_yok: 'rozet', hafif: 'rozet rozet-bilgi', orta: 'rozet rozet-uyari', ciddi: 'rozet rozet-kritik' };
const kalanSinifi = (g: number | null) => (g === null ? 'rozet' : g < 0 ? 'rozet rozet-kritik' : g <= 5 ? 'rozet rozet-uyari' : 'rozet rozet-bilgi');

function useKisiler(acik: boolean) {
  const [kisiler, setKisiler] = useState<Kisi[]>([]);
  useEffect(() => {
    if (acik) api<Kisi[]>('/kalite/kisiler').then(setKisiler).catch(() => undefined);
  }, [acik]);
  return kisiler;
}

// ——— Olaylar ———

interface Olay {
  id: string;
  takipKodu: string;
  tur: OlayTuru;
  siddet: OlaySiddeti;
  olayZamani: string;
  yer: string;
  aciklama: string;
  ilkMudahale: string;
  isimsiz: boolean;
  bildiren: string | null;
  durum: OlayDurumu;
  sorumluId: string | null;
  sorumlu: string | null;
  kokNeden: string | null;
  alinanOnlem: string | null;
  resmiBildirim: string | null;
  hasta: string | null;
}

export function Olaylar({ dofAc }: { dofAc: (olay: { id: string; baslik: string; kokNeden: string }) => void }) {
  const [liste, setListe] = useState<Olay[] | null>(null);
  const [acik, setAcik] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const kisiler = useKisiler(true);
  const yukle = useCallback(() => {
    api<Olay[]>('/olaylar').then(setListe).catch((h) => setHata(hataMesaji(h)));
  }, []);
  useEffect(yukle, [yukle]);

  return (
    <section className="kart" aria-label={m.olaylar} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <h2>{m.olaylar}</h2>
      {hata && <div className="kutu kutu-hata" role="alert">{hata}</div>}
      {liste?.length === 0 && <p className="ikincil" style={{ margin: 0 }}>{m.olayYok}</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {liste?.map((o) => (
          <li key={o.id} style={{ borderBottom: '1px solid var(--cizgi-acik)', padding: '10px 0' }}>
            <button type="button" onClick={() => setAcik(acik === o.id ? null : o.id)} aria-expanded={acik === o.id} className="satir-dugme">
              <span className={SIDDET_SINIFI[o.siddet]}>{OLAY_SIDDETLERI[o.siddet]}</span>
              <strong style={{ flex: 1, minWidth: 180 }}>{OLAY_TURLERI[o.tur]}</strong>
              <span className="kucuk ikincil">{tarihBicimle(o.olayZamani)} {saatBicimle(o.olayZamani)} · {o.isimsiz ? m.isimsizEtiket : o.bildiren}</span>
              <span className={o.durum === 'kapatildi' ? 'rozet rozet-nane' : 'rozet'}>{OLAY_DURUMLARI[o.durum]}</span>
            </button>
            {acik === o.id && <OlayAyrinti olay={o} kisiler={kisiler} degisti={yukle} dofAc={dofAc} />}
          </li>
        ))}
      </ul>
    </section>
  );
}

function OlayAyrinti({ olay, kisiler, degisti, dofAc }: { olay: Olay; kisiler: Kisi[]; degisti: () => void; dofAc: (o: { id: string; baslik: string; kokNeden: string }) => void }) {
  const [sorumluId, setSorumluId] = useState(olay.sorumluId ?? '');
  const [kokNeden, setKokNeden] = useState(olay.kokNeden ?? '');
  const [onlem, setOnlem] = useState(olay.alinanOnlem ?? '');
  const [resmi, setResmi] = useState(olay.resmiBildirim ?? '');
  const [hata, setHata] = useState<string | null>(null);
  const kapali = olay.durum === 'kapatildi';

  async function kaydet(kapat: boolean) {
    setHata(null);
    try {
      await api(`/olaylar/${olay.id}`, { yontem: 'PATCH', govde: { ...(sorumluId ? { sorumluId } : {}), kokNeden, alinanOnlem: onlem, resmiBildirim: resmi, ...(kapat ? { durum: 'kapatildi' } : {}) } });
      degisti();
    } catch (h) {
      setHata(hataMesaji(h));
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 14, marginTop: 8, borderRadius: 12, background: '#f9f8f4' }}>
      <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{olay.aciklama}</p>
      <span className="kucuk ikincil">
        {olay.yer && `${m.yer}: ${olay.yer} · `}{olay.ilkMudahale && `${m.ilkMudahale}: ${olay.ilkMudahale} · `}{olay.hasta && `${metin.stok.hasta}: ${olay.hasta} · `}{m.takipKodu}: <span className="mono">{olay.takipKodu}</span>
      </span>
      {hata && <div className="kutu kutu-hata" role="alert">{hata}</div>}
      <div className="form-izgara">
        <Alan etiket={m.sorumlu}>
          <select value={sorumluId} onChange={(e) => setSorumluId(e.target.value)} disabled={kapali}>
            <option value="">—</option>
            {kisiler.map((k) => <option key={k.id} value={k.id}>{k.adSoyad}</option>)}
          </select>
        </Alan>
        <Alan etiket={m.resmiBildirim} ipucu={m.resmiIpucu}><input value={resmi} onChange={(e) => setResmi(e.target.value)} disabled={kapali} /></Alan>
        <Alan etiket={m.kokNeden} genis><textarea rows={2} value={kokNeden} onChange={(e) => setKokNeden(e.target.value)} disabled={kapali} style={{ padding: 12 }} /></Alan>
        <Alan etiket={m.onlem} genis><textarea rows={2} value={onlem} onChange={(e) => setOnlem(e.target.value)} disabled={kapali} style={{ padding: 12 }} /></Alan>
      </div>
      {!kapali && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="dugme dugme-ikincil dugme-kucuk" onClick={() => void kaydet(false)}>{m.kaydet}</button>
          <button type="button" className="dugme dugme-kucuk" onClick={() => void kaydet(true)} disabled={!olayKapatilabilirMi(olay.siddet, kokNeden, onlem)}>{m.kapat}</button>
          <button type="button" className="dugme dugme-sade dugme-kucuk" onClick={() => dofAc({ id: olay.id, baslik: OLAY_TURLERI[olay.tur], kokNeden })}>{m.dofAc}</button>
        </div>
      )}
    </div>
  );
}

// ——— Şikâyetler ———

interface Sikayet {
  id: string;
  kanal: SikayetKanali;
  kategori: SikayetKategorisi;
  resmiNo: string;
  basvuran: string;
  iletisim: string;
  konu: string;
  aciklama: string;
  alinisGunu: string;
  sonTarih: string;
  durum: SikayetDurumu;
  cevap: string | null;
  cevaplayan: string | null;
  resmi: boolean;
  kalanGun: number | null;
}

export function SikayetFormu({ kaydedildi }: { kaydedildi: () => void }) {
  const [d, setD] = useState({ kanal: 'yuz_yuze' as SikayetKanali, kategori: 'idari' as SikayetKategorisi, resmiNo: '', basvuran: '', iletisim: '', konu: '', aciklama: '', alinisGunu: bugunTarihi() });
  const [hata, setHata] = useState<string | null>(null);
  const degis = (k: keyof typeof d) => (e: { target: { value: string } }) => setD({ ...d, [k]: e.target.value });

  async function gonder(olay: FormEvent) {
    olay.preventDefault();
    setHata(null);
    try {
      await api('/sikayetler', { yontem: 'POST', govde: d });
      setD({ ...d, resmiNo: '', basvuran: '', iletisim: '', konu: '', aciklama: '' });
      kaydedildi();
    } catch (h) {
      setHata(hataMesaji(h));
    }
  }

  return (
    <form onSubmit={(e) => void gonder(e)} aria-label={m.sikayetKaydet} className="kart" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2>{m.sikayetKaydet}</h2>
      {hata && <div className="kutu kutu-hata" role="alert">{hata}</div>}
      <div className="form-izgara">
        <Alan etiket={m.kanal}><select value={d.kanal} onChange={degis('kanal')}>{Object.entries(SIKAYET_KANALLARI).map(([k, a]) => <option key={k} value={k}>{a.ad}</option>)}</select></Alan>
        <Alan etiket={m.kategori}><select value={d.kategori} onChange={degis('kategori')}>{Object.entries(SIKAYET_KATEGORILERI).map(([k, a]) => <option key={k} value={k}>{a}</option>)}</select></Alan>
        {SIKAYET_KANALLARI[d.kanal].resmi && <Alan etiket={m.resmiNo}><input value={d.resmiNo} onChange={degis('resmiNo')} maxLength={60} /></Alan>}
        <Alan etiket={m.alinis}><input type="date" value={d.alinisGunu} max={bugunTarihi()} onChange={degis('alinisGunu')} required /></Alan>
        <Alan etiket={m.basvuran}><input value={d.basvuran} onChange={degis('basvuran')} required minLength={2} /></Alan>
        <Alan etiket={m.iletisim}><input value={d.iletisim} onChange={degis('iletisim')} maxLength={200} /></Alan>
        <Alan etiket={m.konu} genis><input value={d.konu} onChange={degis('konu')} required minLength={3} /></Alan>
        <Alan etiket={m.sikayetAciklama} genis><textarea rows={3} value={d.aciklama} onChange={degis('aciklama')} style={{ padding: 12 }} /></Alan>
      </div>
      <div><button type="submit" className="dugme" disabled={d.basvuran.trim().length < 2 || d.konu.trim().length < 3}>{m.sikayetKaydet}</button></div>
    </form>
  );
}

export function Sikayetler({ yonetebilir, yenile }: { yonetebilir: boolean; yenile: number }) {
  const { izinVar } = useOturum();
  const [liste, setListe] = useState<Sikayet[] | null>(null);
  const [acik, setAcik] = useState<string | null>(null);
  const [cevap, setCevap] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const yukle = useCallback(() => {
    api<Sikayet[]>('/sikayetler').then(setListe).catch((h) => setHata(hataMesaji(h)));
  }, []);
  useEffect(yukle, [yukle, yenile]);

  async function islem(is: () => Promise<unknown>) {
    setHata(null);
    try {
      await is();
      setCevap('');
      yukle();
    } catch (h) {
      setHata(hataMesaji(h));
    }
  }

  return (
    <section className="kart" aria-label={m.sikayetler} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <h2>{m.sikayetler}</h2>
      {hata && <div className="kutu kutu-hata" role="alert">{hata}</div>}
      {liste?.length === 0 && <p className="ikincil" style={{ margin: 0 }}>{m.sikayetYok}</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {liste?.map((s) => (
          <li key={s.id} style={{ borderBottom: '1px solid var(--cizgi-acik)', padding: '10px 0' }}>
            <button type="button" onClick={() => setAcik(acik === s.id ? null : s.id)} aria-expanded={acik === s.id} className="satir-dugme">
              {s.resmi && <span className="rozet rozet-kritik">{m.resmi} · {SIKAYET_KANALLARI[s.kanal].ad}</span>}
              <strong style={{ flex: 1, minWidth: 180 }}>{s.konu}</strong>
              <span className="kucuk ikincil">{SIKAYET_KATEGORILERI[s.kategori]} · {s.basvuran}</span>
              {s.kalanGun !== null ? <span className={kalanSinifi(s.kalanGun)}>{m.kalan(s.kalanGun)}</span> : <span className="rozet rozet-nane">{SIKAYET_DURUMLARI[s.durum]}</span>}
            </button>
            {acik === s.id && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 14, marginTop: 8, borderRadius: 12, background: '#f9f8f4' }}>
                {s.aciklama && <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{s.aciklama}</p>}
                <span className="kucuk ikincil">
                  {m.alinis}: {tarihBicimle(s.alinisGunu)} · {m.sonTarih}: {tarihBicimle(s.sonTarih)}{s.resmiNo && ` · ${m.resmiNo}: ${s.resmiNo}`}{s.iletisim && ` · ${s.iletisim}`}
                </span>
                {s.cevap && <div className="kutu kutu-bilgi" style={{ flexDirection: 'column', gap: 4 }}><strong>{m.cevap} · {s.cevaplayan}</strong><span style={{ whiteSpace: 'pre-wrap' }}>{s.cevap}</span></div>}
                {yonetebilir && s.durum === 'acik' && (
                  <form onSubmit={(e) => { e.preventDefault(); void islem(() => api(`/sikayetler/${s.id}/cevap`, { yontem: 'POST', govde: { cevap } })); }} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {s.kategori === 'tibbi' && !izinVar('tibbi.kayit.denetim') && <div className="kutu kutu-uyari">{m.tibbiNot}</div>}
                    <Alan etiket={m.cevap}><textarea rows={3} value={cevap} onChange={(e) => setCevap(e.target.value)} minLength={10} required style={{ padding: 12 }} /></Alan>
                    <div><button type="submit" className="dugme dugme-kucuk" disabled={cevap.trim().length < 10}>{m.cevapla}</button></div>
                  </form>
                )}
                {yonetebilir && s.durum === 'cevaplandi' && (
                  <div><button type="button" className="dugme dugme-sade dugme-kucuk" onClick={() => void islem(() => api(`/sikayetler/${s.id}/kapat`, { yontem: 'POST' }))}>{m.sikayetKapat}</button></div>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

// ——— DÖF ———

interface Dof {
  id: string;
  kaynak: DofKaynagi;
  baslik: string;
  kokNeden: string;
  aksiyon: string;
  sorumluId: string;
  sorumlu: string;
  termin: string;
  durum: DofDurumu;
  tamamlamaNotu: string | null;
  tamamlayanId: string | null;
  tamamlayan: string | null;
  dogrulamaNotu: string | null;
  dogrulayan: string | null;
  kalanGun: number | null;
}

export interface DofTaslagi {
  kaynak: DofKaynagi;
  olayId?: string;
  baslik: string;
  kokNeden: string;
}

export function DofFormu({ taslak, kaydedildi }: { taslak: DofTaslagi; kaydedildi: () => void }) {
  const kisiler = useKisiler(true);
  const [d, setD] = useState({ baslik: taslak.baslik, kokNeden: taslak.kokNeden, aksiyon: '', sorumluId: '', termin: '' });
  const [hata, setHata] = useState<string | null>(null);
  const degis = (k: keyof typeof d) => (e: { target: { value: string } }) => setD({ ...d, [k]: e.target.value });

  async function gonder(olay: FormEvent) {
    olay.preventDefault();
    setHata(null);
    try {
      await api('/dofler', { yontem: 'POST', govde: { kaynak: taslak.kaynak, ...(taslak.olayId ? { olayId: taslak.olayId } : {}), ...d } });
      kaydedildi();
    } catch (h) {
      setHata(hataMesaji(h));
    }
  }

  return (
    <form onSubmit={(e) => void gonder(e)} aria-label={m.dofAc} className="kart" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2>{m.dofAc} <span className="kucuk ikincil">· {DOF_KAYNAKLARI[taslak.kaynak]}</span></h2>
      {hata && <div className="kutu kutu-hata" role="alert">{hata}</div>}
      <div className="form-izgara">
        <Alan etiket={m.dofBaslik} genis><input value={d.baslik} onChange={degis('baslik')} required minLength={3} /></Alan>
        <Alan etiket={m.kokNeden} genis><input value={d.kokNeden} onChange={degis('kokNeden')} /></Alan>
        <Alan etiket={m.aksiyon} genis><textarea rows={2} value={d.aksiyon} onChange={degis('aksiyon')} required minLength={3} style={{ padding: 12 }} /></Alan>
        <Alan etiket={m.sorumlu}>
          <select value={d.sorumluId} onChange={degis('sorumluId')} required>
            <option value="">—</option>
            {kisiler.map((k) => <option key={k.id} value={k.id}>{k.adSoyad}</option>)}
          </select>
        </Alan>
        <Alan etiket={m.termin}><input type="date" value={d.termin} min={bugunTarihi()} onChange={degis('termin')} required /></Alan>
      </div>
      <div><button type="submit" className="dugme" disabled={!d.sorumluId || !d.termin || d.aksiyon.trim().length < 3}>{m.dofAc}</button></div>
    </form>
  );
}

export function Dofler({ yonetebilir, yenile }: { yonetebilir: boolean; yenile: number }) {
  const { ben } = useOturum();
  const [liste, setListe] = useState<Dof[] | null>(null);
  const [not, setNot] = useState<Record<string, string>>({});
  const [hata, setHata] = useState<string | null>(null);
  const yukle = useCallback(() => {
    api<Dof[]>('/dofler').then(setListe).catch((h) => setHata(hataMesaji(h)));
  }, []);
  useEffect(yukle, [yukle, yenile]);

  async function islem(id: string, eylem: 'tamamla' | 'dogrula') {
    setHata(null);
    try {
      await api(`/dofler/${id}/${eylem}`, { yontem: 'POST', govde: { not: not[id] ?? '' } });
      setNot({ ...not, [id]: '' });
      yukle();
    } catch (h) {
      setHata(hataMesaji(h));
    }
  }

  if (!liste || (!yonetebilir && liste.length === 0)) return null;
  return (
    <section className="kart" aria-label={yonetebilir ? m.dofler : m.doflerim} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <h2>{yonetebilir ? m.dofler : m.doflerim}</h2>
      {hata && <div className="kutu kutu-hata" role="alert">{hata}</div>}
      {liste.length === 0 && <p className="ikincil" style={{ margin: 0 }}>{m.dofYok}</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {liste.map((d) => {
          const tamamlayabilir = d.durum === 'acik' && (d.sorumluId === ben.kullanici.id || yonetebilir);
          const dogrulayabilir = d.durum === 'tamamlandi' && yonetebilir;
          return (
            <li key={d.id} style={{ borderBottom: '1px solid var(--cizgi-acik)', padding: '10px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <strong style={{ flex: 1, minWidth: 180 }}>{d.baslik}</strong>
                <span className="kucuk ikincil">{m.sorumlu}: {d.sorumlu} · {m.termin}: {tarihBicimle(d.termin)}</span>
                {d.kalanGun !== null ? <span className={kalanSinifi(d.kalanGun)}>{m.kalan(d.kalanGun)}</span> : <span className={d.durum === 'dogrulandi' ? 'rozet rozet-nane' : 'rozet rozet-uyari'}>{DOF_DURUMLARI[d.durum]}</span>}
              </div>
              <span className="kucuk">{m.aksiyon}: {d.aksiyon}{d.kokNeden && <span className="ikincil"> · {m.kokNeden}: {d.kokNeden}</span>}</span>
              {d.tamamlamaNotu && <span className="kucuk ikincil">{d.tamamlayan}: {d.tamamlamaNotu}</span>}
              {d.dogrulamaNotu && <span className="kucuk ikincil">{d.dogrulayan}: {d.dogrulamaNotu}</span>}
              {(tamamlayabilir || dogrulayabilir) && (
                <form onSubmit={(e) => { e.preventDefault(); void islem(d.id, tamamlayabilir ? 'tamamla' : 'dogrula'); }} style={{ display: 'flex', gap: 8, alignItems: 'end', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <Alan etiket={tamamlayabilir ? m.tamamlaNot : m.dogrulaNot} ipucu={dogrulayabilir && d.tamamlayanId === ben.kullanici.id ? m.kendiDofNot : undefined}>
                      <input value={not[d.id] ?? ''} onChange={(e) => setNot({ ...not, [d.id]: e.target.value })} minLength={5} required />
                    </Alan>
                  </div>
                  <button type="submit" className="dugme dugme-kucuk" disabled={(not[d.id] ?? '').trim().length < 5 || (dogrulayabilir && d.tamamlayanId === ben.kullanici.id)}>
                    {tamamlayabilir ? m.tamamla : m.dogrula}
                  </button>
                </form>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
