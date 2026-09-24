'use client';

import {
  CINSIYETLER,
  type Cinsiyet,
  UYARI_TURLERI,
  type UyariTuru,
  VITALLER,
  type VitalKodu,
  vitalOlaganDisiMi,
  vkiHesapla,
} from '@dc/shared';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { type FormEvent, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Alan } from '@/bilesenler/Alan';
import { api, hataMesaji } from '@/lib/api';
import { saatBicimle, tarihBicimle, yasHesapla } from '@/lib/bicim';
import { useOturum } from '@/lib/oturum';
import { metin } from '@/metin';
import styles from './muayene.module.css';

const m = metin.muayene;

interface Tani {
  kod: string;
  ad: string;
  tur: 'on' | 'kesin';
  birincil: boolean;
}
interface ReceteKalemi {
  ilac: string;
  doz: string;
  kullanim: string;
  sureGun: number;
  kutu: number;
}
interface Muayene {
  id: string;
  kisiId: string;
  hekimId: string;
  durum: 'taslak' | 'imzali';
  sikayet: string;
  fizikMuayene: string;
  plan: string;
  vitaller: Partial<Record<VitalKodu, number>>;
  vitallerZamani: string | null;
  tanilar: Tani[];
  recete: ReceteKalemi[];
  kontrolTarihi: string | null;
  imzaZamani: string | null;
  icerikOzeti: string | null;
  guncellemeZamani: string;
  hekimAd: string;
  subeAd: string;
  hasta: { id: string; ad: string; soyad: string; dogumTarihi: string | null; cinsiyet: Cinsiyet | null; kimlikNoMaske: string | null; kanGrubu: string | null };
  uyarilar: { id: string; tur: UyariTuru; aciklama: string }[];
  ekler: { id: string; metin: string; zaman: string; yazan: string }[];
  erisimNedeni: string;
  benimKaydim: boolean;
}

type Duzenlenebilir = Pick<Muayene, 'sikayet' | 'fizikMuayene' | 'plan' | 'vitaller' | 'tanilar' | 'recete' | 'kontrolTarihi'>;

