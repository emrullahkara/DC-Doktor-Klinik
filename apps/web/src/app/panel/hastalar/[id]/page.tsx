'use client';

import {
  AYDINLATMA_KANALLARI,
  type AydinlatmaKanali,
  CINSIYETLER,
  type Cinsiyet,
  HAYVAN_TURLERI,
  type HayvanTuru,
  ILETISIM_TERCIHLERI,
  type IletisimTercihi,
  KIMLIK_TURLERI,
  type KimlikTuru,
  RIZA_TURLERI,
  type RizaTuru,
  UYARI_TURLERI,
  UYARI_YAZMA_IZNI,
  type UyariTuru,
} from '@dc/shared';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { type FormEvent, type ReactNode, useCallback, useEffect, useState } from 'react';
import { Alan } from '@/bilesenler/Alan';
import { api, ApiHatasi, hataMesaji } from '@/lib/api';
import { tarihBicimle, telefonBicimle, yasHesapla } from '@/lib/bicim';
import { useOturum } from '@/lib/oturum';
import { metin } from '@/metin';
import { HesapKarti } from './HesapKarti';

const m = metin.hastalar;
const k = m.kart;

interface Uyari {
  id: string;
  tur: UyariTuru;
  aciklama: string;
}

interface HastaKarti {
  id: string;
  ad: string;
  soyad: string;
  dogumTarihi: string | null;
  cinsiyet: Cinsiyet | null;
  kimlikTuru: KimlikTuru;
  kimlikNoMaske: string | null;
  telefon: string | null;
  uyruk: string | null;
  eposta: string | null;
  adres: string | null;
  kanGrubu: string | null;
  iletisimTercihi: IletisimTercihi | null;
  acilKisiAd: string | null;
  acilKisiTelefon: string | null;
  acilKisiYakinlik: string | null;
  temsilciAd: string | null;
  temsilciTelefon: string | null;
  temsilciYakinlik: string | null;
  uyarilar: Uyari[];
  hayvanlar: { id: string; ad: string; tur: HayvanTuru; irk: string | null; cinsiyet: string | null; kisirlastirilmis: boolean | null; dogumTarihi: string | null; mikrocipNo: string | null; uyarilar: Uyari[] }[];
  rizalar: { tur: RizaTuru; verildi: boolean; kayitli: boolean; zaman: string | null }[];
  aydinlatma: { metinSurumu: string; kanal: string; zaman: string } | null;
}

const UYARI_RENGI = {
  klinik: { background: 'var(--kritik-zemin)', color: '#8f1c13', borderColor: '#f0c4be' },
  idari: { background: 'var(--uyari-zemin)', color: '#5e3d09', borderColor: '#f2d49c' },
  herkes: { background: 'var(--bilgi-zemin)', color: 'var(--bilgi)', borderColor: '#c9dcf0' },
} as const;

