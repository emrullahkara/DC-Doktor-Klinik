'use client';

import { KAYNAK_TURLERI, type KaynakTuru, RANDEVU_DURUMLARI, type RandevuDurumu } from '@dc/shared';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Alan } from '@/bilesenler/Alan';
import { api, hataMesaji } from '@/lib/api';
import { bugunTarihi, gunDakikasi, gunEkle, saatBicimle, uzunTarih } from '@/lib/bicim';
import { useOturum } from '@/lib/oturum';
import { metin } from '@/metin';
import { RandevuAyrinti } from './RandevuAyrinti';
import { TakvimIzgarasi } from './TakvimIzgarasi';
import { DURUM_STILI, type Takvim, type TakvimRandevusu } from './tipler';
import { YeniRandevu } from './YeniRandevu';
import styles from './randevu.module.css';

const m = metin.randevular;
const ACIKLAMA_SIRASI: RandevuDurumu[] = ['tamamlandi', 'muayenede', 'geldi', 'planlandi', 'gelmedi', 'iptal'];

export default function RandevularSayfasi() {
  const { ben, subeId, subeSec, izinVar } = useOturum();
  const [tarih, setTarih] = useState(() => bugunTarihi());
  const [takvim, setTakvim] = useState<Takvim | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [seciliId, setSeciliId] = useState<string | null>(null);
  const [yeni, setYeni] = useState<{ acik: boolean; baslangic: { hekimId: string; dakika: number } | null }>({ acik: false, baslangic: null });
  const [simdi, setSimdi] = useState(() => new Date());

  const yukle = useCallback(async () => {
    if (!subeId) return;
    try {
      setTakvim(await api<Takvim>(`/randevular/takvim?tarih=${tarih}`));
      setHata(null);
    } catch (h) {
      setHata(hataMesaji(h));
    }
  }, [tarih, subeId]);

  useEffect(() => {
    void yukle();
  }, [yukle]);

  // Saat çizgisi ve bekleme süreleri için dakikada bir güncelle; takvimi de tazele (başka resepsiyonun değişiklikleri)
  useEffect(() => {
    const z = setInterval(() => {
      setSimdi(new Date());
      void yukle();
    }, 60_000);
    return () => clearInterval(z);
  }, [yukle]);

  if (!subeId) {
    return (
      <>
        <h1>{m.baslik}</h1>
        <div className="kart" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span>{m.subeSecin}</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {ben.subeler.map((s) => (
              <button key={s.id} type="button" className="dugme dugme-ikincil" onClick={() => subeSec(s.id)}>{s.ad}</button>
            ))}
          </div>
        </div>
      </>
    );
  }

  const bugunMu = tarih === bugunTarihi(simdi);
  const secili = takvim?.randevular.find((r) => r.id === seciliId) ?? null;
  const yonetebilir = izinVar('randevu.yonet');
  const salondakiler = (takvim?.randevular ?? [])
    .filter((r) => r.durum === 'geldi')
    .sort((a, b) => (a.geldiZamani ?? '').localeCompare(b.geldiZamani ?? ''));

  return (
    <>
      <div className={styles.ust}>
        <h1>{m.baslik}</h1>
        <div className={styles.tarihDugmeleri}>
          <button type="button" className={styles.ikonDugme} aria-label={m.oncekiGun} onClick={() => setTarih(gunEkle(tarih, -1))}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
          </button>
          <button type="button" className="dugme dugme-sade dugme-kucuk" onClick={() => setTarih(bugunTarihi())}>{m.bugun}</button>
          <button type="button" className={styles.ikonDugme} aria-label={m.sonrakiGun} onClick={() => setTarih(gunEkle(tarih, 1))}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
          </button>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span className="gizli">Tarih</span>
            <input type="date" value={tarih} onChange={(e) => e.target.value && setTarih(e.target.value)} style={{ minHeight: 44, padding: '0 10px', borderRadius: 12, border: '1px solid var(--cizgi)', font: 'inherit' }} />
          </label>
          <span style={{ fontWeight: 600 }}>{uzunTarih(tarih)}</span>
        </div>
        {yonetebilir && (
          <button type="button" className="dugme" style={{ marginLeft: 'auto' }} onClick={() => { setSeciliId(null); setYeni({ acik: true, baslangic: null }); }}>
            + {m.yeni}
          </button>
        )}
      </div>

      <div className={styles.aciklama}>
        {ACIKLAMA_SIRASI.map((d) => (
          <span key={d} className={styles.aciklamaOge}>
            <span className={styles.renkKutusu} style={DURUM_STILI[d]} />
            {RANDEVU_DURUMLARI[d]}
          </span>
        ))}
        {takvim && <span style={{ marginLeft: 'auto' }}>{takvim.sube.ad} · {m.ozet(takvim.randevular.filter((r) => r.durum !== 'iptal').length, takvim.hekimler.length)}</span>}
      </div>

      {hata && <div className="kutu kutu-hata" role="alert">{hata}</div>}

      {takvim && (
        <div className={styles.duzen}>
          {takvim.hekimler.length === 0 ? (
            <div className="kart" style={{ flex: 1 }}>{m.hekimYok}</div>
          ) : (
            <TakvimIzgarasi
              takvim={takvim}
              simdiDakika={bugunMu ? gunDakikasi(simdi) : null}
              seciliId={seciliId}
              sec={(r) => { setYeni({ acik: false, baslangic: null }); setSeciliId(r.id); }}
              bosaTikla={yonetebilir ? (hekimId, dakika) => { setSeciliId(null); setYeni({ acik: true, baslangic: { hekimId, dakika } }); } : undefined}
            />
          )}

          <aside className={styles.yan}>
            {yeni.acik && (
              <YeniRandevu
                takvim={takvim}
                baslangic={yeni.baslangic}
                kapat={() => setYeni({ acik: false, baslangic: null })}
                kaydedildi={async () => { setYeni({ acik: false, baslangic: null }); await yukle(); }}
              />
            )}
            {secili && <RandevuAyrinti randevu={secili} takvim={takvim} kapat={() => setSeciliId(null)} degisti={yukle} />}
            <BeklemeSalonu salondakiler={salondakiler} takvim={takvim} simdi={simdi} sec={(r) => setSeciliId(r.id)} />
            {izinVar('ayar.yonet') && <KaynakYonetimi takvim={takvim} degisti={yukle} />}
          </aside>
        </div>
      )}
    </>
  );
}

