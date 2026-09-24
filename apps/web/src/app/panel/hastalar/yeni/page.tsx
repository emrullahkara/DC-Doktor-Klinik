'use client';

import {
  AYDINLATMA_KANALLARI,
  type AydinlatmaKanali,
  CINSIYETLER,
  ILETISIM_TERCIHLERI,
  KAN_GRUPLARI,
  KIMLIK_TURLERI,
  type KimlikTuru,
  RIZA_TURLERI,
  type RizaTuru,
  tcKimlikNoGecerliMi,
  yabanciKimlikNoGecerliMi,
} from '@dc/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, type ReactNode, useState } from 'react';
import { Alan } from '@/bilesenler/Alan';
import { api, ApiHatasi, hataMesaji } from '@/lib/api';
import { tarihBicimle, yasHesapla } from '@/lib/bicim';
import { metin } from '@/metin';
import type { HastaOzeti } from '../page';

const m = metin.hastalar;
const f = m.form;

const BOS = {
  kimlikTuru: 'tc', kimlikNo: '', ad: '', soyad: '', dogumTarihi: '', cinsiyet: '', uyruk: 'T.C.', kanGrubu: '',
  telefon: '', eposta: '', adres: '', iletisimTercihi: 'sms',
  acilAd: '', acilTelefon: '', acilYakinlik: '', temsilciAd: '', temsilciTelefon: '', temsilciYakinlik: '',
  aydinlatmaKanali: 'tablet_imza',
};
type Durum = Record<keyof typeof BOS, string>;

