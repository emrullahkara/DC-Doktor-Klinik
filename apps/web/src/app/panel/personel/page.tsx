'use client';

import { MESLEKLER, type Meslek } from '@dc/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, hataMesaji } from '@/lib/api';
import { useOturum } from '@/lib/oturum';
import { metin } from '@/metin';

const m = metin.personel;

interface PersonelOzeti {
  id: string;
  adSoyad: string;
  meslek: string;
  aktif: boolean;
  unvanBrans: string | null;
  roller: string[];
  belgeSayisi: number;
  eksikSayisi: number;
  dolmus: number;
  kritik: number;
  ciddi: number;
  uyari: number;
  askida: boolean;
}

export default function PersonelSayfasi() {
  const { ben, izinVar } = useOturum();
  const router = useRouter();
  const yetkili = izinVar('personel.goruntule') || izinVar('personel.yonet');
  const [liste, setListe] = useState<PersonelOzeti[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [sorunlular, setSorunlular] = useState(false);

  useEffect(() => {
    // Personel yetkisi olmayan kişi yalnızca kendi kartını görür
    if (!yetkili) {
      router.replace(`/panel/personel/${ben.kullanici.id}`);
      return;
    }
    api<PersonelOzeti[]>('/personel').then(setListe).catch((h) => setHata(hataMesaji(h)));
  }, [yetkili, router, ben.kullanici.id]);

  if (!yetkili) return null;
  const sorunlu = (p: PersonelOzeti) => p.askida || p.dolmus + p.kritik + p.ciddi + p.eksikSayisi > 0;
  const gosterilen = (liste ?? []).filter((p) => !sorunlular || sorunlu(p));
  const toplam = (liste ?? []).reduce((t, p) => ({ d: t.d + p.dolmus, k: t.k + p.kritik - p.dolmus + p.ciddi + p.uyari, e: t.e + p.eksikSayisi }), { d: 0, k: 0, e: 0 });

  return (
    <>
      <div>
        <h1>{m.baslik}</h1>
        <p className="ikincil" style={{ margin: '4px 0 0' }}>{m.aciklama}</p>
      </div>
      {hata && <div className="kutu kutu-hata" role="alert">{hata}</div>}
      {liste && (
        <section className="kart" aria-label={m.baslik}>
          <div className="kart-baslik" style={{ flexWrap: 'wrap' }}>
            <span className="ikincil">{m.ozet(toplam.d, toplam.k, toplam.e)}</span>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 44 }}>
              <input type="checkbox" checked={sorunlular} onChange={(e) => setSorunlular(e.target.checked)} style={{ width: 20, height: 20 }} />
              {m.sorunlular}
            </label>
          </div>
          <div className="tablo-kaydir">
            <table className="tablo">
              <thead>
                <tr><th>{m.adSoyad}</th><th>{m.meslek}</th><th>{m.roller}</th><th>{m.belgeler}</th></tr>
              </thead>
              <tbody>
                {gosterilen.map((p) => (
                  <tr key={p.id}>
                    <td><Link href={`/panel/personel/${p.id}`} style={{ fontWeight: 600 }}>{p.adSoyad}</Link></td>
                    <td>
                      {MESLEKLER[p.meslek as Meslek] ?? p.meslek}
                      {p.unvanBrans && <span className="kucuk ikincil" style={{ display: 'block' }}>{p.unvanBrans}</span>}
                    </td>
                    <td className="kucuk">{p.roller.join(', ') || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {p.askida && <span className="rozet rozet-kritik">{m.askida}</span>}
                        {p.dolmus > 0 && <span className="rozet rozet-kritik">{m.dolmus(p.dolmus)}</span>}
                        {p.kritik - p.dolmus > 0 && <span className="rozet rozet-kritik">{p.kritik - p.dolmus} {metin.alarmlar.seviye.kritik.toLocaleLowerCase('tr')}</span>}
                        {p.ciddi > 0 && <span className="rozet rozet-uyari">{p.ciddi} {metin.alarmlar.seviye.ciddi.toLocaleLowerCase('tr')}</span>}
                        {p.uyari > 0 && <span className="rozet rozet-bilgi">{p.uyari} {metin.alarmlar.seviye.uyari.toLocaleLowerCase('tr')}</span>}
                        {p.eksikSayisi > 0 && <span className="rozet rozet-uyari">{p.eksikSayisi} {metin.alarmlar.seviye.eksik.toLocaleLowerCase('tr')}</span>}
                        {!sorunlu(p) && p.uyari === 0 && <span className="rozet rozet-nane">{m.hepsiTamam}</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
