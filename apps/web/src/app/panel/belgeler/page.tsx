'use client';

import { KURUM_BELGE_TURLERI, type KurumBelgeKodu } from '@dc/shared';
import { useCallback, useEffect, useState } from 'react';
import { type Belge, BelgeFormu, BelgeListesi } from '@/bilesenler/Belgeler';
import { api, hataMesaji } from '@/lib/api';
import { useOturum } from '@/lib/oturum';
import { metin } from '@/metin';

const m = metin.kurumBelgeleri;

interface KurumBelgeleri {
  isletmeGeneli: Belge[];
  subeler: { id: string; ad: string; kurumTipleri: string[]; belgeler: Belge[]; eksikler: KurumBelgeKodu[] }[];
}

const TURLER = (Object.keys(KURUM_BELGE_TURLERI) as KurumBelgeKodu[]).map((kod) => ({ kod, ad: KURUM_BELGE_TURLERI[kod].ad, sureli: KURUM_BELGE_TURLERI[kod].sureli }));

export default function KurumBelgeleriSayfasi() {
  const { ben, izinVar } = useOturum();
  const [veri, setVeri] = useState<KurumBelgeleri | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [secilenTur, setSecilenTur] = useState<string | undefined>(undefined);
  const yonetebilir = izinVar('belge.kurum.yonet');

  const yukle = useCallback(async () => {
    try {
      setVeri(await api<KurumBelgeleri>('/kurum-belgeleri'));
    } catch (h) {
      setHata(hataMesaji(h));
    }
  }, []);

  useEffect(() => {
    void yukle();
  }, [yukle]);

  return (
    <>
      <div>
        <h1>{m.baslik}</h1>
        <p className="ikincil" style={{ margin: '4px 0 0' }}>{m.aciklama}</p>
      </div>
      {hata && <div className="kutu kutu-hata" role="alert">{hata}</div>}
      {veri && (
        <>
          {veri.subeler.map((s) => (
            <section key={s.id} className="kart" aria-label={s.ad} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <h2>{s.ad}</h2>
              <div>
                <h3 style={{ fontSize: 15, marginBottom: 8 }}>{metin.belge.eksikler}</h3>
                {s.eksikler.length === 0 ? (
                  <p className="ikincil kucuk" style={{ margin: 0 }}>{metin.belge.eksikYok}</p>
                ) : (
                  <ul aria-label={`${metin.belge.eksikler} · ${s.ad}`} style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {s.eksikler.map((t) => (
                      <li key={t}>
                        {yonetebilir ? (
                          <button type="button" className="dugme dugme-sade dugme-kucuk" onClick={() => setSecilenTur(t)}>+ {KURUM_BELGE_TURLERI[t].ad}</button>
                        ) : (
                          <span className="rozet rozet-uyari">{KURUM_BELGE_TURLERI[t].ad}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <BelgeListesi belgeler={s.belgeler} yonetebilir={yonetebilir} degisti={() => void yukle()} />
            </section>
          ))}

          {veri.isletmeGeneli.length > 0 && (
            <section className="kart" aria-label={m.isletmeGeneli} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <h2>{m.isletmeGeneli}</h2>
              <BelgeListesi belgeler={veri.isletmeGeneli} yonetebilir={yonetebilir} degisti={() => void yukle()} />
            </section>
          )}

          {yonetebilir && (
            <section className="kart" aria-label={metin.belge.ekle} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h2>{metin.belge.ekle}</h2>
              <BelgeFormu key={secilenTur ?? 'bos'} kapsam="kurum" subeler={ben.subeler} turler={TURLER} secilenTur={secilenTur} eklendi={() => { setSecilenTur(undefined); void yukle(); }} />
            </section>
          )}
        </>
      )}
    </>
  );
}
