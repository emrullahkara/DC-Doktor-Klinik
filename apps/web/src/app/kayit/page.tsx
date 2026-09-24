'use client';

import {
  HEKIM_MESLEKLERI,
  KURUM_TIPLERI,
  type KurumTipi,
  MESLEKLER,
  type Meslek,
  profilBirlestir,
  subelereAyir,
} from '@dc/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useMemo, useState } from 'react';
import { Alan } from '@/bilesenler/Alan';
import { Logo } from '@/bilesenler/Logo';
import { api, ApiHatasi, hataMesaji } from '@/lib/api';
import { metin } from '@/metin';
import styles from './kayit.module.css';

const m = metin.kayit;
const TIPLER = Object.entries(KURUM_TIPLERI) as [KurumTipi, (typeof KURUM_TIPLERI)[KurumTipi]][];
const MESLEK_LISTESI = Object.entries(MESLEKLER) as [Meslek, string][];

/** API alan adı → sihirbaz adımı */
const ALAN_ADIMI: Record<string, number> = { kurumTipleri: 0, 'kurum.unvan': 1, 'kurum.vergiNo': 1, 'sube.ad': 1 };

export default function KayitSihirbazi() {
  const router = useRouter();
  const [adim, setAdim] = useState(0);
  const [tipler, setTipler] = useState<KurumTipi[]>([]);
  const [unvan, setUnvan] = useState('');
  const [vergiNo, setVergiNo] = useState('');
  const [subeAdi, setSubeAdi] = useState('Merkez');
  const [adSoyad, setAdSoyad] = useState('');
  const [eposta, setEposta] = useState('');
  const [parola, setParola] = useState('');
  const [parola2, setParola2] = useState('');
  const [meslek, setMeslek] = useState<Meslek | ''>('');
  const [kosullar, setKosullar] = useState(false);
  const [alanHatalari, setAlanHatalari] = useState<Record<string, string>>({});
  const [genelHata, setGenelHata] = useState<string | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  const profil = useMemo(() => profilBirlestir(tipler), [tipler]);
  const subeGruplari = useMemo(() => subelereAyir(tipler), [tipler]);
  const ayriSube = subeGruplari.length > 1;

  function tipDegistir(tip: KurumTipi) {
    setTipler((onceki) => (onceki.includes(tip) ? onceki.filter((t) => t !== tip) : [...onceki, tip]));
  }

  const adimGecerli = [
    tipler.length > 0,
    unvan.trim().length > 0 && subeAdi.trim().length > 0 && (vergiNo === '' || /^\d{10,11}$/.test(vergiNo)),
    adSoyad.trim().length > 0 && eposta.includes('@') && parola.length >= 10 && parola === parola2 && meslek !== '',
    kosullar,
  ];

  async function ilerle(olay: FormEvent) {
    olay.preventDefault();
    if (!adimGecerli[adim]) return;
    if (adim < 3) {
      setAdim(adim + 1);
      return;
    }
    setGenelHata(null);
    setAlanHatalari({});
    setGonderiliyor(true);
    try {
      await api('/kimlik/kayit', {
        yontem: 'POST',
        govde: {
          kurum: { unvan, ...(vergiNo ? { vergiNo } : {}) },
          sube: { ad: subeAdi },
          kurumTipleri: tipler,
          sahip: { adSoyad, eposta, parola, meslek },
        },
      });
      router.replace('/panel');
    } catch (h) {
      setGonderiliyor(false);
      if (h instanceof ApiHatasi) {
        const alanlar = h.alanHatalari();
        if (h.kod === 'EPOSTA_KULLANIMDA') alanlar['sahip.eposta'] = h.message;
        setAlanHatalari(alanlar);
        const ilkAdim = Math.min(...Object.keys(alanlar).map((a) => ALAN_ADIMI[a] ?? 2), 3);
        setAdim(ilkAdim);
      }
      setGenelHata(hataMesaji(h));
    }
  }

  const sahipHekim = meslek !== '' && HEKIM_MESLEKLERI.has(meslek);

  return (
    <div className={styles.sayfa}>
      <header className={styles.ust}>
        <Link href="/giris" aria-label={metin.uygulama.ad}>
          <Logo />
        </Link>
        <ol className={styles.adimlar} aria-label="Kayıt adımları">
          {m.adimlar.map((ad, i) => (
            <li key={ad} className={styles.adimOge} aria-current={i === adim ? 'step' : undefined}>
              <span className={i <= adim ? styles.adimNoAktif : styles.adimNo}>{i + 1}</span>
              <span className={i === adim ? styles.adimAdAktif : styles.adimAd}>{ad}</span>
            </li>
          ))}
        </ol>
      </header>

      <div className={styles.govde}>
        <form className={styles.form} onSubmit={ilerle} noValidate>
          <span className={styles.ustEtiket}>{m.adim(adim + 1, m.adimlar.length)}</span>
          {genelHata && <div className="kutu kutu-hata" role="alert">{genelHata}</div>}

          {adim === 0 && (
            <>
              <div>
                <h1>{m.tip.baslik}</h1>
                <p className="ikincil" style={{ margin: '6px 0 0', maxWidth: 720 }}>{m.tip.aciklama}</p>
              </div>
              <div className={styles.tipIzgara}>
                {TIPLER.map(([kod, tip]) => {
                  const secili = tipler.includes(kod);
                  return (
                    <button key={kod} type="button" aria-pressed={secili} onClick={() => tipDegistir(kod)} className={secili ? styles.tipSecili : styles.tip}>
                      <span className={secili ? styles.kutucukSecili : styles.kutucuk} aria-hidden="true">
                        {secili && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12.5l4.5 4.5L19 7.5" />
                          </svg>
                        )}
                      </span>
                      <span className={styles.tipMetin}>
                        <span className={styles.tipAd}>{tip.ad}</span>
                        <span className="kucuk ikincil">{tip.aciklama}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              {ayriSube && <div className="kutu kutu-bilgi" role="note">{m.tip.ayriSube}</div>}
            </>
          )}

          {adim === 1 && (
            <>
              <div>
                <h1>{m.kurum.baslik}</h1>
                <p className="ikincil" style={{ margin: '6px 0 0' }}>{m.kurum.aciklama}</p>
              </div>
              <div className="form-izgara">
                <Alan etiket={m.kurum.unvan} ipucu={m.kurum.unvanIpucu} hata={alanHatalari['kurum.unvan']} genis>
                  <input value={unvan} onChange={(e) => setUnvan(e.target.value)} required maxLength={200} />
                </Alan>
                <Alan etiket={m.kurum.vergiNo} hata={alanHatalari['kurum.vergiNo']}>
                  <input value={vergiNo} onChange={(e) => setVergiNo(e.target.value.replace(/\D/g, ''))} inputMode="numeric" maxLength={11} />
                </Alan>
                <Alan etiket={m.kurum.subeAdi} ipucu={m.kurum.subeIpucu} hata={alanHatalari['sube.ad']}>
                  <input value={subeAdi} onChange={(e) => setSubeAdi(e.target.value)} required maxLength={120} />
                </Alan>
              </div>
            </>
          )}

          {adim === 2 && (
            <>
              <div>
                <h1>{m.hesap.baslik}</h1>
                <p className="ikincil" style={{ margin: '6px 0 0' }}>{m.hesap.aciklama}</p>
              </div>
              <div className="form-izgara">
                <Alan etiket={m.hesap.adSoyad} hata={alanHatalari['sahip.adSoyad']}>
                  <input value={adSoyad} onChange={(e) => setAdSoyad(e.target.value)} autoComplete="name" required />
                </Alan>
                <Alan etiket={m.hesap.eposta} hata={alanHatalari['sahip.eposta']}>
                  <input type="email" value={eposta} onChange={(e) => setEposta(e.target.value)} autoComplete="email" required />
                </Alan>
                <Alan etiket={m.hesap.parola} ipucu={m.hesap.parolaIpucu} hata={alanHatalari['sahip.parola']}>
                  <input type="password" value={parola} onChange={(e) => setParola(e.target.value)} autoComplete="new-password" minLength={10} required />
                </Alan>
                <Alan etiket={m.hesap.parolaTekrar} hata={parola2 && parola !== parola2 ? m.hesap.parolaUyusmuyor : undefined}>
                  <input type="password" value={parola2} onChange={(e) => setParola2(e.target.value)} autoComplete="new-password" required />
                </Alan>
                <Alan etiket={m.hesap.meslek} hata={alanHatalari['sahip.meslek']}>
                  <select value={meslek} onChange={(e) => setMeslek(e.target.value as Meslek)} required>
                    <option value="" disabled>—</option>
                    {MESLEK_LISTESI.map(([kod, ad]) => (
                      <option key={kod} value={kod}>{ad}</option>
                    ))}
                  </select>
                </Alan>
              </div>
              {meslek !== '' && <div className={sahipHekim ? 'kutu kutu-basari' : 'kutu kutu-uyari'}>{sahipHekim ? m.hesap.hekimBilgi : m.hesap.idariBilgi}</div>}
            </>
          )}

          {adim === 3 && (
            <>
              <h1>{m.onay.baslik}</h1>
              <dl className={styles.ozetListe}>
                <dt>{m.onay.kurumTipleri}</dt>
                <dd>{tipler.map((t) => KURUM_TIPLERI[t].ad).join(', ')}</dd>
                <dt>{m.kurum.unvan}</dt>
                <dd>{unvan}{vergiNo && <span className="ikincil"> · {vergiNo}</span>}</dd>
                <dt>{m.onay.subeler}</dt>
                <dd>
                  {subeGruplari.map((grup, i) => (
                    <div key={grup.join()}>
                      {i > 0 ? `${subeAdi} (Veteriner)` : subeAdi} — <span className="ikincil">{grup.map((t) => KURUM_TIPLERI[t].ad).join(', ')}</span>
                    </div>
                  ))}
                </dd>
                <dt>{m.onay.sahip}</dt>
                <dd>{adSoyad} · {eposta} · {meslek && MESLEKLER[meslek]}</dd>
              </dl>
              <label className={styles.onayKutusu}>
                <input type="checkbox" checked={kosullar} onChange={(e) => setKosullar(e.target.checked)} />
                <span>
                  {m.onay.kosullar}
                  <span className="kucuk ikincil" style={{ display: 'block' }}>{m.onay.kosullarNot}</span>
                </span>
              </label>
            </>
          )}

          <div className={styles.altCubuk}>
            {adim === 0 ? (
              <Link href="/giris" className="dugme dugme-sade">{metin.genel.vazgec}</Link>
            ) : (
              <button type="button" className="dugme dugme-sade" onClick={() => setAdim(adim - 1)}>{metin.genel.geri}</button>
            )}
            <span className="kucuk ikincil" style={{ flex: 1 }}>{adim === 0 && tipler.length > 0 ? m.tip.secildi(tipler.length) : ''}</span>
            <button type="submit" className="dugme" disabled={!adimGecerli[adim] || gonderiliyor}>
              {gonderiliyor ? metin.genel.yukleniyor : adim === 3 ? m.onay.dugme : `${metin.genel.devam}: ${m.adimlar[adim + 1]}`}
            </button>
          </div>
        </form>

        <aside className={styles.ozet} aria-label={m.tip.ozetBaslik}>
          <div>
            <h2>{m.tip.ozetBaslik}</h2>
            <span className="kucuk ikincil">{m.tip.ozetAlt}</span>
          </div>
          {tipler.length === 0 ? (
            <span className="cip cip-notr">{m.tip.bosSecim}</span>
          ) : (
            <>
              <OzetGrubu baslik={m.tip.moduller} ogeler={profil.moduller} />
              <OzetGrubu baslik={m.tip.roller} ogeler={profil.roller} />
              <OzetGrubu baslik={m.tip.belgeler} ogeler={profil.belgeler} />
              <OzetGrubu baslik={m.tip.entegrasyonlar} ogeler={profil.entegrasyonlar} />
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

function OzetGrubu({ baslik, ogeler }: { baslik: string; ogeler: string[] }) {
  if (ogeler.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--petrol)' }}>{baslik}</span>
        <span className="kucuk ikincil">{ogeler.length}</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {ogeler.map((o) => (
          <span key={o} className="cip">{o}</span>
        ))}
      </div>
    </div>
  );
}