export default function MuayeneSayfasi() {
  const { id } = useParams<{ id: string }>();
  const { izinVar } = useOturum();
  const [kayit, setKayit] = useState<Muayene | null>(null);
  const [form, setForm] = useState<Duzenlenebilir | null>(null);
  const [kirli, setKirli] = useState<Set<keyof Duzenlenebilir>>(new Set());
  const [kayitDurumu, setKayitDurumu] = useState<string>('');
  const [hata, setHata] = useState<string | null>(null);
  const [imzaAcik, setImzaAcik] = useState(false);

  const yukle = useCallback(async () => {
    try {
      const k = await api<Muayene>(`/muayeneler/${id}`);
      setKayit(k);
      setForm({ sikayet: k.sikayet, fizikMuayene: k.fizikMuayene, plan: k.plan, vitaller: k.vitaller, tanilar: k.tanilar, recete: k.recete, kontrolTarihi: k.kontrolTarihi });
      setKirli(new Set());
      setKayitDurumu(m.kaydedildi(saatBicimle(k.guncellemeZamani)));
    } catch (h) {
      setHata(hataMesaji(h));
    }
  }, [id]);

  useEffect(() => {
    void yukle();
  }, [yukle]);

  const taslak = kayit?.durum === 'taslak';
  const hemsireYazar = taslak && izinVar('tibbi.kayit.yaz');
  const hekimYazar = taslak && !!kayit?.benimKaydim && izinVar('tani.koy');
  const receteYazar = hekimYazar && izinVar('recete.yaz');

  // Otomatik kayıt: son değişiklikten 1,2 sn sonra yalnızca değişen alanlar gönderilir
  const kirliRef = useRef(kirli);
  kirliRef.current = kirli;
  useEffect(() => {
    if (!form || kirli.size === 0) return;
    const z = setTimeout(async () => {
      const alanlar = [...kirliRef.current];
      const govde = Object.fromEntries(alanlar.map((a) => [a, form[a]]));
      setKayitDurumu(m.kaydediliyor);
      try {
        const sonuc = await api<{ guncellemeZamani: string }>(`/muayeneler/${id}`, { yontem: 'PATCH', govde });
        setKirli((o) => new Set([...o].filter((a) => !alanlar.includes(a))));
        setKayitDurumu(m.kaydedildi(saatBicimle(sonuc.guncellemeZamani)));
        setHata(null);
      } catch (h) {
        setKayitDurumu('');
        setHata(hataMesaji(h));
      }
    }, 1200);
    return () => clearTimeout(z);
  }, [form, kirli, id]);

  function degistir<K extends keyof Duzenlenebilir>(alan: K, deger: Duzenlenebilir[K]) {
    setForm((o) => (o ? { ...o, [alan]: deger } : o));
    setKirli((o) => new Set(o).add(alan));
  }

  if (!kayit || !form) {
    return hata ? <div className="kutu kutu-hata" role="alert">{hata}</div> : <span className="ikincil">{metin.genel.yukleniyor}</span>;
  }

  const yas = yasHesapla(kayit.hasta.dogumTarihi);
  const alerjiler = kayit.uyarilar.filter((u) => u.tur === 'alerji');

  return (
    <>
      <header className="kart" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <h1>
              <Link href={`/panel/hastalar/${kayit.hasta.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{kayit.hasta.ad} {kayit.hasta.soyad}</Link>
            </h1>
            <span className="ikincil">
              {[yas !== null ? metin.hastalar.yas(yas) : null, kayit.hasta.cinsiyet ? CINSIYETLER[kayit.hasta.cinsiyet] : null, kayit.hasta.kanGrubu, kayit.hasta.kimlikNoMaske].filter(Boolean).join(' · ')}
            </span>
          </div>
          <span className="ikincil">{kayit.subeAd} · {kayit.hekimAd}</span>
          <span className={taslak ? 'rozet' : 'rozet rozet-nane'}>{taslak ? 'Taslak' : 'İmzalı'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {kayit.uyarilar.map((u) => (
            <span key={u.id} className={styles.uyariCipi}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 3L2 20h20z" /><path d="M12 10v4M12 17v.5" /></svg>
              {UYARI_TURLERI[u.tur].ad}{u.aciklama && `: ${u.aciklama}`}
            </span>
          ))}
          <span className="kucuk ikincil" style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></svg>
            {m.erisimNotu(m.erisimNedenleri[kayit.erisimNedeni] ?? kayit.erisimNedeni)}
          </span>
        </div>
      </header>

      {!taslak && kayit.imzaZamani && kayit.icerikOzeti && (
        <div className="kutu kutu-basari" role="status">{m.imzali(`${tarihBicimle(kayit.imzaZamani)} ${saatBicimle(kayit.imzaZamani)}`, kayit.icerikOzeti.slice(0, 12))}</div>
      )}
      {taslak && !hemsireYazar && !hekimYazar && <div className="kutu kutu-bilgi">{m.saltOkunur}</div>}
      {hata && <div className="kutu kutu-hata" role="alert">{hata}</div>}

      <div className={styles.duzen}>
        <OncekiMuayeneler kisiId={kayit.kisiId} simdikiId={kayit.id} />

        <section className="kart" style={{ display: 'flex', flexDirection: 'column', gap: 18, flex: 1, minWidth: 0 }}>
          <Alan etiket={m.sikayet}>
            <textarea rows={2} value={form.sikayet} disabled={!hemsireYazar} onChange={(e) => degistir('sikayet', e.target.value)} className={styles.metinAlani} />
          </Alan>

          <Vitaller vitaller={form.vitaller} zaman={kayit.vitallerZamani} duzenlenebilir={!!hemsireYazar} degistir={(v) => degistir('vitaller', v)} />

          <Alan etiket={m.fizik}>
            <textarea rows={3} value={form.fizikMuayene} disabled={!hekimYazar} onChange={(e) => degistir('fizikMuayene', e.target.value)} className={styles.metinAlani} />
          </Alan>

          <Tanilar tanilar={form.tanilar} duzenlenebilir={hekimYazar} degistir={(t) => degistir('tanilar', t)} />

          <Alan etiket={m.plan}>
            <textarea rows={2} value={form.plan} disabled={!hekimYazar} onChange={(e) => degistir('plan', e.target.value)} className={styles.metinAlani} />
          </Alan>
        </section>

        <aside style={{ width: 340, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }} className={styles.yan}>
          <Recete recete={form.recete} duzenlenebilir={receteYazar} taniVar={form.tanilar.length > 0} degistir={(r) => degistir('recete', r)} />
          <KararDestegi alerjiler={alerjiler.map((a) => a.aciklama || UYARI_TURLERI.alerji.ad)} recete={form.recete} vitaller={form.vitaller} />
          <section className="kart">
            <Alan etiket={m.kontrol}>
              <input type="date" value={form.kontrolTarihi ?? ''} disabled={!hekimYazar} min={new Date().toISOString().slice(0, 10)} onChange={(e) => degistir('kontrolTarihi', e.target.value || null)} />
            </Alan>
          </section>
          {!taslak && <EkNotlar kayit={kayit} yenile={yukle} />}
        </aside>
      </div>

      {taslak && (
        <footer className={styles.altCubuk}>
          <span className="kucuk ikincil" role="status" aria-live="polite">{kayitDurumu}</span>
          {kayit.benimKaydim && izinVar('tani.koy') && (
            <button type="button" className="dugme" style={{ marginLeft: 'auto' }} disabled={form.tanilar.length === 0 || kirli.size > 0} title={form.tanilar.length === 0 ? m.taniKural : undefined} onClick={() => setImzaAcik(true)}>
              {m.imzala}
            </button>
          )}
        </footer>
      )}

      {imzaAcik && <ImzaPenceresi id={kayit.id} kapat={() => setImzaAcik(false)} imzalandi={async () => { setImzaAcik(false); await yukle(); }} />}
    </>
  );
}

function Bolum({ baslik, sag, children }: { baslik: string; sag?: ReactNode; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ikincil)' }}>{baslik}</span>
        {sag}
      </div>
      {children}
    </div>
  );
}

function Vitaller({ vitaller, zaman, duzenlenebilir, degistir }: { vitaller: Partial<Record<VitalKodu, number>>; zaman: string | null; duzenlenebilir: boolean; degistir: (v: Partial<Record<VitalKodu, number>>) => void }) {
  const vki = vkiHesapla(vitaller.boy, vitaller.kilo);
  return (
    <Bolum baslik={m.vitaller} sag={zaman && <span className="kucuk ikincil">{m.vitalNot('', `${tarihBicimle(zaman)} ${saatBicimle(zaman)}`)}</span>}>
      <div className={styles.vitalIzgara}>
        {(Object.entries(VITALLER) as [VitalKodu, (typeof VITALLER)[VitalKodu]][]).map(([kod, t]) => {
          const deger = vitaller[kod];
          const disi = deger !== undefined && vitalOlaganDisiMi(kod, deger);
          return (
            <label key={kod} className={disi ? styles.vitalDisi : styles.vital}>
              <span className="kucuk ikincil">{t.ad}</span>
              <input
                type="number"
                inputMode="decimal"
                step={'ondalik' in t ? 0.1 : 1}
                min={t.en}
                max={t.enFazla}
                value={deger ?? ''}
                disabled={!duzenlenebilir}
                onChange={(e) => {
                  const yeni = { ...vitaller };
                  if (e.target.value === '') delete yeni[kod];
                  else yeni[kod] = Number(e.target.value);
                  degistir(yeni);
                }}
              />
              <span className="kucuk" style={{ color: disi ? 'var(--uyari-metin)' : 'var(--ikincil)', fontWeight: disi ? 600 : 400 }}>{disi ? m.olaganDisi : t.birim}</span>
            </label>
          );
        })}
        <div className={styles.vital}>
          <span className="kucuk ikincil">{m.vki}</span>
          <span style={{ fontSize: 18, fontWeight: 600, minHeight: 36, display: 'flex', alignItems: 'center' }}>{vki ?? '—'}</span>
          <span className="kucuk ikincil">kg/m²</span>
        </div>
      </div>
    </Bolum>
  );
}

function Tanilar({ tanilar, duzenlenebilir, degistir }: { tanilar: Tani[]; duzenlenebilir: boolean; degistir: (t: Tani[]) => void }) {
  const [sorgu, setSorgu] = useState('');
  const [sonuclar, setSonuclar] = useState<{ kod: string; ad: string }[]>([]);

  useEffect(() => {
    if (!duzenlenebilir || sorgu.trim().length < 2) {
      setSonuclar([]);
      return;
    }
    const z = setTimeout(() => {
      api<{ kod: string; ad: string }[]>(`/icd10?q=${encodeURIComponent(sorgu.trim())}`).then(setSonuclar).catch(() => setSonuclar([]));
    }, 250);
    return () => clearTimeout(z);
  }, [sorgu, duzenlenebilir]);

  function ekle(t: { kod: string; ad: string }) {
    if (tanilar.some((x) => x.kod === t.kod)) return;
    degistir([...tanilar, { ...t, tur: 'kesin', birincil: tanilar.length === 0 }]);
    setSorgu('');
  }

  function kaldir(kod: string) {
    const kalan = tanilar.filter((t) => t.kod !== kod);
    if (kalan.length && !kalan.some((t) => t.birincil)) kalan[0] = { ...kalan[0]!, birincil: true };
    degistir(kalan);
  }

  return (
    <Bolum baslik={m.tanilar} sag={<span className="kucuk ikincil">{m.taniKural}</span>}>
      {duzenlenebilir && (
        <div style={{ position: 'relative' }}>
          <Alan etiket={m.taniAra}>
            <input type="search" value={sorgu} onChange={(e) => setSorgu(e.target.value)} autoComplete="off" />
          </Alan>
          {sonuclar.length > 0 && (
            <ul className={styles.aramaListesi} aria-label="ICD-10 sonuçları">
              {sonuclar.map((t) => (
                <li key={t.kod}>
                  <button type="button" onClick={() => ekle(t)}>
                    <span className="mono">{t.kod}</span> {t.ad}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tanilar.map((t) => (
          <li key={t.kod} className={styles.taniSatiri}>
            <span className="mono" style={{ color: 'var(--petrol-koyu)' }}>{t.kod}</span>
            <span style={{ flex: 1, minWidth: 0 }}>{t.ad}</span>
            <label className="kucuk" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <input type="radio" name="birincil" checked={t.birincil} disabled={!duzenlenebilir} onChange={() => degistir(tanilar.map((x) => ({ ...x, birincil: x.kod === t.kod })))} />
              {m.birincil}
            </label>
            <select aria-label={`${t.kod} tanı türü`} value={t.tur} disabled={!duzenlenebilir} onChange={(e) => degistir(tanilar.map((x) => (x.kod === t.kod ? { ...x, tur: e.target.value as Tani['tur'] } : x)))} className={styles.kucukSecim}>
              <option value="kesin">Kesin</option>
              <option value="on">Ön tanı</option>
            </select>
            {duzenlenebilir && <button type="button" className="dugme dugme-sade dugme-kucuk" onClick={() => kaldir(t.kod)}>{m.kaldir}</button>}
          </li>
        ))}
      </ul>
    </Bolum>
  );
}

function Recete({ recete, duzenlenebilir, taniVar, degistir }: { recete: ReceteKalemi[]; duzenlenebilir: boolean; taniVar: boolean; degistir: (r: ReceteKalemi[]) => void }) {
  const [ilac, setIlac] = useState('');
  const [doz, setDoz] = useState('');
  const [kullanim, setKullanim] = useState('1x1');
  const [sureGun, setSureGun] = useState(30);
  const [kutu, setKutu] = useState(1);

  function ekle(olay: FormEvent) {
    olay.preventDefault();
    degistir([...recete, { ilac: ilac.trim(), doz: doz.trim(), kullanim: kullanim.trim(), sureGun, kutu }]);
    setIlac('');
    setDoz('');
  }

  return (
    <section className="kart" aria-label={m.recete} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <h2>{m.recete}</h2>
      {recete.map((r, i) => (
        <div key={`${r.ilac}-${i}`} className={styles.receteKalemi}>
          <span style={{ flex: 1 }}>
            <strong>{r.ilac}</strong>
            <span className="kucuk ikincil" style={{ display: 'block' }}>{[r.doz, r.kullanim, `${r.sureGun} gün`, `${r.kutu} kutu`].filter(Boolean).join(' · ')}</span>
          </span>
          {duzenlenebilir && <button type="button" className="dugme dugme-sade dugme-kucuk" onClick={() => degistir(recete.filter((_, j) => j !== i))}>{m.kaldir}</button>}
        </div>
      ))}
      {duzenlenebilir && (
        taniVar ? (
          <form onSubmit={ekle} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Alan etiket={m.ilac}><input value={ilac} onChange={(e) => setIlac(e.target.value)} required minLength={2} /></Alan>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
              <Alan etiket={m.doz}><input value={doz} onChange={(e) => setDoz(e.target.value)} /></Alan>
              <Alan etiket={m.kullanim}><input value={kullanim} onChange={(e) => setKullanim(e.target.value)} required /></Alan>
              <Alan etiket={m.sureGun}><input type="number" min={1} max={365} value={sureGun} onChange={(e) => setSureGun(Number(e.target.value))} /></Alan>
              <Alan etiket={m.kutu}><input type="number" min={1} max={20} value={kutu} onChange={(e) => setKutu(Number(e.target.value))} /></Alan>
            </div>
            <button type="submit" className="dugme dugme-ikincil dugme-kucuk" disabled={ilac.trim().length < 2 || !kullanim.trim()}>+ {m.ilacEkle}</button>
          </form>
        ) : (
          <span className="kutu kutu-uyari kucuk">{m.taniKural}</span>
        )
      )}
      <span className="kucuk ikincil">{m.receteNot}</span>
    </section>
  );
}

function KararDestegi({ alerjiler, recete, vitaller }: { alerjiler: string[]; recete: ReceteKalemi[]; vitaller: Partial<Record<VitalKodu, number>> }) {
  const eslesmeler = recete.flatMap((r) =>
    alerjiler.filter((a) => a.split(/[\s,;]+/).some((k) => k.length >= 4 && r.ilac.toLocaleLowerCase('tr').includes(k.toLocaleLowerCase('tr')))).map((a) => m.alerjiEslesme(r.ilac, a)),
  );
  const vitalUyarilari = (Object.entries(vitaller) as [VitalKodu, number][])
    .filter(([k, d]) => vitalOlaganDisiMi(k, d))
    .map(([k, d]) => m.vitalUyari(VITALLER[k].ad, `${d} ${VITALLER[k].birim}`));
  const kritik = [...eslesmeler];
  const dikkat = [...alerjiler.map((a) => m.alerjiUyari(a)), ...vitalUyarilari];

  return (
    <section className="kart" aria-label={m.kararDestegi} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <h2>{m.kararDestegi}</h2>
      {kritik.map((u) => <div key={u} className="kutu kutu-hata kucuk" role="alert">{u}</div>)}
      {dikkat.map((u) => <div key={u} className="kutu kutu-uyari kucuk">{u}</div>)}
      {kritik.length + dikkat.length === 0 && <div className="kutu kutu-basari kucuk">{m.uyariYok}</div>}
      <span className="kucuk ikincil">{m.kararNot}</span>
    </section>
  );
}

function OncekiMuayeneler({ kisiId, simdikiId }: { kisiId: string; simdikiId: string }) {
  const [liste, setListe] = useState<{ id: string; tarih: string; hekimAd: string; tanilar: Tani[] }[] | null>(null);
  useEffect(() => {
    api<{ muayeneler: { id: string; tarih: string; hekimAd: string; tanilar: Tani[] }[] }>(`/hastalar/${kisiId}/muayeneler`)
      .then((r) => setListe(r.muayeneler.filter((x) => x.id !== simdikiId)))
      .catch(() => setListe([]));
  }, [kisiId, simdikiId]);

  return (
    <aside className={`kart ${styles.solYan}`} aria-label={m.oncekiler}>
      <h2 style={{ marginBottom: 10 }}>{m.oncekiler}</h2>
      {liste === null ? <span className="ikincil kucuk">{metin.genel.yukleniyor}</span> : liste.length === 0 ? <span className="ikincil kucuk">{m.oncekiYok}</span> : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {liste.map((x) => (
            <li key={x.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--cizgi-acik)' }}>
              <Link href={`/panel/muayene/${x.id}`} style={{ fontWeight: 600 }}>{tarihBicimle(x.tarih)}</Link>
              <span className="kucuk ikincil" style={{ display: 'block' }}>{x.hekimAd}</span>
              <span className="kucuk">{x.tanilar.map((t) => t.kod).join(', ')}</span>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

function EkNotlar({ kayit, yenile }: { kayit: Muayene; yenile: () => Promise<void> }) {
  const { izinVar } = useOturum();
  const [metinDegeri, setMetin] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  async function ekle(olay: FormEvent) {
    olay.preventDefault();
    try {
      await api(`/muayeneler/${kayit.id}/ek-not`, { yontem: 'POST', govde: { metin: metinDegeri } });
      setMetin('');
      await yenile();
    } catch (h) {
      setHata(hataMesaji(h));
    }
  }
  return (
    <section className="kart" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <h2>{m.ekNotlar}</h2>
      {kayit.ekler.map((e) => (
        <div key={e.id} style={{ borderBottom: '1px solid var(--cizgi-acik)', paddingBottom: 8 }}>
          <span className="kucuk ikincil">{e.yazan} · {tarihBicimle(e.zaman)} {saatBicimle(e.zaman)}</span>
          <p style={{ margin: '2px 0 0' }}>{e.metin}</p>
        </div>
      ))}
      {izinVar('tibbi.kayit.yaz') && (
        <form onSubmit={ekle} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Alan etiket={m.ekNot}><textarea rows={2} value={metinDegeri} onChange={(e) => setMetin(e.target.value)} className={styles.metinAlani} /></Alan>
          <button type="submit" className="dugme dugme-ikincil dugme-kucuk" disabled={!metinDegeri.trim()}>{m.ekNotEkle}</button>
        </form>
      )}
      {hata && <div className="kutu kutu-hata" role="alert">{hata}</div>}
    </section>
  );
}

function ImzaPenceresi({ id, kapat, imzalandi }: { id: string; kapat: () => void; imzalandi: () => Promise<void> }) {
  const [parola, setParola] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  async function imzala(olay: FormEvent) {
    olay.preventDefault();
    setGonderiliyor(true);
    setHata(null);
    try {
      await api(`/muayeneler/${id}/imzala`, { yontem: 'POST', govde: { parola } });
      await imzalandi();
    } catch (h) {
      setHata(hataMesaji(h));
      setGonderiliyor(false);
    }
  }
  return (
    <div className={styles.perdeArka} role="presentation">
      <form role="dialog" aria-modal="true" aria-labelledby="imza-baslik" className={`kart ${styles.pencere}`} onSubmit={imzala}>
        <h2 id="imza-baslik">{m.imzaBaslik}</h2>
        <p className="ikincil" style={{ margin: 0 }}>{m.imzaAciklama}</p>
        <Alan etiket={m.parola}><input type="password" autoComplete="current-password" value={parola} onChange={(e) => setParola(e.target.value)} autoFocus required /></Alan>
        {hata && <div className="kutu kutu-hata" role="alert">{hata}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="dugme dugme-sade" onClick={kapat}>{metin.genel.vazgec}</button>
          <button type="submit" className="dugme" disabled={!parola || gonderiliyor}>{m.imzaOnay}</button>
        </div>
      </form>
    </div>
  );
}
