'use client';

import {
  type AskiyaAlma,
  CALISMA_SEKILLERI,
  type CalismaSekli,
  type Meslek,
  MESLEKLER,
  PERSONEL_BELGE_TURLERI,
  type PersonelBelgeKodu,
} from '@dc/shared';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Alan } from '@/bilesenler/Alan';
import { type Belge, BelgeFormu, BelgeListesi, type BelgeTuruSecenegi } from '@/bilesenler/Belgeler';
import { api, ApiHatasi, hataMesaji } from '@/lib/api';
import { tarihBicimle, telefonBicimle } from '@/lib/bicim';
import { useOturum } from '@/lib/oturum';
import { metin } from '@/metin';

const m = metin.personel;

interface Kart {
  kullanici: { id: string; adSoyad: string; eposta: string; meslek: string; aktif: boolean };
  roller: { rolKodu: string; subeId: string | null; ad: string }[];
  bilgi: { unvanBrans: string; calismaSekli: CalismaSekli; iseGiris: string | null; telefon: string | null } | null;
  belgeler: Belge[];
  eksikler: PersonelBelgeKodu[];
  askilar: AskiyaAlma[];
}

/** Kişinin mesleğine uygun belge türleri (zorunlular önce). */
function turSecenekleri(meslek: string): BelgeTuruSecenegi[] {
  const hepsi = (Object.keys(PERSONEL_BELGE_TURLERI) as PersonelBelgeKodu[]).map((kod) => ({ kod, ...PERSONEL_BELGE_TURLERI[kod] }));
  const uygun = hepsi.filter((t) => (t.meslekler as readonly string[]).includes(meslek));
  const zorunlu = (t: (typeof hepsi)[number]) => (t.zorunluMeslekler as readonly string[]).includes(meslek);
  return [...uygun.filter(zorunlu), ...uygun.filter((t) => !zorunlu(t))].map(({ kod, ad, sureli }) => ({ kod, ad, sureli }));
}

