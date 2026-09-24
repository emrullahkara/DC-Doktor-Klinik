'use client';

import { DURUM_GECISLERI, DURUM_IZINLERI, RANDEVU_DURUMLARI, RANDEVU_TURLERI, type RandevuDurumu } from '@dc/shared';
import Link from 'next/link';
import { useState } from 'react';
import { Alan } from '@/bilesenler/Alan';
import { api, hataMesaji } from '@/lib/api';
import { saatBicimle, telefonBicimle } from '@/lib/bicim';
import { useOturum } from '@/lib/oturum';
import { metin } from '@/metin';
import { DURUM_STILI, type Takvim, type TakvimRandevusu } from './tipler';

const m = metin.randevular;

interface Props {
  randevu: TakvimRandevusu;
  takvim: Takvim;
  kapat: () => void;
  degisti: () => Promise<void>;
}

export function RandevuAyrinti({ randevu: r, takvim, kapat, degisti }: Props) {
  const { izinVar } = useOturum();
  const [hata, setHata] = useState<string | null>(null);
  const [iptalAcik, setIptalAcik] = useState(false);
  const [neden, setNeden] = useState('');
  const [calisiyor, setCalisiyor] = useState(false);

  const hekim = takvim.hekimler.find((h) => h.id === r.hekimId);
  const yapilabilir = DURUM_GECISLERI[r.durum].filter((d) => DURUM_IZINLERI[d].some(izinVar));

  async function durumDegistir(durum: RandevuDurumu, iptalNedeni?: string) {
    setHata(null);
    setCalisiyor(true);
    try {
      await api(`/randevular/${r.id}/durum`, { yontem: 'POST', govde: { durum, neden: iptalNedeni } });
      setIptalAcik(false);
      setNeden('');
      await degisti();
    } catch (h) {
      setHata(hataMesaji(h));
    } finally {
      setCalisiyor(false);
    }
  }

  return (
    <section className="kart" aria-label={m.ayrinti} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="kart-baslik" style={{ marginBottom: 0 }}>
        <h2>{m.ayrinti}</h2>
        <button type="button" className="dugme dugme-sade dugme-kucuk" onClick={kapat}>{m.kapat}</button>
      </div>
      <div>
        <div style={{ fontSize: 18, fontWeight: 600 }}>
          {r.hayvan ? `${r.hayvan.ad} · ` : ''}{r.hasta.ad} {r.hasta.soyad}
        </div>
        {r.hasta.telefon && <span className="ikincil kucuk">{telefonBicimle(r.hasta.telefon)}</span>}
      </div>
      <span style={{ ...DURUM_STILI[r.durum], borderRadius: 999, padding: '3px 12px', fontSize: 13, fontWeight: 600, width: 'fit-content' }}>
        {RANDEVU_DURUMLARI[r.durum]}{r.siraNo ? ` · ${m.siraNo} ${r.siraNo}` : ''}
      </span>
      <dl style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr)', gap: '6px 14px', margin: 0, fontSize: 14 }}>
        <dt className="ikincil">{m.saat}</dt>
        <dd style={{ margin: 0 }}>{saatBicimle(r.baslangic)} – {saatBicimle(r.bitis)}</dd>
        <dt className="ikincil">{m.hekim}</dt>
        <dd style={{ margin: 0 }}>{hekim?.adSoyad ?? '—'}</dd>
        <dt className="ikincil">{m.kaynak}</dt>
        <dd style={{ margin: 0 }}>{r.kaynakAd ?? <span className="ikincil">{m.kaynakYok}</span>}</dd>
        <dt className="ikincil">{m.tur}</dt>
        <dd style={{ margin: 0 }}>{RANDEVU_TURLERI[r.tur]}</dd>
        {r.notlar && (
          <>
            <dt className="ikincil">{m.not}</dt>
            <dd style={{ margin: 0 }}>{r.notlar}</dd>
          </>
        )}
        {r.iptalNedeni && (
          <>
            <dt className="ikincil">{m.iptalNedeni}</dt>
            <dd style={{ margin: 0 }}>{r.iptalNedeni}</dd>
          </>
        )}
      </dl>
      <Link href={`/panel/hastalar/${r.hasta.id}`} className="kucuk">{m.hastaKarti}</Link>

      {hata && <div className="kutu kutu-hata" role="alert">{hata}</div>}

      {yapilabilir.length > 0 && !iptalAcik && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {yapilabilir.map((d) => (
            <button
              key={d}
              type="button"
              disabled={calisiyor}
              className={d === 'geldi' || d === 'muayenede' || d === 'tamamlandi' ? 'dugme dugme-kucuk' : 'dugme dugme-sade dugme-kucuk'}
              onClick={() => (d === 'iptal' ? setIptalAcik(true) : void durumDegistir(d))}
            >
              {m.islemler[d]}
            </button>
          ))}
        </div>
      )}
      {iptalAcik && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void durumDegistir('iptal', neden);
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
        >
          <Alan etiket={m.iptalNedeni}>
            <input value={neden} onChange={(e) => setNeden(e.target.value)} maxLength={300} required autoFocus />
          </Alan>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="dugme dugme-kucuk" disabled={!neden.trim() || calisiyor}>{m.iptalOnayla}</button>
            <button type="button" className="dugme dugme-sade dugme-kucuk" onClick={() => setIptalAcik(false)}>{metin.genel.vazgec}</button>
          </div>
        </form>
      )}
    </section>
  );
}
