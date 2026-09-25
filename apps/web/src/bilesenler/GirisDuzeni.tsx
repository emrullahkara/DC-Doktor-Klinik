import type { ReactNode } from 'react';
import { Logo } from './Logo';
import styles from './GirisDuzeni.module.css';

/** Oturum açılmadan görülen sayfaların (giriş) düzeni. */
export function GirisDuzeni({ children }: { children: ReactNode }) {
  return (
    <div className={styles.kap}>
      <aside className={styles.marka}>
        <Logo koyuZemin />
        <div className={styles.slogan}>
          <p className={styles.sloganBuyuk}>Klinik yönetimi, tek ekranda.</p>
          <p className={styles.sloganKucuk}>Hasta, personel, stok, finans ve mevzuat uyumu tek yerde; tıbbi sır yalnızca yetkili sağlık personelinde.</p>
        </div>
      </aside>
      <main className={styles.icerik}>{children}</main>
    </div>
  );
}