export default function HastaKartiSayfasi() {
  const { id } = useParams<{ id: string }>();
  const { ben, izinVar } = useOturum();
  const [kart, setKart] = useState<HastaKarti | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [bildirim, setBildirim] = useState<string | null>(null);
  const [acikKimlik, setAcikKimlik] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    try {
      setKart(await api<HastaKarti>(`/hastalar/${id}`));
    } catch (h) {
      setHata(hataMesaji(h));
    }
  }, [id]);

  useEffect(() => {
    void yukle();
  }, [yukle]);

  const islem = async (is: () => Promise<unknown>) => {
    setHata(null);
    setBildirim(null);
    try {
      await is();
      setBildirim(k.kaydedildi);
      await yukle();
    } catch (h) {
      setHata(hataMesaji(h));
    }
  };

  if (!kart) {
    return hata ? <div className="kutu kutu-hata" role="alert">{hata}</div> : <span className="ikincil">{metin.genel.yukleniyor}</span>;
  }

  const yas = yasHesapla(kart.dogumTarihi);
  const kaydedebilir = izinVar('hasta.kaydet');
  const veterinerVar = ben.subeler.some((s) => s.kurumTipleri.includes('veteriner'));

  return (
    <>
      <Link href="/panel/hastalar" className="kucuk">← {m.baslik}</Link>

      <header className="kart" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <span aria-hidden="true" style={{ width: 52, height: 52, borderRadius: 26, background: 'var(--nane)', color: 'var(--petrol)', fontWeight: 600, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {`${kart.ad[0] ?? ''}${kart.soyad[0] ?? ''}`.toLocaleUpperCase('tr')}
          </span>
          <div style={{ flex: 1, minWidth: 220 }}>
            <h1>{kart.ad} {kart.soyad}</h1>
            <span className="ikincil">
              {[yas !== null ? m.yas(yas) : null, kart.cinsiyet ? CINSIYETLER[kart.cinsiyet] : null, kart.dogumTarihi ? tarihBicimle(kart.dogumTarihi) : null, kart.kanGrubu].filter(Boolean).join(' · ')}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span className="ikincil kucuk">{KIMLIK_TURLERI[kart.kimlikTuru]}</span>
            {kart.kimlikNoMaske && <span className="mono" style={{ fontSize: 15 }}>{acikKimlik ?? kart.kimlikNoMaske}</span>}
            {kart.kimlikNoMaske && kaydedebilir && (
              <button
                type="button"
                className="dugme dugme-sade dugme-kucuk"
                title={k.gosterIpucu}
                onClick={() => {
                  if (acikKimlik) return setAcikKimlik(null);
                  api<{ no: string }>(`/hastalar/${id}/kimlik-no`).then((r) => setAcikKimlik(r.no)).catch((h) => setHata(hataMesaji(h)));
                }}
              >
                {acikKimlik ? k.gizle : k.goster}
              </button>
            )}
          </div>
        </div>
        {kart.uyarilar.length > 0 && (
          <ul aria-label={k.uyarilar} style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {kart.uyarilar.map((u) => (
              <li key={u.id} style={{ ...UYARI_RENGI[UYARI_TURLERI[u.tur].gizlilik], border: '1px solid', borderRadius: 8, padding: '5px 10px', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 3L2 20h20z" /><path d="M12 10v4M12 17v.5" /></svg>
                {UYARI_TURLERI[u.tur].ad}{u.aciklama && `: ${u.aciklama}`}
              </li>
            ))}
          </ul>
        )}
      </header>

      {hata && <div className="kutu kutu-hata" role="alert">{hata}</div>}
      {bildirim && <div className="kutu kutu-basari" role="status">{bildirim}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, alignItems: 'start' }}>
        <Kart baslik={k.kisisel}>
          <Bilgiler
            satirlar={[
              [m.form.telefon, telefonBicimle(kart.telefon)],
              [m.form.eposta, kart.eposta],
              [m.form.adres, kart.adres],
              [m.form.uyruk, kart.uyruk],
              [m.form.iletisimTercihi, kart.iletisimTercihi ? ILETISIM_TERCIHLERI[kart.iletisimTercihi] : null],
              [k.acil, kart.acilKisiAd ? [kart.acilKisiAd, kart.acilKisiYakinlik, telefonBicimle(kart.acilKisiTelefon)].filter(Boolean).join(' · ') : null],
              [k.temsilci, kart.temsilciAd ? [kart.temsilciAd, kart.temsilciYakinlik, telefonBicimle(kart.temsilciTelefon)].filter(Boolean).join(' · ') : null],
            ]}
          />
        </Kart>

        <UyarilarKarti kart={kart} islem={islem} />

        <KvkkKarti kart={kart} kaydedebilir={kaydedebilir} islem={islem} />

        {veterinerVar && <HayvanlarKarti kart={kart} kaydedebilir={kaydedebilir} islem={islem} />}

        {(izinVar('tibbi.kayit.goruntule') || izinVar('tibbi.kayit.denetim')) && <MuayeneGecmisi hastaId={kart.id} />}

        {(izinVar('finans.tahsilat') || izinVar('finans.goruntule')) && <HesapKarti hastaId={kart.id} />}
      </div>
    </>
  );
}

type Islem = (is: () => Promise<unknown>) => Promise<void>;

function Kart({ baslik, children }: { baslik: string; children: ReactNode }) {
  return (
    <section className="kart" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2>{baslik}</h2>
      {children}
    </section>
  );
}

function Bilgiler({ satirlar }: { satirlar: [string, string | null][] }) {
  return (
    <dl style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, auto) minmax(0, 1fr)', gap: '8px 16px', margin: 0 }}>
      {satirlar.map(([ad, deger]) => (
        <div key={ad} style={{ display: 'contents' }}>
          <dt className="ikincil kucuk">{ad}</dt>
          <dd style={{ margin: 0 }}>{deger && deger !== '—' ? deger : <span className="ikincil">{k.yok}</span>}</dd>
        </div>
      ))}
    </dl>
  );
}

function UyarilarKarti({ kart, islem }: { kart: HastaKarti; islem: Islem }) {
  const { izinVar } = useOturum();
  const yazilabilir = (Object.keys(UYARI_TURLERI) as UyariTuru[]).filter((t) => izinVar(UYARI_YAZMA_IZNI[UYARI_TURLERI[t].gizlilik]));
  const [tur, setTur] = useState<UyariTuru | ''>('');
  const [aciklama, setAciklama] = useState('');

  function ekle(olay: FormEvent) {
    olay.preventDefault();
    if (!tur) return;
    void islem(async () => {
      await api(`/hastalar/${kart.id}/uyarilar`, { yontem: 'POST', govde: { tur, aciklama } });
      setTur('');
      setAciklama('');
    });
  }

  return (
    <Kart baslik={k.uyarilar}>
      {kart.uyarilar.length === 0 ? (
        <span className="ikincil">{k.uyariYok}</span>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {kart.uyarilar.map((u) => (
            <li key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--cizgi-acik)' }}>
              <span style={{ flex: 1 }}>
                <strong>{UYARI_TURLERI[u.tur].ad}</strong>
                {u.aciklama && <span className="ikincil"> — {u.aciklama}</span>}
              </span>
              {izinVar(UYARI_YAZMA_IZNI[UYARI_TURLERI[u.tur].gizlilik]) && (
                <button type="button" className="dugme dugme-sade dugme-kucuk" onClick={() => void islem(() => api(`/hastalar/${kart.id}/uyarilar/${u.id}/kaldir`, { yontem: 'POST' }))}>
                  {k.kaldir}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {yazilabilir.length > 0 && (
        <form onSubmit={ekle} style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4 }}>
          <Alan etiket={k.uyariTuru}>
            <select value={tur} onChange={(e) => setTur(e.target.value as UyariTuru)}>
              <option value="">{m.form.secin}</option>
              {yazilabilir.map((t) => <option key={t} value={t}>{UYARI_TURLERI[t].ad}</option>)}
            </select>
          </Alan>
          <Alan etiket={k.uyariAciklama}><input value={aciklama} onChange={(e) => setAciklama(e.target.value)} maxLength={500} /></Alan>
          <div><button type="submit" className="dugme dugme-ikincil dugme-kucuk" disabled={!tur}>{k.uyariEkle}</button></div>
        </form>
      )}
    </Kart>
  );
}

function KvkkKarti({ kart, kaydedebilir, islem }: { kart: HastaKarti; kaydedebilir: boolean; islem: Islem }) {
  const [kanal, setKanal] = useState<AydinlatmaKanali>('yuz_yuze_islak');
  return (
    <Kart baslik={k.kvkk}>
      <span className={kart.aydinlatma ? 'kutu kutu-basari' : 'kutu kutu-uyari'}>
        {kart.aydinlatma ? k.aydinlatma(kart.aydinlatma.metinSurumu, tarihBicimle(kart.aydinlatma.zaman)) : k.aydinlatmaYok}
      </span>
      {kaydedebilir && (
        <Alan etiket={k.rizaKanal}>
          <select value={kanal} onChange={(e) => setKanal(e.target.value as AydinlatmaKanali)}>
            {Object.entries(AYDINLATMA_KANALLARI).map(([kod, ad]) => <option key={kod} value={kod}>{ad}</option>)}
          </select>
        </Alan>
      )}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' }}>
        {kart.rizalar.map((r) => (
          <li key={r.tur} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--cizgi-acik)' }}>
            <span style={{ flex: 1 }}>
              {RIZA_TURLERI[r.tur].ad}
              {r.zaman && <span className="kucuk ikincil" style={{ display: 'block' }}>{tarihBicimle(r.zaman)}</span>}
            </span>
            <span className={r.verildi ? 'rozet rozet-nane' : 'rozet'}>{r.verildi ? k.rizaVerildi : k.rizaYok}</span>
            {kaydedebilir && (
              <button
                type="button"
                className="dugme dugme-sade dugme-kucuk"
                onClick={() => void islem(() => api(`/hastalar/${kart.id}/rizalar`, { yontem: 'POST', govde: { tur: r.tur, verildi: !r.verildi, kanal } }))}
              >
                {r.verildi ? k.rizaGeriCek : k.rizaVer}
              </button>
            )}
          </li>
        ))}
      </ul>
    </Kart>
  );
}

function HayvanlarKarti({ kart, kaydedebilir, islem }: { kart: HastaKarti; kaydedebilir: boolean; islem: Islem }) {
  const [acik, setAcik] = useState(false);
  const [ad, setAd] = useState('');
  const [tur, setTur] = useState<HayvanTuru>('kedi');
  const [irk, setIrk] = useState('');
  const [cinsiyet, setCinsiyet] = useState('');
  const [kisir, setKisir] = useState(false);
  const [mikrocip, setMikrocip] = useState('');

  function ekle(olay: FormEvent) {
    olay.preventDefault();
    void islem(async () => {
      await api(`/hastalar/${kart.id}/hayvanlar`, {
        yontem: 'POST',
        govde: { ad, tur, irk: irk || undefined, cinsiyet: cinsiyet || undefined, kisirlastirilmis: kisir, mikrocipNo: mikrocip || undefined },
      });
      setAcik(false);
      setAd(''); setIrk(''); setCinsiyet(''); setKisir(false); setMikrocip('');
    });
  }

  return (
    <Kart baslik={k.hayvanlar}>
      {kart.hayvanlar.length === 0 ? (
        <span className="ikincil">{k.hayvanYok}</span>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {kart.hayvanlar.map((h) => (
            <li key={h.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--cizgi-acik)' }}>
              <strong>{h.ad}</strong> <span className="ikincil">· {HAYVAN_TURLERI[h.tur] ?? h.tur}{h.irk && ` · ${h.irk}`}{h.kisirlastirilmis ? ` · ${k.kisirlastirilmis}` : ''}</span>
              {h.mikrocipNo && <span className="mono ikincil" style={{ display: 'block' }}>{h.mikrocipNo}</span>}
            </li>
          ))}
        </ul>
      )}
      {kaydedebilir && !acik && <div><button type="button" className="dugme dugme-ikincil dugme-kucuk" onClick={() => setAcik(true)}>+ {k.hayvanEkle}</button></div>}
      {kaydedebilir && acik && (
        <form onSubmit={ekle} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Alan etiket={k.hayvanAd}><input value={ad} onChange={(e) => setAd(e.target.value)} required /></Alan>
          <Alan etiket={k.hayvanTur}>
            <select value={tur} onChange={(e) => setTur(e.target.value as HayvanTuru)}>
              {Object.entries(HAYVAN_TURLERI).map(([kod, a]) => <option key={kod} value={kod}>{a}</option>)}
            </select>
          </Alan>
          <Alan etiket={k.irk}><input value={irk} onChange={(e) => setIrk(e.target.value)} /></Alan>
          <Alan etiket={k.hayvanCinsiyet}>
            <select value={cinsiyet} onChange={(e) => setCinsiyet(e.target.value)}>
              <option value="">{m.form.secin}</option>
              <option value="disi">Dişi</option>
              <option value="erkek">Erkek</option>
            </select>
          </Alan>
          <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input type="checkbox" checked={kisir} onChange={(e) => setKisir(e.target.checked)} style={{ width: 20, height: 20, accentColor: 'var(--petrol)' }} />
            {k.kisirlastirilmis}
          </label>
          <Alan etiket={k.mikrocip}><input value={mikrocip} onChange={(e) => setMikrocip(e.target.value.replace(/\D/g, ''))} inputMode="numeric" maxLength={15} /></Alan>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="dugme dugme-kucuk" disabled={!ad.trim()}>{metin.genel.kaydet}</button>
            <button type="button" className="dugme dugme-sade dugme-kucuk" onClick={() => setAcik(false)}>{metin.genel.vazgec}</button>
          </div>
        </form>
      )}
    </Kart>
  );
}

interface GecmisMuayene {
  id: string;
  tarih: string;
  durum: 'taslak' | 'imzali';
  hekimAd: string;
  subeAd: string;
  tanilar: { kod: string; ad: string }[];
}

/** Muayene geçmişi: tedavi ilişkisi yoksa gerekçeli acil erişim formu gösterilir. */
function MuayeneGecmisi({ hastaId }: { hastaId: string }) {
  const mm = metin.muayene;
  const [durum, setDurum] = useState<{ liste: GecmisMuayene[]; neden: string } | 'iliski-yok' | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [gerekce, setGerekce] = useState('acil_mudahale');
  const [aciklama, setAciklama] = useState('');

  const yukle = useCallback(async () => {
    try {
      const r = await api<{ erisimNedeni: string; muayeneler: GecmisMuayene[] }>(`/hastalar/${hastaId}/muayeneler`);
      setDurum({ liste: r.muayeneler, neden: r.erisimNedeni });
    } catch (h) {
      if (h instanceof ApiHatasi && h.kod === 'TEDAVI_ILISKISI_YOK') setDurum('iliski-yok');
      else setHata(hataMesaji(h));
    }
  }, [hastaId]);

  useEffect(() => {
    void yukle();
  }, [yukle]);

  async function acilErisim(olay: FormEvent) {
    olay.preventDefault();
    setHata(null);
    try {
      await api(`/hastalar/${hastaId}/acil-erisim`, { yontem: 'POST', govde: { gerekce, aciklama } });
      await yukle();
    } catch (h) {
      setHata(hataMesaji(h));
    }
  }

  return (
    <Kart baslik={mm.gecmis}>
      {hata && <div className="kutu kutu-hata" role="alert">{hata}</div>}
      {durum === null && !hata && <span className="ikincil">{metin.genel.yukleniyor}</span>}
      {durum === 'iliski-yok' && (
        <form onSubmit={acilErisim} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="kutu kutu-uyari">{mm.tedaviIliskisiYok}</div>
          <Alan etiket={mm.gerekce}>
            <select value={gerekce} onChange={(e) => setGerekce(e.target.value)}>
              {Object.entries(mm.gerekceler).map(([k, a]) => <option key={k} value={k}>{a}</option>)}
            </select>
          </Alan>
          <Alan etiket={mm.gerekceAciklama}><input value={aciklama} onChange={(e) => setAciklama(e.target.value)} minLength={10} maxLength={500} required /></Alan>
          <div><button type="submit" className="dugme dugme-sade dugme-kucuk" disabled={aciklama.trim().length < 10}>{mm.acilErisim}</button></div>
        </form>
      )}
      {durum && durum !== 'iliski-yok' && (
        <>
          <span className="kucuk ikincil">{mm.erisimNotu(mm.erisimNedenleri[durum.neden] ?? durum.neden)}</span>
          {durum.liste.length === 0 ? (
            <span className="ikincil">{mm.gecmisYok}</span>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {durum.liste.map((x) => (
                <li key={x.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--cizgi-acik)' }}>
                  <Link href={`/panel/muayene/${x.id}`} style={{ fontWeight: 600 }}>{tarihBicimle(x.tarih)}</Link>
                  <span className="kucuk ikincil"> · {x.hekimAd} · {x.subeAd} · {x.durum === 'imzali' ? 'İmzalı' : 'Taslak'}</span>
                  <span className="kucuk" style={{ display: 'block' }}>{x.tanilar.map((t) => `${t.kod} ${t.ad}`).join(' · ')}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Kart>
  );
}
