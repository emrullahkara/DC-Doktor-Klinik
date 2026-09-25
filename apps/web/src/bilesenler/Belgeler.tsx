'use client';

import type { AlarmSeviyesi, BelgeDurumu } from '@dc/shared';
import { type FormEvent, useRef, useState } from 'react';
import { Alan } from '@/bilesenler/Alan';
import { api, ApiHatasi, dosyaIndir, hataMesaji } from '@/lib/api';
import { tarihBicimle } from '@/lib/bicim';
import { metin } from '@/metin';

const m = metin.belge;

export interface Belge {
  id: string;
  kapsam: 'personel' | 'kurum';
  tur: string;
  turAd: string;
  belgeNo: string;
  verenKurum: string;
  baslangic: string | null;
  bitis: string | null;
  aciklama: string;
  zaman: string;
  kaldirmaZamani: string | null;
  kaldirmaNedeni: string | null;
  durum: BelgeDurumu;
  kalanGun: number | null;
  seviye: AlarmSeviyesi | null;
  dosya: { ad: string; icerikTuru: string; boyut: number } | null;
  ekleyen: string;
  guncel?: boolean;
  kendiEkledi?: boolean;
}

const SEVIYE_SINIFI: Record<string, string> = { kritik: 'rozet rozet-kritik', ciddi: 'rozet rozet-uyari', uyari: 'rozet rozet-bilgi', eksik: 'rozet rozet-uyari' };

/** Süre durumu: renk + metin (renk tek başına anlam taşımaz). */
export function DurumRozeti({ durum, kalanGun, seviye }: { durum: BelgeDurumu | 'eksik'; kalanGun: number | null; seviye: AlarmSeviyesi | null }) {
  if (durum === 'eksik') return <span className={SEVIYE_SINIFI.eksik}>{m.durum.eksik}</span>;
  if (durum === 'suresiz') return <span className="rozet">{m.durum.suresiz}</span>;
  if (durum === 'gecerli') return <span className="rozet rozet-nane">{m.durum.gecerli}</span>;
  const metinDurum = durum === 'dolmus' ? m.durum.dolmus(-(kalanGun ?? 0)) : kalanGun === 0 ? m.durum.bugun : m.durum.kalan(kalanGun ?? 0);
  return <span className={SEVIYE_SINIFI[seviye ?? 'uyari']}>{metinDurum}</span>;
}

function boyutBicimle(b: number): string {
  return b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;
}

