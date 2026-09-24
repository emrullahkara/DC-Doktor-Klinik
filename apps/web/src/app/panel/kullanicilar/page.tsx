'use client';

import { atamaIcinGerekenIzin, MESLEKLER, type Meslek, meslekMi, ROLLER, rolAtanabilirMi, type RolKodu } from '@dc/shared';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Alan } from '@/bilesenler/Alan';
import { api, ApiHatasi, hataMesaji } from '@/lib/api';
import { useOturum } from '@/lib/oturum';
import { metin } from '@/metin';

const m = metin.panel.kullanicilar;
const MESLEK_LISTESI = Object.entries(MESLEKLER) as [Meslek, string][];
const ROL_LISTESI = Object.entries(ROLLER) as [RolKodu, (typeof ROLLER)[RolKodu]][];

interface Kullanici {
  id: string;
  eposta: string;
  adSoyad: string;
  meslek: string;
  aktif: boolean;
  roller: { rolKodu: string; subeId: string | null }[];
}

export default function KullanicilarSayfasi() {
  const { ben, yenile, izinVar } = useOturum();
  const [liste, setListe] = useState<Kullanici[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [bildirim, setBildirim] = useState<string | null>(null);
  const [atanan, setAtanan] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    try {
      setListe(await api<Kullanici[]>('/kullanicilar'));
    } catch (h) {
      setHata(hataMesaji(h));
    }
  }, []);

  useEffect(() => {
    void yukle();
  }, [yukle]);

  const subeAdi = (id: string | null) => (id ? (ben.subeler.find((s) => s.id === id)?.ad ?? '—') : metin.genel.tumSubeler);

  return (
    <>
      <div>
        <h1>{m.baslik}</h1>
        <p className="ikincil" style={{ margin: '4px 0 0', maxWidth: 760 }}>{m.aciklama}</p>
      </div>

      {bildirim && <div className="kutu kutu-basari" role="status">{bildirim}</div>}
      {hata && <div className="kutu kutu-hata" role="alert">{hata}</div>}

      {izinVar('kullanici.yonet') && (
        <KullaniciEkle
          eklendi={(k) => {
            setBildirim(m.eklendi);
            setAtanan(k.id);
            void yukle();
          }}
        />
      )}

      <div className="kart tablo-kaydir">
        {liste === null ? (
          <span className="ikincil">{metin.genel.yukleniyor}</span>
        ) : (
          <table className="tablo">
            <thead>
              <tr>
                <th>{m.adSoyad}</th>
                <th>{m.meslek}</th>
                <th>{m.roller}</th>
                <th><span className="gizli">{m.rolAta}</span></th>
              </tr>
            </thead>
            <tbody>
              {liste.map((k) => (
                <tr key={k.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{k.adSoyad} {k.id === ben.kullanici.id && <span className="ikincil">{m.kendin}</span>}</div>
                    <div className="kucuk ikincil">{k.eposta}</div>
                  </td>
                  <td>{meslekMi(k.meslek) ? MESLEKLER[k.meslek] : k.meslek}</td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {k.roller.length === 0 && <span className="rozet">{m.rolYok}</span>}
                      {k.roller.map((r) => (
                        <span key={`${r.rolKodu}-${r.subeId}`} className="cip">
                          {r.rolKodu in ROLLER ? ROLLER[r.rolKodu as RolKodu].ad : r.rolKodu} · {subeAdi(r.subeId)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ minWidth: 300 }}>
                    {k.id !== ben.kullanici.id && meslekMi(k.meslek) && (
                      <RolAtaFormu
                        kullanici={k}
                        meslek={k.meslek}
                        acik={atanan === k.id}
                        ac={() => setAtanan(atanan === k.id ? null : k.id)}
                        atandi={() => {
                          setBildirim(m.atandi);
                          setAtanan(null);
                          void yukle();
                          void yenile();
                        }}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function KullaniciEkle({ eklendi }: { eklendi: (k: { id: string }) => void }) {
  const [acik, setAcik] = useState(false);
  const [eposta, setEposta] = useState('');
  const [adSoyad, setAdSoyad] = useState('');
  const [meslek, setMeslek] = useState<Meslek | ''>('');
  const [geciciParola, setGeciciParola] = useState('');
  const [hatalar, setHatalar] = useState<Record<string, string>>({});
  const [hata, setHata] = useState<string | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  if (!acik) {
    return (
      <div>
        <button type="button" className="dugme" onClick={() => setAcik(true)}>+ {m.ekle}</button>
      </div>
    );
  }

  async function gonder(olay: FormEvent) {
    olay.preventDefault();
    setHata(null);
    setHatalar({});
    setGonderiliyor(true);
    try {
      const k = await api<{ id: string }>('/kullanicilar', { yontem: 'POST', govde: { eposta, adSoyad, meslek, geciciParola } });
      setAcik(false);
      setEposta(''); setAdSoyad(''); setMeslek(''); setGeciciParola('');
      eklendi(k);
    } catch (h) {
      if (h instanceof ApiHatasi) setHatalar({ ...h.alanHatalari(), ...(h.kod === 'EPOSTA_KULLANIMDA' ? { eposta: h.message } : {}) });
      setHata(hataMesaji(h));
    } finally {
      setGonderiliyor(false);
    }
  }

  return (
    <form className="kart" onSubmit={gonder} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2>{m.ekle}</h2>
      {hata && <div className="kutu kutu-hata" role="alert">{hata}</div>}
      <div className="form-izgara">
        <Alan etiket={m.adSoyad} hata={hatalar.adSoyad}>
          <input value={adSoyad} onChange={(e) => setAdSoyad(e.target.value)} required />
        </Alan>
        <Alan etiket={m.eposta} hata={hatalar.eposta}>
          <input type="email" value={eposta} onChange={(e) => setEposta(e.target.value)} required />
        </Alan>
        <Alan etiket={m.meslek}>
          <select value={meslek} onChange={(e) => setMeslek(e.target.value as Meslek)} required>
            <option value="" disabled>—</option>
            {MESLEK_LISTESI.map(([kod, ad]) => <option key={kod} value={kod}>{ad}</option>)}
          </select>
        </Alan>
        <Alan etiket={m.geciciParola} ipucu={m.geciciParolaIpucu} hata={hatalar.geciciParola}>
          <input type="password" autoComplete="new-password" minLength={10} value={geciciParola} onChange={(e) => setGeciciParola(e.target.value)} required />
        </Alan>
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <button type="submit" className="dugme" disabled={gonderiliyor || !meslek}>{gonderiliyor ? metin.genel.yukleniyor : metin.genel.kaydet}</button>
        <button type="button" className="dugme dugme-sade" onClick={() => setAcik(false)}>{metin.genel.vazgec}</button>
      </div>
    </form>
  );
}

function RolAtaFormu({ kullanici, meslek, acik, ac, atandi }: { kullanici: Kullanici; meslek: Meslek; acik: boolean; ac: () => void; atandi: () => void }) {
  const { ben, izinVar } = useOturum();
  // Yalnızca kişinin mesleğine uygun roller listelenir (kilitli yasal kural). Atayanın yetkisi
  // olmayan roller gerekçesiyle pasif gösterilir; son karar her zaman API'dedir.
  const uygunRoller = ROL_LISTESI.filter(([kod]) => rolAtanabilirMi(kod, meslek).uygun);
  const [rol, setRol] = useState<RolKodu | ''>('');
  const [kapsam, setKapsam] = useState<string>(ben.subeler[0]?.id ?? '');
  const [hata, setHata] = useState<string | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  if (!acik) {
    return <button type="button" className="dugme dugme-ikincil dugme-kucuk" onClick={ac}>{m.rolAta}</button>;
  }

  async function gonder(olay: FormEvent) {
    olay.preventDefault();
    setHata(null);
    setGonderiliyor(true);
    try {
      await api(`/kullanicilar/${kullanici.id}/roller`, { yontem: 'POST', govde: { rolKodu: rol, subeId: kapsam || null } });
      atandi();
    } catch (h) {
      const eksik = h instanceof ApiHatasi ? (h.ayrinti as { eksikIzinler?: string[] } | undefined)?.eksikIzinler?.[0] : undefined;
      setHata(eksik && m.rolGerekceleri[eksik] ? m.rolGerekceleri[eksik] : hataMesaji(h));
    } finally {
      setGonderiliyor(false);
    }
  }

  return (
    <form onSubmit={gonder} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Alan etiket={m.rol} ipucu={rol ? ROLLER[rol].aciklama : undefined}>
        <select value={rol} onChange={(e) => setRol(e.target.value as RolKodu)} required>
          <option value="" disabled>—</option>
          {uygunRoller.map(([kod, tanim]) => {
            const gereken = atamaIcinGerekenIzin(kod);
            const atayabilir = izinVar(gereken);
            return (
              <option key={kod} value={kod} disabled={!atayabilir}>
                {tanim.ad}{atayabilir ? '' : ` — ${m.rolGerekceleri[gereken] ?? ''}`}
              </option>
            );
          })}
        </select>
      </Alan>
      <Alan etiket={m.kapsam}>
        <select value={kapsam} onChange={(e) => setKapsam(e.target.value)}>
          {ben.subeler.map((s) => <option key={s.id} value={s.id}>{s.ad}</option>)}
          <option value="">{metin.genel.tumSubeler}</option>
        </select>
      </Alan>
      {hata && <div className="kutu kutu-hata" role="alert">{hata}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" className="dugme dugme-kucuk" disabled={!rol || gonderiliyor}>{m.rolAta}</button>
        <button type="button" className="dugme dugme-sade dugme-kucuk" onClick={ac}>{metin.genel.vazgec}</button>
      </div>
    </form>
  );
}
