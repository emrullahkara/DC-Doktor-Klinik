'use client';

import { useEffect, useState } from 'react';
import { api, hataMesaji } from '@/lib/api';
import { KULLANICI_LISTESI_IZINLERI, useOturum } from '@/lib/oturum';
import { metin } from '@/metin';

const m = metin.panel.denetim;

interface Kayit {
  id: number;
  zaman: string;
  kullaniciId: string | null;
  eylem: string;
  ip: string | null;
  ayrinti: Record<string, unknown>;
}

export default function DenetimSayfasi() {
  const { izinVar } = useOturum();
  const [kayitlar, setKayitlar] = useState<Kayit[] | null>(null);
  const [adlar, setAdlar] = useState<Record<string, string>>({});
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    api<Kayit[]>('/denetim-izi?adet=200').then(setKayitlar).catch((h) => setHata(hataMesaji(h)));
    if (KULLANICI_LISTESI_IZINLERI.some(izinVar)) {
      api<{ id: string; adSoyad: string }[]>('/kullanicilar')
        .then((l) => setAdlar(Object.fromEntries(l.map((k) => [k.id, k.adSoyad]))))
        .catch(() => undefined);
    }
  }, [izinVar]);

  return (
    <>
      <div>
        <h1>{m.baslik}</h1>
        <p className="ikincil" style={{ margin: '4px 0 0', maxWidth: 760 }}>{m.aciklama}</p>
      </div>
      {hata && <div className="kutu kutu-hata" role="alert">{hata}</div>}
      <div className="kart tablo-kaydir">
        {kayitlar === null ? (
          <span className="ikincil">{metin.genel.yukleniyor}</span>
        ) : kayitlar.length === 0 ? (
          <span className="ikincil">{m.bos}</span>
        ) : (
          <table className="tablo">
            <thead>
              <tr>
                <th>{m.zaman}</th>
                <th>{m.eylem}</th>
                <th>{m.kullanici}</th>
                <th>{m.ayrinti}</th>
                <th>{m.ip}</th>
              </tr>
            </thead>
            <tbody>
              {kayitlar.map((k) => {
                const reddedildi = k.eylem.includes('reddedildi') || k.eylem.endsWith('basarisiz');
                return (
                  <tr key={k.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{new Date(k.zaman).toLocaleString('tr-TR')}</td>
                    <td>
                      <span className={reddedildi ? 'rozet rozet-kritik' : 'rozet rozet-nane'}>{m.eylemler[k.eylem] ?? k.eylem}</span>
                    </td>
                    <td>{k.kullaniciId ? (adlar[k.kullaniciId] ?? <span className="mono">{k.kullaniciId.slice(0, 8)}</span>) : '—'}</td>
                    <td className="kucuk ikincil">{ayrintiMetni(k.ayrinti)}</td>
                    <td className="mono">{k.ip ?? '—'}</td>
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

function ayrintiMetni(ayrinti: Record<string, unknown>): string {
  return Object.entries(ayrinti)
    .map(([a, d]) => `${a}: ${Array.isArray(d) ? d.join(', ') : String(d)}`)
    .join(' · ');
}
