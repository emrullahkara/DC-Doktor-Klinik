'use client';

import { type Izin, PERSONEL_BELGE_TURLERI } from '@dc/shared';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactNode, useState } from 'react';
import { Logo } from '@/bilesenler/Logo';
import { tarihBicimle } from '@/lib/bicim';
import { KULLANICI_LISTESI_IZINLERI, OturumSaglayici, useOturum } from '@/lib/oturum';
import { metin } from '@/metin';
import styles from './panel.module.css';

const m = metin.panel;

interface MenuOgesi {
  ad: string;
  yol?: string;
  /** Bu izinlerden biri varsa menüde görünür */
  izinler?: Izin[];
  ikon: ReactNode;
}

const ikon = (d: ReactNode) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
);

const MENU: MenuOgesi[] = [
  { ad: m.menu.komuta, yol: '/panel', ikon: ikon(<><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>) },
  { ad: m.menu.randevular, yol: '/panel/randevular', izinler: ['randevu.goruntule'], ikon: ikon(<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>) },
  { ad: m.menu.hastalar, yol: '/panel/hastalar', izinler: ['hasta.demografik.goruntule'], ikon: ikon(<><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>) },
  { ad: m.menu.klinik, ikon: ikon(<path d="M3 12h4l2-5 4 10 2-5h6" />) },
  { ad: m.menu.personel, yol: '/panel/personel', ikon: ikon(<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c1-3.5 3.5-5 6.5-5s5.5 1.5 6.5 5" /></>) },
  { ad: m.menu.stok, ikon: ikon(<><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" /><path d="M4 7.5l8 4.5 8-4.5M12 12v9" /></>) },
  { ad: m.menu.finans, yol: '/panel/finans', izinler: ['finans.goruntule', 'finans.tahsilat', 'fiyat.yonet', 'fiyat.onayla'], ikon: ikon(<><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M7 15h3" /></>) },
  { ad: m.menu.belgeler, yol: '/panel/belgeler', izinler: ['belge.kurum.yonet', 'komuta.goruntule'], ikon: ikon(<><path d="M6 3h9l4 4v14H6z" /><path d="M14 3v5h5M9 13h7M9 17h5" /></>) },
  { ad: m.menu.kalite, ikon: ikon(<path d="M12 3l8 3v6c0 4.5-3.5 8-8 9-4.5-1-8-4.5-8-9V6z" />) },
  { ad: m.menu.kullanicilar, yol: '/panel/kullanicilar', izinler: KULLANICI_LISTESI_IZINLERI, ikon: ikon(<><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /><path d="M19 3l2 2-2 2" /></>) },
  { ad: m.menu.denetim, yol: '/panel/denetim', izinler: ['denetim.goruntule'], ikon: ikon(<><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></>) },
];

/** Alt sayfalar (ör. /panel/hastalar/123) üst menü öğesini etkin gösterir. */
function aktifMi(gecerli: string, hedef: string): boolean {
  return hedef === '/panel' ? gecerli === hedef : gecerli === hedef || gecerli.startsWith(`${hedef}/`);
}

export default function PanelDuzeni({ children }: { children: ReactNode }) {
  return (
    <OturumSaglayici yukleniyor={<div className={styles.yukleniyor} role="status">{metin.genel.yukleniyor}</div>}>
      <Kabuk>{children}</Kabuk>
    </OturumSaglayici>
  );
}

function Kabuk({ children }: { children: ReactNode }) {
  const { ben, subeId, subeSec, izinVar, cikis } = useOturum();
  const yol = usePathname();
  const [menuAcik, setMenuAcik] = useState(false);
  const baslar = ben.kullanici.adSoyad.split(' ').map((p) => p[0]).slice(0, 2).join('').toLocaleUpperCase('tr');
  const anaRol = ben.roller[0]?.ad ?? '';

  return (
    <div className={styles.kabuk}>
      <nav aria-label={m.menu.anaMenu} className={menuAcik ? styles.menuAcik : styles.menu}>
        <div className={styles.logoSatir}>
          <Logo koyuZemin />
        </div>
        <label className={styles.subeSecici}>
          <span>{m.sube}</span>
          <select value={subeId ?? ''} onChange={(e) => subeSec(e.target.value || null)}>
            <option value="">{metin.genel.tumSubeler} ({ben.subeler.length})</option>
            {ben.subeler.map((s) => (
              <option key={s.id} value={s.id}>{s.ad}</option>
            ))}
          </select>
        </label>
        <ul className={styles.menuListe}>
          {MENU.filter((o) => !o.izinler || o.izinler.some(izinVar)).map((o) =>
            o.yol ? (
              <li key={o.ad}>
                <Link href={o.yol} aria-current={aktifMi(yol, o.yol) ? 'page' : undefined} className={aktifMi(yol, o.yol) ? styles.menuOgeAktif : styles.menuOge} onClick={() => setMenuAcik(false)}>
                  {o.ikon}
                  {o.ad}
                </Link>
              </li>
            ) : (
              <li key={o.ad}>
                <span className={styles.menuOgePasif} aria-disabled="true">
                  {o.ikon}
                  {o.ad}
                  <span className={styles.yakinda}>{metin.genel.yakinda}</span>
                </span>
              </li>
            ),
          )}
        </ul>
      </nav>

      <div className={styles.ana}>
        <header className={styles.ust}>
          <button type="button" className={styles.menuDugmesi} aria-label={m.menu.anaMenu} aria-expanded={menuAcik} onClick={() => setMenuAcik(!menuAcik)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className={styles.kullanici}>
            <span className={styles.avatar} aria-hidden="true">{baslar}</span>
            <span className={styles.kullaniciMetin}>
              <span style={{ fontWeight: 600 }}>{ben.kullanici.adSoyad}</span>
              <span className="kucuk ikincil">{anaRol}</span>
            </span>
          </div>
          <button type="button" className="dugme dugme-sade dugme-kucuk" onClick={() => void cikis()}>{m.cikis}</button>
        </header>
        <main className={styles.icerik}>
          {ben.askidakiIzinler[0] && (
            <div className="kutu kutu-hata" role="alert">
              <span style={{ flex: 1 }}>
                {metin.belge.askiUyariKendi(PERSONEL_BELGE_TURLERI[ben.askidakiIzinler[0].belge].ad, tarihBicimle(ben.askidakiIzinler[0].bitis))}{' '}
                <Link href={`/panel/personel/${ben.kullanici.id}`}>{metin.belge.askiDetay}</Link>
              </span>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
