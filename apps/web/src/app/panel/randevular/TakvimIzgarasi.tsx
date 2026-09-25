'use client';

import { RANDEVU_DURUMLARI, RANDEVU_TURLERI } from '@dc/shared';
import type { MouseEvent } from 'react';
import { gunDakikasi, saatBicimle } from '@/lib/bicim';
import { metin } from '@/metin';
import { DURUM_STILI, type Takvim, type TakvimRandevusu } from './tipler';
import styles from './randevu.module.css';

const m = metin.randevular;
export const GUN_BASI = 8 * 60;
export const GUN_SONU = 20 * 60;
const SAAT_YUKSEKLIGI = 72;
const px = (dakika: number) => ((dakika - GUN_BASI) / 60) * SAAT_YUKSEKLIGI;

interface Props {
  takvim: Takvim;
  simdiDakika: number | null;
  seciliId: string | null;
  sec: (r: TakvimRandevusu) => void;
  bosaTikla?: (hekimId: string, dakika: number) => void;
}

export function TakvimIzgarasi({ takvim, simdiDakika, seciliId, sec, bosaTikla }: Props) {
  const saatler = Array.from({ length: (GUN_SONU - GUN_BASI) / 60 + 1 }, (_, i) => GUN_BASI / 60 + i);
  const yukseklik = px(GUN_SONU);

  function bosTiklama(hekimId: string, olay: MouseEvent<HTMLDivElement>) {
    if (!bosaTikla || olay.target !== olay.currentTarget) return;
    const y = olay.clientY - olay.currentTarget.getBoundingClientRect().top;
    const dakika = GUN_BASI + Math.floor((y / SAAT_YUKSEKLIGI) * 4) * 15;
    bosaTikla(hekimId, Math.min(Math.max(dakika, GUN_BASI), GUN_SONU - 15));
  }

  return (
    <div className={styles.takvim} role="region" aria-label={m.baslik}>
      <div className={styles.takvimUst}>
        <div className={styles.saatSutunu} />
        {takvim.hekimler.map((h) => (
          <div key={h.id} className={styles.sutunBaslik}>
            <span style={{ fontWeight: 600 }}>{h.adSoyad}</span>
          </div>
        ))}
      </div>
      <div className={styles.takvimGovde} style={{ height: yukseklik + 16 }}>
        <div className={styles.saatSutunu} style={{ position: 'relative' }}>
          {saatler.map((s) => (
            <span key={s} className={styles.saatEtiketi} style={{ top: px(s * 60) + 1 }}>{String(s).padStart(2, '0')}:00</span>
          ))}
        </div>
        {takvim.hekimler.map((h) => (
          <div
            key={h.id}
            className={styles.sutun}
            style={{ height: yukseklik, backgroundSize: `100% ${SAAT_YUKSEKLIGI / 2}px` }}
            onClick={(e) => bosTiklama(h.id, e)}
            title={bosaTikla ? m.bosAlanIpucu : undefined}
          >
            {takvim.randevular
              .filter((r) => r.hekimId === h.id)
              .map((r) => {
                const bas = gunDakikasi(r.baslangic);
                const bit = gunDakikasi(r.bitis) || 24 * 60;
                if (bit <= GUN_BASI || bas >= GUN_SONU) return null;
                const ust = px(Math.max(bas, GUN_BASI));
                const boy = Math.max(px(Math.min(bit, GUN_SONU)) - ust - 3, 18);
                const ad = r.hayvan ? `${r.hayvan.ad} (${r.hasta.ad} ${r.hasta.soyad})` : `${r.hasta.ad} ${r.hasta.soyad}`;
                return (
                  <button
                    key={r.id}
                    type="button"
                    className={styles.blok}
                    aria-pressed={seciliId === r.id}
                    aria-label={`${saatBicimle(r.baslangic)} ${ad}, ${RANDEVU_TURLERI[r.tur]}, ${RANDEVU_DURUMLARI[r.durum]}`}
                    style={{ ...DURUM_STILI[r.durum], top: ust + 1, height: boy, outline: seciliId === r.id ? '3px solid var(--mercan)' : undefined }}
                    onClick={() => sec(r)}
                  >
                    <span className={styles.blokSatir}>
                      <span className="mono" style={{ fontSize: 11 }}>{saatBicimle(r.baslangic)}</span>
                      <span className={styles.blokAd}>{ad}</span>
                    </span>
                    {boy > 30 && (
                      <span className={styles.blokSatir} style={{ fontSize: 11 }}>
                        {RANDEVU_TURLERI[r.tur]}
                        {r.kaynakAd && ` · ${r.kaynakAd}`}
                      </span>
                    )}
                  </button>
                );
              })}
          </div>
        ))}
        {simdiDakika !== null && simdiDakika >= GUN_BASI && simdiDakika <= GUN_SONU && (
          <>
            <span aria-hidden="true" className={styles.simdiCizgisi} style={{ top: px(simdiDakika) }} />
            <span className={styles.simdiEtiketi} style={{ top: px(simdiDakika) - 9 }}>
              <span className="gizli">{m.simdi} </span>
              {`${String(Math.floor(simdiDakika / 60)).padStart(2, '0')}:${String(simdiDakika % 60).padStart(2, '0')}`}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