/** Güncel belgeler tablosu; önceki sürümler ve kaldırılanlar katlanmış bölümde. */
export function BelgeListesi({ belgeler, yonetebilir, degisti }: { belgeler: Belge[]; yonetebilir: boolean; degisti: () => void }) {
  const [hata, setHata] = useState<string | null>(null);
  const [kaldirilan, setKaldirilan] = useState<string | null>(null);
  const [neden, setNeden] = useState('');
  const guncel = belgeler.filter((b) => !b.kaldirmaZamani && b.guncel !== false);
  const gecmis = belgeler.filter((b) => b.kaldirmaZamani || b.guncel === false);

  async function indir(b: Belge) {
    setHata(null);
    try {
      await dosyaIndir(`/belgeler/${b.id}/dosya`, b.dosya?.ad ?? 'belge');
    } catch (h) {
      setHata(hataMesaji(h));
    }
  }

  async function kaldir(olay: FormEvent, id: string) {
    olay.preventDefault();
    setHata(null);
    try {
      await api(`/belgeler/${id}/kaldir`, { yontem: 'POST', govde: { neden } });
      setKaldirilan(null);
      setNeden('');
      degisti();
    } catch (h) {
      setHata(hataMesaji(h));
    }
  }

  const satir = (b: Belge, eski: boolean) => (
    <tr key={b.id} style={eski ? { opacity: 0.75 } : undefined}>
      <td>
        <strong style={{ fontWeight: 600 }}>{b.turAd}</strong>
        <span className="kucuk ikincil" style={{ display: 'block' }}>
          {[b.belgeNo, b.verenKurum].filter(Boolean).join(' · ') || '—'}
        </span>
        {b.aciklama && <span className="kucuk ikincil" style={{ display: 'block' }}>{b.aciklama}</span>}
        <span className="kucuk ikincil" style={{ display: 'block' }}>
          {m.ekleyen}: {b.ekleyen} · {tarihBicimle(b.zaman)}
          {b.kendiEkledi && ` (${m.kendiEkledi})`}
        </span>
      </td>
      <td style={{ whiteSpace: 'nowrap' }}>{b.bitis ? tarihBicimle(b.bitis) : '—'}</td>
      <td>
        {b.kaldirmaZamani ? (
          <span className="rozet">{m.kaldirildi(b.kaldirmaNedeni ?? '')}</span>
        ) : eski ? (
          <span className="rozet">{m.eskiSurum}</span>
        ) : (
          <DurumRozeti durum={b.durum} kalanGun={b.kalanGun} seviye={b.seviye} />
        )}
      </td>
      <td style={{ textAlign: 'right' }}>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          {b.dosya ? (
            <button type="button" className="dugme dugme-sade dugme-kucuk" onClick={() => void indir(b)} aria-label={`${m.indir}: ${b.turAd} (${b.dosya.ad})`}>
              {m.indir} <span className="kucuk ikincil">{boyutBicimle(b.dosya.boyut)}</span>
            </button>
          ) : (
            <span className="kucuk ikincil">{m.dosyaYok}</span>
          )}
          {yonetebilir && !b.kaldirmaZamani && (
            <button type="button" className="dugme dugme-sade dugme-kucuk" onClick={() => setKaldirilan(kaldirilan === b.id ? null : b.id)} aria-expanded={kaldirilan === b.id}>
              {m.kaldir}
            </button>
          )}
        </div>
        {kaldirilan === b.id && (
          <form onSubmit={(e) => void kaldir(e, b.id)} style={{ display: 'flex', gap: 8, alignItems: 'end', marginTop: 8, textAlign: 'left' }}>
            <div style={{ flex: 1 }}><Alan etiket={m.kaldirNedeni}><input value={neden} onChange={(e) => setNeden(e.target.value)} minLength={3} required /></Alan></div>
            <button type="submit" className="dugme dugme-kucuk" disabled={neden.trim().length < 3}>{m.kaldir}</button>
          </form>
        )}
      </td>
    </tr>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {hata && <div className="kutu kutu-hata" role="alert">{hata}</div>}
      {guncel.length === 0 ? (
        <p className="ikincil" style={{ margin: 0 }}>{m.belgeYok}</p>
      ) : (
        <div className="tablo-kaydir">
          <table className="tablo">
            <thead>
              <tr><th>{m.tur}</th><th>{m.bitis}</th><th>{metin.personel.belgeler}</th><th><span className="gizli">{m.indir}</span></th></tr>
            </thead>
            <tbody>{guncel.map((b) => satir(b, false))}</tbody>
          </table>
        </div>
      )}
      {gecmis.length > 0 && (
        <details>
          <summary style={{ cursor: 'pointer', fontWeight: 600, minHeight: 32 }}>{m.gecmis(gecmis.length)}</summary>
          <div className="tablo-kaydir">
            <table className="tablo"><tbody>{gecmis.map((b) => satir(b, true))}</tbody></table>
          </div>
        </details>
      )}
    </div>
  );
}

export interface BelgeTuruSecenegi {
  kod: string;
  ad: string;
  sureli: boolean;
}