function BeklemeSalonu({ salondakiler, takvim, simdi, sec }: { salondakiler: TakvimRandevusu[]; takvim: Takvim; simdi: Date; sec: (r: TakvimRandevusu) => void }) {
  return (
    <section className="kart" aria-label={m.bekleme} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="kart-baslik" style={{ marginBottom: 0 }}>
        <h2>{m.bekleme}</h2>
        <span className="kucuk ikincil">{salondakiler.length}</span>
      </div>
      {salondakiler.length === 0 && <span className="ikincil kucuk">{m.beklemeBos}</span>}
      {salondakiler.map((r) => {
        const dk = r.geldiZamani ? Math.max(0, Math.floor((simdi.getTime() - new Date(r.geldiZamani).getTime()) / 60_000)) : 0;
        const gecikme = gunDakikasi(simdi) > gunDakikasi(r.baslangic) + 15;
        return (
          <button key={r.id} type="button" className={styles.salonOge} onClick={() => sec(r)}>
            <span className={styles.siraNo}>{r.siraNo}</span>
            <span style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
              <span style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                <strong>{r.hayvan ? `${r.hayvan.ad} · ` : ''}{r.hasta.ad} {r.hasta.soyad}</strong>
                <span className="kucuk" style={{ fontWeight: 600, color: gecikme ? 'var(--uyari-metin)' : 'var(--ikincil)' }}>{m.beklemeSuresi(dk)}</span>
              </span>
              <span className="kucuk ikincil">{takvim.hekimler.find((h) => h.id === r.hekimId)?.adSoyad} · {saatBicimle(r.baslangic)}</span>
            </span>
          </button>
        );
      })}
    </section>
  );
}

function KaynakYonetimi({ takvim, degisti }: { takvim: Takvim; degisti: () => Promise<void> }) {
  const [ad, setAd] = useState('');
  const [tur, setTur] = useState<KaynakTuru>('oda');
  const [hata, setHata] = useState<string | null>(null);

  async function ekle(olay: FormEvent) {
    olay.preventDefault();
    setHata(null);
    try {
      await api('/kaynaklar', { yontem: 'POST', govde: { ad, tur } });
      setAd('');
      await degisti();
    } catch (h) {
      setHata(hataMesaji(h));
    }
  }

  return (
    <section className="kart" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <h2>{m.kaynakYonetimi}</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {takvim.kaynaklar.map((k) => <span key={k.id} className="cip">{k.ad}</span>)}
      </div>
      <form onSubmit={ekle} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 8, alignItems: 'end' }}>
        <Alan etiket={m.kaynakAd}><input value={ad} onChange={(e) => setAd(e.target.value)} maxLength={80} required /></Alan>
        <Alan etiket={m.kaynakTur}>
          <select value={tur} onChange={(e) => setTur(e.target.value as KaynakTuru)}>
            {Object.entries(KAYNAK_TURLERI).map(([k, a]) => <option key={k} value={k}>{a}</option>)}
          </select>
        </Alan>
        <button type="submit" className="dugme dugme-ikincil dugme-kucuk" disabled={!ad.trim()}>{m.kaynakEkle}</button>
      </form>
      {hata && <div className="kutu kutu-hata" role="alert">{hata}</div>}
    </section>
  );
}
