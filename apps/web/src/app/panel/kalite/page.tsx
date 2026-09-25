'use client';

import { useState } from 'react';
import { useOturum } from '@/lib/oturum';
import { metin } from '@/metin';
import { OlayBildir } from './OlayBildir';
import { Dofler, DofFormu, type DofTaslagi, Olaylar, SikayetFormu, Sikayetler } from './Yonetim';

const m = metin.kalite;
type Sekme = 'bildir' | 'olaylar' | 'sikayetler' | 'dofler';

export default function KaliteSayfasi() {
  const { izinVar } = useOturum();
  const yonetebilir = izinVar('kalite.yonet');
  const sikayetGorur = yonetebilir || izinVar('komuta.goruntule');
  const sikayetKaydeder = yonetebilir || izinVar('hasta.kaydet');
  const [sekme, setSekme] = useState<Sekme>('bildir');
  const [dofTaslagi, setDofTaslagi] = useState<DofTaslagi | null>(null);
  const [yenile, setYenile] = useState(0);

  const sekmeler: { kod: Sekme; ad: string; gorunur: boolean }[] = [
    { kod: 'bildir', ad: m.bildir, gorunur: true },
    { kod: 'olaylar', ad: m.olaylar, gorunur: yonetebilir },
    { kod: 'sikayetler', ad: m.sikayetler, gorunur: sikayetGorur || sikayetKaydeder },
    { kod: 'dofler', ad: m.dofler, gorunur: yonetebilir },
  ];

  return (
    <>
      <div>
        <h1>{m.baslik}</h1>
        <p className="ikincil" style={{ margin: '4px 0 0' }}>{m.aciklama}</p>
      </div>
      <div role="tablist" aria-label={m.baslik} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {sekmeler.filter((s) => s.gorunur).map((s) => (
          <button key={s.kod} type="button" role="tab" aria-selected={sekme === s.kod} className={sekme === s.kod ? 'dugme dugme-kucuk' : 'dugme dugme-sade dugme-kucuk'} onClick={() => setSekme(s.kod)}>
            {s.ad}
          </button>
        ))}
      </div>

      {sekme === 'bildir' && (
        <>
          <OlayBildir />
          <Dofler yonetebilir={false} yenile={yenile} />
        </>
      )}
      {sekme === 'olaylar' && (
        <>
          {dofTaslagi && <DofFormu key={dofTaslagi.olayId ?? 'yeni'} taslak={dofTaslagi} kaydedildi={() => { setDofTaslagi(null); setYenile(yenile + 1); setSekme('dofler'); }} />}
          <Olaylar dofAc={(o) => setDofTaslagi({ kaynak: 'olay', olayId: o.id, baslik: o.baslik, kokNeden: o.kokNeden })} />
        </>
      )}
      {sekme === 'sikayetler' && (
        <>
          {sikayetKaydeder && <SikayetFormu kaydedildi={() => setYenile(yenile + 1)} />}
          {sikayetGorur && <Sikayetler yonetebilir={yonetebilir} yenile={yenile} />}
        </>
      )}
      {sekme === 'dofler' && (
        <>
          {dofTaslagi?.kaynak === 'diger' ? (
            <DofFormu taslak={dofTaslagi} kaydedildi={() => { setDofTaslagi(null); setYenile(yenile + 1); }} />
          ) : (
            <div><button type="button" className="dugme dugme-ikincil" onClick={() => setDofTaslagi({ kaynak: 'diger', baslik: '', kokNeden: '' })}>+ {m.dofAc}</button></div>
          )}
          <Dofler yonetebilir yenile={yenile} />
        </>
      )}
    </>
  );
}