/** Belge ekleme formu (çok parçalı: alanlar + isteğe bağlı dosya). */
export function BelgeFormu({
  kapsam,
  kullaniciId,
  subeler,
  turler,
  secilenTur,
  eklendi,
}: {
  kapsam: 'personel' | 'kurum';
  kullaniciId?: string;
  subeler?: { id: string; ad: string }[];
  turler: BelgeTuruSecenegi[];
  secilenTur?: string;
  eklendi: () => void;
}) {
  const [tur, setTur] = useState(secilenTur ?? '');
  const [subeId, setSubeId] = useState(subeler?.[0]?.id ?? '');
  const [belgeNo, setBelgeNo] = useState('');
  const [verenKurum, setVerenKurum] = useState('');
  const [baslangic, setBaslangic] = useState('');
  const [bitis, setBitis] = useState('');
  const [aciklama, setAciklama] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const [alanHatalari, setAlanHatalari] = useState<Record<string, string>>({});
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const dosyaRef = useRef<HTMLInputElement>(null);
  const secili = turler.find((t) => t.kod === tur);

  async function gonder(olay: FormEvent) {
    olay.preventDefault();
    setHata(null);
    setAlanHatalari({});
    const form = new FormData();
    form.set('kapsam', kapsam);
    if (kullaniciId) form.set('kullaniciId', kullaniciId);
    if (kapsam === 'kurum' && subeId) form.set('subeId', subeId);
    for (const [k, v] of Object.entries({ tur, belgeNo, verenKurum, baslangic, bitis, aciklama })) if (v) form.set(k, v);
    const dosya = dosyaRef.current?.files?.[0];
    if (dosya) form.set('dosya', dosya);
    setGonderiliyor(true);
    try {
      await api('/belgeler', { yontem: 'POST', govde: form });
      setBelgeNo(''); setVerenKurum(''); setBaslangic(''); setBitis(''); setAciklama('');
      if (dosyaRef.current) dosyaRef.current.value = '';
      eklendi();
    } catch (h) {
      setHata(hataMesaji(h));
      if (h instanceof ApiHatasi) setAlanHatalari(h.alanHatalari());
    } finally {
      setGonderiliyor(false);
    }
  }

  return (
    <form onSubmit={gonder} aria-label={m.ekle} style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16, borderRadius: 12, background: '#f9f8f4' }}>
      {hata && <div className="kutu kutu-hata" role="alert">{hata}</div>}
      <div className="form-izgara">
        <Alan etiket={m.tur} hata={alanHatalari.tur}>
          <select value={tur} onChange={(e) => setTur(e.target.value)} required>
            <option value="">—</option>
            {turler.map((t) => <option key={t.kod} value={t.kod}>{t.ad}</option>)}
          </select>
        </Alan>
        {subeler && (
          <Alan etiket={metin.kurumBelgeleri.sube}>
            <select value={subeId} onChange={(e) => setSubeId(e.target.value)}>
              {subeler.map((s) => <option key={s.id} value={s.id}>{s.ad}</option>)}
              <option value="">{metin.kurumBelgeleri.tumIsletme}</option>
            </select>
          </Alan>
        )}
        <Alan etiket={m.belgeNo}><input value={belgeNo} onChange={(e) => setBelgeNo(e.target.value)} maxLength={100} /></Alan>
        <Alan etiket={m.verenKurum}><input value={verenKurum} onChange={(e) => setVerenKurum(e.target.value)} maxLength={200} /></Alan>
        <Alan etiket={m.baslangic}><input type="date" value={baslangic} onChange={(e) => setBaslangic(e.target.value)} /></Alan>
        <Alan etiket={m.bitis} ipucu={secili?.sureli ? m.bitisZorunlu : undefined} hata={alanHatalari.bitis}>
          <input type="date" value={bitis} onChange={(e) => setBitis(e.target.value)} required={secili?.sureli} min={baslangic || undefined} />
        </Alan>
        <Alan etiket={m.aciklama} genis><input value={aciklama} onChange={(e) => setAciklama(e.target.value)} maxLength={500} /></Alan>
        <Alan etiket={m.dosya} genis><input ref={dosyaRef} type="file" accept="application/pdf,image/jpeg,image/png" style={{ paddingTop: 10 }} /></Alan>
      </div>
      <div>
        <button type="submit" className="dugme" disabled={!tur || gonderiliyor || (secili?.sureli && !bitis)}>{m.ekle}</button>
      </div>
    </form>
  );
}