function secenekler(nesne: Record<string, string>, bosEtiket?: string) {
  return (
    <>
      {bosEtiket !== undefined && <option value="">{bosEtiket}</option>}
      {Object.entries(nesne).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
    </>
  );
}

export default function YeniHasta() {
  const router = useRouter();
  const [d, setD] = useState<Durum>(BOS);
  const [aydinlatmaSunuldu, setAydinlatmaSunuldu] = useState(false);
  const [rizalar, setRizalar] = useState<Partial<Record<RizaTuru, boolean>>>({});
  const [alanHatalari, setAlanHatalari] = useState<Record<string, string>>({});
  const [hata, setHata] = useState<string | null>(null);
  const [mevcutId, setMevcutId] = useState<string | null>(null);
  const [benzerler, setBenzerler] = useState<HastaOzeti[] | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  const degistir = (alan: keyof Durum) => (e: { target: { value: string } }) => setD((o) => ({ ...o, [alan]: e.target.value }));
  const yas = yasHesapla(d.dogumTarihi || null);
  const cocuk = yas !== null && yas < 18;

  const kimlikNoHatasi = (() => {
    if (d.kimlikTuru === 'tc' && d.kimlikNo.length === 11 && !tcKimlikNoGecerliMi(d.kimlikNo)) return 'Geçersiz T.C. kimlik numarası.';
    if (d.kimlikTuru === 'yabanci' && d.kimlikNo.length === 11 && !yabanciKimlikNoGecerliMi(d.kimlikNo)) return 'Geçersiz yabancı kimlik numarası.';
    return undefined;
  })();

  function govde(yinedeKaydet: boolean) {
    const tur = d.kimlikTuru as KimlikTuru;
    const bos = (v: string) => (v.trim() ? v.trim() : undefined);
    return {
      kimlik: tur === 'kimliksiz' ? { tur } : { tur, no: d.kimlikNo },
      ad: d.ad,
      soyad: d.soyad,
      dogumTarihi: bos(d.dogumTarihi),
      cinsiyet: bos(d.cinsiyet),
      uyruk: bos(d.uyruk),
      kanGrubu: bos(d.kanGrubu),
      telefon: bos(d.telefon),
      eposta: bos(d.eposta),
      adres: bos(d.adres),
      iletisimTercihi: bos(d.iletisimTercihi),
      acilKisi: d.acilAd.trim() ? { ad: d.acilAd, telefon: bos(d.acilTelefon), yakinlik: bos(d.acilYakinlik) } : undefined,
      temsilci: d.temsilciAd.trim() ? { ad: d.temsilciAd, telefon: bos(d.temsilciTelefon), yakinlik: bos(d.temsilciYakinlik) } : undefined,
      aydinlatma: { kanal: d.aydinlatmaKanali as AydinlatmaKanali },
      rizalar,
      yinedeKaydet,
    };
  }

  async function kaydet(yinedeKaydet: boolean) {
    setHata(null);
    setAlanHatalari({});
    setMevcutId(null);
    setGonderiliyor(true);
    try {
      const { id } = await api<{ id: string }>('/hastalar', { yontem: 'POST', govde: govde(yinedeKaydet) });
      router.push(`/panel/hastalar/${id}`);
    } catch (h) {
      setGonderiliyor(false);
      if (h instanceof ApiHatasi && h.kod === 'BENZER_KAYIT_VAR') {
        setBenzerler((h.ayrinti as { benzerler: HastaOzeti[] }).benzerler);
        return;
      }
      if (h instanceof ApiHatasi && h.kod === 'HASTA_ZATEN_KAYITLI') {
        setMevcutId((h.ayrinti as { hastaId?: string } | undefined)?.hastaId ?? null);
      }
      if (h instanceof ApiHatasi) setAlanHatalari(h.alanHatalari());
      setHata(hataMesaji(h));
    }
  }

  function gonder(olay: FormEvent) {
    olay.preventDefault();
    void kaydet(false);
  }

  const hazir = d.ad.trim() && d.soyad.trim() && aydinlatmaSunuldu && !kimlikNoHatasi && (d.kimlikTuru === 'kimliksiz' || d.kimlikNo.trim());

  return (
    <form onSubmit={gonder} style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 960 }} noValidate>
      <div>
        <Link href="/panel/hastalar" className="kucuk">← {m.baslik}</Link>
        <h1 style={{ marginTop: 6 }}>{f.baslik}</h1>
      </div>

      {hata && (
        <div className="kutu kutu-hata" role="alert" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{hata}</span>
          {mevcutId && <Link href={`/panel/hastalar/${mevcutId}`} className="dugme dugme-ikincil dugme-kucuk">{f.mevcutKaydaGit}</Link>}
        </div>
      )}

      {benzerler && (
        <div className="kart" role="alert" style={{ borderColor: 'var(--uyari)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2>{f.benzerBaslik}</h2>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {benzerler.map((b) => (
              <li key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600 }}>{b.ad} {b.soyad}</span>
                <span className="ikincil">{tarihBicimle(b.dogumTarihi)} · {b.kimlikNoMaske ?? KIMLIK_TURLERI[b.kimlikTuru]}</span>
                <Link href={`/panel/hastalar/${b.id}`} className="dugme dugme-ikincil dugme-kucuk">{f.buHasta}</Link>
              </li>
            ))}
          </ul>
          <div>
            <button type="button" className="dugme dugme-sade" onClick={() => void kaydet(true)} disabled={gonderiliyor}>{f.yinedeKaydet}</button>
          </div>
        </div>
      )}

      <Bolum baslik={f.kimlikBolum}>
        <Alan etiket={f.kimlikTuru}>
          <select value={d.kimlikTuru} onChange={degistir('kimlikTuru')}>{secenekler(KIMLIK_TURLERI)}</select>
        </Alan>
        {d.kimlikTuru !== 'kimliksiz' && (
          <Alan etiket={f.kimlikNo} hata={kimlikNoHatasi ?? alanHatalari['kimlik.no']}>
            <input value={d.kimlikNo} onChange={(e) => setD((o) => ({ ...o, kimlikNo: o.kimlikTuru === 'pasaport' ? e.target.value.toUpperCase() : e.target.value.replace(/\D/g, '') }))} inputMode={d.kimlikTuru === 'pasaport' ? 'text' : 'numeric'} maxLength={d.kimlikTuru === 'pasaport' ? 20 : 11} autoComplete="off" />
          </Alan>
        )}
      </Bolum>

      <Bolum baslik={f.kisiselBolum}>
        <Alan etiket={f.ad} hata={alanHatalari.ad}><input value={d.ad} onChange={degistir('ad')} required /></Alan>
        <Alan etiket={f.soyad} hata={alanHatalari.soyad}><input value={d.soyad} onChange={degistir('soyad')} required /></Alan>
        <Alan etiket={f.dogumTarihi} ipucu={yas !== null ? m.yas(yas) : undefined} hata={alanHatalari.dogumTarihi}>
          <input type="date" value={d.dogumTarihi} onChange={degistir('dogumTarihi')} max={new Date().toISOString().slice(0, 10)} />
        </Alan>
        <Alan etiket={f.cinsiyet}><select value={d.cinsiyet} onChange={degistir('cinsiyet')}>{secenekler(CINSIYETLER, f.secin)}</select></Alan>
        <Alan etiket={f.uyruk}><input value={d.uyruk} onChange={degistir('uyruk')} /></Alan>
        <Alan etiket={f.kanGrubu}>
          <select value={d.kanGrubu} onChange={degistir('kanGrubu')}>
            <option value="">{f.secin}</option>
            {KAN_GRUPLARI.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </Alan>
      </Bolum>

      <Bolum baslik={f.iletisimBolum}>
        <Alan etiket={f.telefon} hata={alanHatalari.telefon}><input type="tel" value={d.telefon} onChange={degistir('telefon')} autoComplete="off" /></Alan>
        <Alan etiket={f.eposta} hata={alanHatalari.eposta}><input type="email" value={d.eposta} onChange={degistir('eposta')} autoComplete="off" /></Alan>
        <Alan etiket={f.adres} genis><input value={d.adres} onChange={degistir('adres')} autoComplete="off" /></Alan>
        <Alan etiket={f.iletisimTercihi}><select value={d.iletisimTercihi} onChange={degistir('iletisimTercihi')}>{secenekler(ILETISIM_TERCIHLERI)}</select></Alan>
      </Bolum>

      <Bolum baslik={f.acilBolum}>
        <Alan etiket={f.kisiAd}><input value={d.acilAd} onChange={degistir('acilAd')} autoComplete="off" /></Alan>
        <Alan etiket={f.kisiTelefon}><input type="tel" value={d.acilTelefon} onChange={degistir('acilTelefon')} autoComplete="off" /></Alan>
        <Alan etiket={f.yakinlik}><input value={d.acilYakinlik} onChange={degistir('acilYakinlik')} autoComplete="off" /></Alan>
      </Bolum>

      <Bolum baslik={f.temsilciBolum} aciklama={f.temsilciIpucu} vurgulu={cocuk}>
        <Alan etiket={f.kisiAd}><input value={d.temsilciAd} onChange={degistir('temsilciAd')} autoComplete="off" /></Alan>
        <Alan etiket={f.kisiTelefon}><input type="tel" value={d.temsilciTelefon} onChange={degistir('temsilciTelefon')} autoComplete="off" /></Alan>
        <Alan etiket={f.yakinlik}><input value={d.temsilciYakinlik} onChange={degistir('temsilciYakinlik')} autoComplete="off" /></Alan>
      </Bolum>

      <section className="kart" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h2>{f.kvkkBolum}</h2>
        <label style={{ display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer' }}>
          <input type="checkbox" checked={aydinlatmaSunuldu} onChange={(e) => setAydinlatmaSunuldu(e.target.checked)} style={{ width: 22, height: 22, margin: 0, accentColor: 'var(--petrol)' }} />
          <span style={{ fontWeight: 600 }}>{f.aydinlatmaSunuldu}</span>
        </label>
        <div style={{ maxWidth: 360 }}>
          <Alan etiket={f.aydinlatmaKanali}><select value={d.aydinlatmaKanali} onChange={degistir('aydinlatmaKanali')}>{secenekler(AYDINLATMA_KANALLARI)}</select></Alan>
        </div>
        <span className="kucuk ikincil">{f.aydinlatmaNot}</span>
        <h3 style={{ fontSize: 15, marginTop: 6 }}>{f.rizaBaslik}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
          {(Object.entries(RIZA_TURLERI) as [RizaTuru, (typeof RIZA_TURLERI)[RizaTuru]][]).map(([tur, r]) => (
            <label key={tur} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: 12, border: '1px solid var(--cizgi)', borderRadius: 12, cursor: 'pointer' }}>
              <input type="checkbox" checked={!!rizalar[tur]} onChange={(e) => setRizalar((o) => ({ ...o, [tur]: e.target.checked }))} style={{ width: 20, height: 20, margin: '2px 0 0', accentColor: 'var(--petrol)' }} />
              <span>
                <span style={{ fontWeight: 600, display: 'block' }}>{r.ad}</span>
                <span className="kucuk ikincil">{r.aciklama}</span>
              </span>
            </label>
          ))}
        </div>
      </section>

      <div style={{ display: 'flex', gap: 12 }}>
        <button type="submit" className="dugme" disabled={!hazir || gonderiliyor}>{gonderiliyor ? metin.genel.yukleniyor : f.kaydet}</button>
        <Link href="/panel/hastalar" className="dugme dugme-sade">{metin.genel.vazgec}</Link>
      </div>
    </form>
  );
}

function Bolum({ baslik, aciklama, vurgulu, children }: { baslik: string; aciklama?: string; vurgulu?: boolean; children: ReactNode }) {
  return (
    // fieldset/legend: aynı adlı alanlar (ör. iki ayrı “Ad soyad”) ekran okuyucuda bölüm adıyla ayırt edilir
    <fieldset className="kart" style={{ display: 'flex', flexDirection: 'column', gap: 14, margin: 0, minWidth: 0, ...(vurgulu ? { borderColor: 'var(--uyari)', borderWidth: 2 } : {}) }}>
      <legend className="gizli">{baslik}</legend>
      <div aria-hidden="true">
        <h2>{baslik}</h2>
        {aciklama && <span className="kucuk ikincil">{aciklama}</span>}
      </div>
      {aciklama && <span className="gizli">{aciklama}</span>}
      <div className="form-izgara">{children}</div>
    </fieldset>
  );
}