export default function PersonelKarti() {
  const { id } = useParams<{ id: string }>();
  const { ben, izinVar } = useOturum();
  const [kart, setKart] = useState<Kart | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [secilenTur, setSecilenTur] = useState<string | undefined>(undefined);
  const yonetebilir = izinVar('personel.yonet');
  const kendisi = id === ben.kullanici.id;

  const yukle = useCallback(async () => {
    try {
      setKart(await api<Kart>(`/personel/${id}`));
    } catch (h) {
      setHata(hataMesaji(h));
    }
  }, [id]);

  useEffect(() => {
    void yukle();
  }, [yukle]);

  if (!kart) return hata ? <div className="kutu kutu-hata" role="alert">{hata}</div> : <p>{metin.genel.yukleniyor}</p>;
  const k = kart.kullanici;
  const aski = kart.askilar[0];

  return (
    <>
      {(izinVar('personel.goruntule') || yonetebilir) && <Link href="/panel/personel" className="kucuk">{m.geri}</Link>}
      <section className="kart" style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <h1>{kendisi ? m.kendiKartim : k.adSoyad}</h1>
          <p className="ikincil" style={{ margin: '4px 0 0' }}>
            {kendisi && `${k.adSoyad} · `}{MESLEKLER[k.meslek as Meslek] ?? k.meslek}
            {kart.bilgi?.unvanBrans && ` · ${kart.bilgi.unvanBrans}`} · {k.eposta}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {kart.roller.map((r) => <span key={`${r.rolKodu}-${r.subeId}`} className="cip">{r.ad}</span>)}
        </div>
      </section>

      {aski && (
        <div className="kutu kutu-hata" role="alert">
          {(kendisi ? metin.belge.askiUyariKendi : metin.belge.askiUyari)(PERSONEL_BELGE_TURLERI[aski.belge].ad, tarihBicimle(aski.bitis))}
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
        <section className="kart" aria-label={metin.personel.belgeler} style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: '2 1 560px', minWidth: 0 }}>
          <h2>{metin.personel.belgeler}</h2>
          <div>
            <h3 style={{ fontSize: 15, marginBottom: 8 }}>{metin.belge.eksikler}</h3>
            {kart.eksikler.length === 0 ? (
              <p className="ikincil kucuk" style={{ margin: 0 }}>{metin.belge.eksikYok}</p>
            ) : (
              <ul aria-label={metin.belge.eksikler} style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {kart.eksikler.map((t) => (
                  <li key={t}>
                    {yonetebilir ? (
                      <button type="button" className="dugme dugme-sade dugme-kucuk" onClick={() => setSecilenTur(t)}>
                        + {PERSONEL_BELGE_TURLERI[t].ad}
                      </button>
                    ) : (
                      <span className="rozet rozet-uyari">{PERSONEL_BELGE_TURLERI[t].ad}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <BelgeListesi belgeler={kart.belgeler} yonetebilir={yonetebilir} degisti={() => void yukle()} />
          {yonetebilir && (
            <BelgeFormu key={secilenTur ?? 'bos'} kapsam="personel" kullaniciId={k.id} turler={turSecenekleri(k.meslek)} secilenTur={secilenTur} eklendi={() => { setSecilenTur(undefined); void yukle(); }} />
          )}
        </section>

        <Ozluk id={k.id} bilgi={kart.bilgi} yonetebilir={yonetebilir} kaydedildi={() => void yukle()} />
      </div>
    </>
  );
}

function Ozluk({ id, bilgi, yonetebilir, kaydedildi }: { id: string; bilgi: Kart['bilgi']; yonetebilir: boolean; kaydedildi: () => void }) {
  const [unvanBrans, setUnvanBrans] = useState(bilgi?.unvanBrans ?? '');
  const [calismaSekli, setCalismaSekli] = useState<CalismaSekli>(bilgi?.calismaSekli ?? 'tam_zamanli');
  const [iseGiris, setIseGiris] = useState(bilgi?.iseGiris ?? '');
  const [telefon, setTelefon] = useState(bilgi?.telefon ?? '');
  const [durum, setDurum] = useState<{ tur: 'hata' | 'basari'; mesaj: string } | null>(null);
  const [alanHatalari, setAlanHatalari] = useState<Record<string, string>>({});

  async function kaydet(olay: FormEvent) {
    olay.preventDefault();
    setDurum(null);
    setAlanHatalari({});
    try {
      await api(`/personel/${id}`, { yontem: 'PATCH', govde: { unvanBrans, calismaSekli, iseGiris: iseGiris || null, telefon: telefon.replace(/\s/g, '') || null } });
      setDurum({ tur: 'basari', mesaj: m.kaydedildi });
      kaydedildi();
    } catch (h) {
      setDurum({ tur: 'hata', mesaj: hataMesaji(h) });
      if (h instanceof ApiHatasi) setAlanHatalari(h.alanHatalari());
    }
  }

  if (!yonetebilir) {
    const satirlar: [string, string][] = [
      [m.unvanBrans, bilgi?.unvanBrans || '—'],
      [m.calismaSekli, bilgi ? CALISMA_SEKILLERI[bilgi.calismaSekli] : '—'],
      [m.iseGiris, tarihBicimle(bilgi?.iseGiris ?? null)],
      [m.telefon, telefonBicimle(bilgi?.telefon ?? null)],
    ];
    return (
      <section className="kart" aria-label={m.ozluk} style={{ flex: '1 1 300px', minWidth: 0 }}>
        <h2 style={{ marginBottom: 12 }}>{m.ozluk}</h2>
        <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 16px', margin: 0 }}>
          {satirlar.map(([a, d]) => (
            <div key={a} style={{ display: 'contents' }}><dt className="ikincil kucuk">{a}</dt><dd style={{ margin: 0 }}>{d}</dd></div>
          ))}
        </dl>
      </section>
    );
  }

  return (
    <section className="kart" aria-label={m.ozluk} style={{ flex: '1 1 300px', minWidth: 0 }}>
      <form onSubmit={kaydet} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2>{m.ozluk}</h2>
        {durum && <div className={durum.tur === 'hata' ? 'kutu kutu-hata' : 'kutu kutu-basari'} role={durum.tur === 'hata' ? 'alert' : 'status'}>{durum.mesaj}</div>}
        <Alan etiket={m.unvanBrans}><input value={unvanBrans} onChange={(e) => setUnvanBrans(e.target.value)} maxLength={120} /></Alan>
        <Alan etiket={m.calismaSekli}>
          <select value={calismaSekli} onChange={(e) => setCalismaSekli(e.target.value as CalismaSekli)}>
            {Object.entries(CALISMA_SEKILLERI).map(([k, a]) => <option key={k} value={k}>{a}</option>)}
          </select>
        </Alan>
        <Alan etiket={m.iseGiris}><input type="date" value={iseGiris} onChange={(e) => setIseGiris(e.target.value)} /></Alan>
        <Alan etiket={m.telefon} hata={alanHatalari.telefon}><input type="tel" inputMode="tel" value={telefon} onChange={(e) => setTelefon(e.target.value)} placeholder="05XX XXX XX XX" /></Alan>
        <div><button type="submit" className="dugme dugme-ikincil">{metin.genel.kaydet}</button></div>
      </form>
    </section>
  );
}
