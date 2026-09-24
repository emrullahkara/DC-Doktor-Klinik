'use client';

import { KIMLIK_TURLERI, type KimlikTuru } from '@dc/shared';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, hataMesaji } from '@/lib/api';
import { tarihBicimle, telefonBicimle, yasHesapla } from '@/lib/bicim';
import { useOturum } from '@/lib/oturum';
import { metin } from '@/metin';

const m = metin.hastalar;

export interface HastaOzeti {
  id: string;
  ad: string;
  soyad: string;
  dogumTarihi: string | null;
  cinsiyet: string | null;
  kimlikTuru: KimlikTuru;
  kimlikNoMaske: string | null;
  telefon: string | null;
}

export default function HastalarSayfasi() {
  const { izinVar } = useOturum();
  const [sorgu, setSorgu] = useState('');
  const [sonuc, setSonuc] = useState<HastaOzeti[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  // Yazmayı bitirdikten kısa süre sonra aranır (her tuşta istek gitmesin)
  useEffect(() => {
    const zamanlayici = setTimeout(() => {
      api<HastaOzeti[]>(`/hastalar?q=${encodeURIComponent(sorgu.trim())}`)
        .then((liste) => {
          setSonuc(liste);
          setHata(null);
        })
        .catch((h) => setHata(hataMesaji(h)));
    }, sorgu ? 300 : 0);
    return () => clearTimeout(zamanlayici);
  }, [sorgu]);

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <h1>{m.baslik}</h1>
          <p className="ikincil" style={{ margin: '4px 0 0' }}>{m.aciklama}</p>
        </div>
        {izinVar('hasta.kaydet') && (
          <Link href="/panel/hastalar/yeni" className="dugme">+ {m.yeni}</Link>
        )}
      </div>

      <div className="alan" style={{ maxWidth: 560 }}>
        <label htmlFor="hasta-ara"><span>{m.ara}</span></label>
        <input id="hasta-ara" type="search" placeholder={m.araIpucu} value={sorgu} onChange={(e) => setSorgu(e.target.value)} autoComplete="off" autoFocus />
      </div>

      {hata && <div className="kutu kutu-hata" role="alert">{hata}</div>}

      <div className="kart tablo-kaydir">
        {!sorgu && <h2 style={{ marginBottom: 8 }}>{m.sonKayitlar}</h2>}
        {sonuc === null ? (
          <span className="ikincil">{metin.genel.yukleniyor}</span>
        ) : sonuc.length === 0 ? (
          <span className="ikincil">{m.sonucYok}</span>
        ) : (
          <table className="tablo">
            <thead>
              <tr>
                <th>{m.sutun.adSoyad}</th>
                <th>{m.sutun.dogum}</th>
                <th>{m.sutun.kimlik}</th>
                <th>{m.sutun.telefon}</th>
              </tr>
            </thead>
            <tbody>
              {sonuc.map((h) => {
                const yas = yasHesapla(h.dogumTarihi);
                return (
                  <tr key={h.id}>
                    <td><Link href={`/panel/hastalar/${h.id}`} style={{ fontWeight: 600 }}>{h.ad} {h.soyad}</Link></td>
                    <td>{tarihBicimle(h.dogumTarihi)}{yas !== null && <span className="ikincil"> · {m.yas(yas)}</span>}</td>
                    <td>{h.kimlikNoMaske ? <span className="mono">{h.kimlikNoMaske}</span> : <span className="ikincil">{KIMLIK_TURLERI[h.kimlikTuru]}</span>}</td>
                    <td>{telefonBicimle(h.telefon)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
