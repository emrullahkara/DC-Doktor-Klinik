'use client';

import {
  ayinGunleri,
  CIZELGE_DURUMLARI,
  type CizelgeDurumu,
  GOREV_SABLONLARI,
  GOREV_TURLERI,
  type GorevTuru,
  type Ihlal,
  IZIN_TURLERI,
  type IzinTuru,
  MESLEKLER,
  type Meslek,
  type NobetAyarlari,
  sablonZamani,
  trGunu,
} from '@dc/shared';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Alan } from '@/bilesenler/Alan';
import { api, ApiHatasi, hataMesaji } from '@/lib/api';
import { bugunTarihi, saatBicimle, tarihBicimle, uzunTarih } from '@/lib/bicim';
import { useOturum } from '@/lib/oturum';
import { metin } from '@/metin';
import styles from './nobet.module.css';

const m = metin.nobet;

interface GorevSatiri {
  id: string;
  kullaniciId: string;
  tur: GorevTuru;
  baslangic: string;
  bitis: string;
  notu: string;
}

interface CizelgeVerisi {
  ay: string;
  cizelge: {
    id: string;
    durum: CizelgeDurumu;
    hazirlayan: string | null;
    onayaGonderenId: string | null;
    onaylayan: string | null;
    onayZamani: string | null;
    ihlalGerekcesi: string | null;
    redNedeni: string | null;
  } | null;
  personel: { id: string; adSoyad: string; meslek: string }[];
  gorevler: GorevSatiri[];
  izinler: { id: string; kullaniciId: string; tur: IzinTuru; baslangic: string; bitis: string }[];
  ihlaller: Ihlal[];
  ayar: NobetAyarlari;
}

const ayAdi = (ay: string) => new Date(`${ay}-15T12:00:00+03:00`).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric', timeZone: 'Europe/Istanbul' });
const ayKaydir = (ay: string, n: number) => {
  const [y, a] = ay.split('-').map(Number);
  return new Date(Date.UTC(y!, a! - 1 + n, 1)).toISOString().slice(0, 7);
};
const HAFTA_GUNU = ['Pz', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct'];
const haftaGunu = (gun: string) => new Date(`${gun}T12:00:00Z`).getUTCDay();
const saatFarki = (g: GorevSatiri) => Math.round((Date.parse(g.bitis) - Date.parse(g.baslangic)) / 3_600_000);

export default function NobetSayfasi() {
  const { ben, subeId, izinVar } = useOturum();
  const [ay, setAy] = useState(() => ayKaydir(bugunTarihi().slice(0, 7), 1));
  const [veri, setVeri] = useState<CizelgeVerisi | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [secili, setSecili] = useState<{ kisi: string; gun: string } | null>(null);
  const planlayici = izinVar('nobet.planla');
  const onaylayici = izinVar('nobet.onayla');

  const yukle = useCallback(async () => {
    if (!subeId) return;
    try {
      setVeri(await api<CizelgeVerisi>(`/cizelge?ay=${ay}`));
      setHata(null);
    } catch (h) {
      setHata(hataMesaji(h));
    }
  }, [ay, subeId]);

  useEffect(() => {
    setVeri(null);
    setSecili(null);
    void yukle();
  }, [yukle]);

  async function islem(is: () => Promise<unknown>) {
    setHata(null);
    try {
      await is();
      await yukle();
    } catch (h) {
      setHata(hataMesaji(h));
    }
  }

  const baslik = (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 260 }}>
        <h1>{m.baslik}</h1>
        <p className="ikincil" style={{ margin: '4px 0 0' }}>{m.aciklama}</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button type="button" className="dugme dugme-sade dugme-kucuk" onClick={() => setAy(ayKaydir(ay, -1))} aria-label={m.oncekiAy}>‹</button>
        <strong style={{ minWidth: 130, textAlign: 'center' }} aria-live="polite">{ayAdi(ay)}</strong>
        <button type="button" className="dugme dugme-sade dugme-kucuk" onClick={() => setAy(ayKaydir(ay, 1))} aria-label={m.sonrakiAy}>›</button>
      </div>
    </div>
  );

  if (!subeId) return <>{baslik}<section className="kart">{m.subeSecin}</section></>;
  if (!veri) return <>{baslik}{hata ? <div className="kutu kutu-hata" role="alert">{hata}</div> : <p>{metin.genel.yukleniyor}</p>}</>;

  const c = veri.cizelge;
  const duzenlenebilir = planlayici && c?.durum === 'taslak';
  const gunler = ayinGunleri(ay);
  const kisiAdi = (id: string) => veri.personel.find((p) => p.id === id)?.adSoyad ?? '';
  const ihlalliGorevler = new Set(veri.ihlaller.flatMap((i) => i.gorevIdleri));
  const hucreGorevleri = (kisi: string, gun: string) => veri.gorevler.filter((g) => g.kullaniciId === kisi && trGunu(Date.parse(g.baslangic)) === gun);
  const hucreIzni = (kisi: string, gun: string) => veri.izinler.find((i) => i.kullaniciId === kisi && i.baslangic <= gun && i.bitis >= gun);
  const gorunurKisiler = c?.durum === 'yayinda' && !planlayici && !onaylayici ? veri.personel.filter((p) => veri.gorevler.some((g) => g.kullaniciId === p.id) || p.id === ben.kullanici.id) : veri.personel;

  return (
    <>
      {baslik}
      {hata && <div className="kutu kutu-hata" role="alert">{hata}</div>}

      {!c ? (
        <section className="kart" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="ikincil" style={{ flex: 1 }}>{m.yok}</span>
          {planlayici && <button type="button" className="dugme" onClick={() => void islem(() => api('/cizelge', { yontem: 'POST', govde: { ay } }))}>{m.olustur}</button>}
        </section>
      ) : (
        <>
          <DurumCubugu veri={veri} benId={ben.kullanici.id} planlayici={planlayici} onaylayici={onaylayici} islem={islem} />

          {c.durum !== 'yayinda' && !planlayici && !onaylayici ? (
            <section className="kart ikincil">{m.taslakGizli}</section>
          ) : (
            <section className="kart" aria-label={`${m.baslik} · ${ayAdi(ay)}`} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className={styles.lejant}>
                {(Object.keys(GOREV_TURLERI) as GorevTuru[]).map((t) => (
                  <span key={t}><span className={`${styles.cip} ${styles[t]}`}>{GOREV_TURLERI[t].kisa}</span> {GOREV_TURLERI[t].ad}</span>
                ))}
                <span><span className={`${styles.cip} ${styles.izin}`}>{m.izin}</span></span>
              </div>
              <div className="tablo-kaydir">
                <table className={styles.izgara}>
                  <thead>
                    <tr>
                      <th className={styles.kisiHucre}>{m.personel}</th>
                      {gunler.map((g) => (
                        <th key={g} scope="col" className={[0, 6].includes(haftaGunu(g)) ? styles.haftaSonu : undefined}>
                          {Number(g.slice(8))}<br />{HAFTA_GUNU[haftaGunu(g)]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {gorunurKisiler.map((p) => (
                      <tr key={p.id}>
                        <th scope="row" className={styles.kisiHucre}>
                          {p.adSoyad}
                          <span>{MESLEKLER[p.meslek as Meslek] ?? p.meslek} · {m.toplamSaat(veri.gorevler.filter((g) => g.kullaniciId === p.id && g.tur !== 'icap').reduce((t, g) => t + saatFarki(g), 0))}</span>
                        </th>
                        {gunler.map((g) => {
                          const liste = hucreGorevleri(p.id, g);
                          const izin = hucreIzni(p.id, g);
                          const seciliMi = secili?.kisi === p.id && secili.gun === g;
                          const icerik = (
                            <>
                              {izin && <span className={`${styles.cip} ${styles.izin}`} title={IZIN_TURLERI[izin.tur]}>{m.izin}</span>}
                              {liste.map((gr) => (
                                <span key={gr.id} className={`${styles.cip} ${styles[gr.tur]} ${ihlalliGorevler.has(gr.id) ? styles.ihlalli : ''}`}>
                                  {GOREV_TURLERI[gr.tur].kisa} {saatBicimle(gr.baslangic).slice(0, 2)}
                                </span>
                              ))}
                            </>
                          );
                          return (
                            <td key={g} className={[0, 6].includes(haftaGunu(g)) ? styles.haftaSonu : undefined}>
                              <button
                                type="button"
                                className={`${styles.hucre} ${seciliMi ? styles.hucreSecili : ''}`}
                                aria-label={`${m.hucre(p.adSoyad, uzunTarih(g))}${liste.length ? ` · ${liste.map((x) => `${GOREV_TURLERI[x.tur].ad} ${saatBicimle(x.baslangic)}`).join(', ')}` : ''}${izin ? ` · ${m.izin}` : ''}`}
                                aria-pressed={seciliMi}
                                onClick={() => setSecili(seciliMi ? null : { kisi: p.id, gun: g })}
                              >
                                {icerik}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {secili && (
                <HucrePaneli
                  kisi={kisiAdi(secili.kisi)}
                  gun={secili.gun}
                  gorevler={hucreGorevleri(secili.kisi, secili.gun)}
                  duzenlenebilir={duzenlenebilir}
                  kapat={() => setSecili(null)}
                  ekle={(govde) => islem(() => api(`/cizelge/${c.id}/gorevler`, { yontem: 'POST', govde: { kullaniciId: secili.kisi, ...govde } }))}
                  sil={(id) => islem(() => api(`/gorevler/${id}/sil`, { yontem: 'POST' }))}
                />
              )}
            </section>
          )}

          {(planlayici || onaylayici) && (
            <section className="kart" aria-label={m.ihlaller}>
              <h2 style={{ marginBottom: 8 }}>{m.ihlaller}</h2>
              {veri.ihlaller.length === 0 ? (
                <p className="ikincil" style={{ margin: 0 }}>{m.ihlalYok}</p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {veri.ihlaller.map((i, n) => (
                    <li key={n}><strong>{kisiAdi(i.kullaniciId)}</strong> · {i.aciklama}</li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </>
      )}

      <Kurallar ayar={veri.ayar} duzenlenebilir={izinVar('ayar.yonet')} kaydedildi={() => void yukle()} />
    </>
  );
}

function DurumCubugu({ veri, benId, planlayici, onaylayici, islem }: { veri: CizelgeVerisi; benId: string; planlayici: boolean; onaylayici: boolean; islem: (is: () => Promise<unknown>) => Promise<void> }) {
  const c = veri.cizelge!;
  const [karar, setKarar] = useState<'onay' | 'red' | null>(null);
  const [metinDeger, setMetinDeger] = useState('');
  const kendiGonderdi = c.onayaGonderenId === benId;
  const rozet = c.durum === 'yayinda' ? 'rozet rozet-nane' : c.durum === 'onay_bekliyor' ? 'rozet rozet-uyari' : 'rozet';

  async function gonder(olay: FormEvent) {
    olay.preventDefault();
    const govde = karar === 'onay' ? { onay: true, gerekce: metinDeger || undefined } : { onay: false, redNedeni: metinDeger };
    await islem(() => api(`/cizelge/${c.id}/karar`, { yontem: 'POST', govde }));
    setKarar(null);
    setMetinDeger('');
  }

  return (
    <section className="kart" aria-label={CIZELGE_DURUMLARI[c.durum]} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <span className={rozet}>{CIZELGE_DURUMLARI[c.durum]}</span>
        <span className="kucuk ikincil" style={{ flex: 1 }}>
          {m.hazirlayan}: {c.hazirlayan}
          {c.onaylayan && c.onayZamani && ` · ${m.onaylayan(c.onaylayan, `${tarihBicimle(c.onayZamani)} ${saatBicimle(c.onayZamani)}`)}`}
        </span>
        {planlayici && c.durum === 'taslak' && (
          <button type="button" className="dugme dugme-kucuk" onClick={() => void islem(() => api(`/cizelge/${c.id}/onaya-gonder`, { yontem: 'POST' }))}>{m.onayaGonder}</button>
        )}
        {onaylayici && c.durum === 'onay_bekliyor' && !kendiGonderdi && (
          <>
            <button type="button" className="dugme dugme-kucuk" onClick={() => setKarar('onay')} aria-expanded={karar === 'onay'}>{m.onayla}</button>
            <button type="button" className="dugme dugme-sade dugme-kucuk" onClick={() => setKarar('red')} aria-expanded={karar === 'red'}>{m.reddet}</button>
          </>
        )}
        {planlayici && c.durum !== 'taslak' && (
          <button type="button" className="dugme dugme-sade dugme-kucuk" onClick={() => void islem(() => api(`/cizelge/${c.id}/revizyon`, { yontem: 'POST' }))}>{m.revizyon}</button>
        )}
      </div>
      {c.durum === 'onay_bekliyor' && kendiGonderdi && <div className="kutu kutu-bilgi">{m.kendiGonderdin}</div>}
      {c.redNedeni && c.durum === 'taslak' && <div className="kutu kutu-uyari">{m.reddedildi(c.redNedeni)}</div>}
      {c.ihlalGerekcesi && c.durum === 'yayinda' && <div className="kutu kutu-uyari">{m.ihlalGerekcesi(c.ihlalGerekcesi)}</div>}
      {karar && (
        <form onSubmit={(e) => void gonder(e)} aria-label={karar === 'onay' ? m.onayla : m.reddet} style={{ display: 'flex', gap: 8, alignItems: 'end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            {karar === 'onay' ? (
              veri.ihlaller.length > 0 && (
                <Alan etiket={m.gerekce} ipucu={m.gerekceIpucu}>
                  <input value={metinDeger} onChange={(e) => setMetinDeger(e.target.value)} minLength={5} required />
                </Alan>
              )
            ) : (
              <Alan etiket={m.redNedeni}><input value={metinDeger} onChange={(e) => setMetinDeger(e.target.value)} minLength={3} required /></Alan>
            )}
          </div>
          <button type="submit" className="dugme dugme-kucuk">{karar === 'onay' ? m.onayla : m.reddet}</button>
        </form>
      )}
    </section>
  );
}

function HucrePaneli({
  kisi,
  gun,
  gorevler,
  duzenlenebilir,
  kapat,
  ekle,
  sil,
}: {
  kisi: string;
  gun: string;
  gorevler: GorevSatiri[];
  duzenlenebilir: boolean;
  kapat: () => void;
  ekle: (govde: { tur: GorevTuru; baslangic: string; bitis: string }) => Promise<void>;
  sil: (id: string) => Promise<void>;
}) {
  const [tur, setTur] = useState<GorevTuru>('vardiya');
  const [saat, setSaat] = useState('08:00');
  const [sure, setSure] = useState(8);

  return (
    <div role="region" aria-label={m.secili} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 16, borderRadius: 12, background: '#f9f8f4' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <strong style={{ flex: 1 }}>{kisi} · {uzunTarih(gun)}</strong>
        <button type="button" className="dugme dugme-sade dugme-kucuk" onClick={kapat}>{m.kapat}</button>
      </div>
      {gorevler.length === 0 ? (
        <p className="ikincil kucuk" style={{ margin: 0 }}>{m.gorevYok}</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {gorevler.map((g) => (
            <li key={g.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ flex: 1 }}>
                {GOREV_TURLERI[g.tur].ad} · {saatBicimle(g.baslangic)}–{saatBicimle(g.bitis)}
                {trGunu(Date.parse(g.bitis) - 1) !== gun && ` (${tarihBicimle(g.bitis)})`}
              </span>
              {duzenlenebilir && <button type="button" className="dugme dugme-sade dugme-kucuk" onClick={() => void sil(g.id)}>{m.kaldir}</button>}
            </li>
          ))}
        </ul>
      )}
      {duzenlenebilir && (
        <>
          <div>
            <span className="kucuk ikincil" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>{m.sablonlar}</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {GOREV_SABLONLARI.map((s) => (
                <button key={s.kod} type="button" className="dugme dugme-ikincil dugme-kucuk" onClick={() => void ekle({ tur: s.tur, ...sablonZamani(gun, s.baslangic, s.sureSaat) })}>
                  {s.ad}
                </button>
              ))}
            </div>
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); void ekle({ tur, ...sablonZamani(gun, saat, sure) }); }}
            aria-label={m.ozel}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, alignItems: 'end' }}
          >
            <Alan etiket={m.tur}>
              <select value={tur} onChange={(e) => setTur(e.target.value as GorevTuru)}>
                {(Object.keys(GOREV_TURLERI) as GorevTuru[]).map((t) => <option key={t} value={t}>{GOREV_TURLERI[t].ad}</option>)}
              </select>
            </Alan>
            <Alan etiket={m.baslangic}><input type="time" value={saat} onChange={(e) => setSaat(e.target.value)} required /></Alan>
            <Alan etiket={m.sure}><input type="number" min={1} max={36} value={sure} onChange={(e) => setSure(Number(e.target.value))} /></Alan>
            <button type="submit" className="dugme dugme-kucuk">{m.ekle}</button>
          </form>
        </>
      )}
    </div>
  );
}

function Kurallar({ ayar, duzenlenebilir, kaydedildi }: { ayar: NobetAyarlari; duzenlenebilir: boolean; kaydedildi: () => void }) {
  const [acik, setAcik] = useState(false);
  const [deger, setDeger] = useState(ayar);
  const [durum, setDurum] = useState<{ tur: 'hata' | 'basari'; mesaj: string } | null>(null);

  async function kaydet(olay: FormEvent) {
    olay.preventDefault();
    try {
      await api('/nobet/ayarlar', { yontem: 'PATCH', govde: deger });
      setDurum({ tur: 'basari', mesaj: m.ayarKaydedildi });
      setAcik(false);
      kaydedildi();
    } catch (h) {
      setDurum({ tur: 'hata', mesaj: h instanceof ApiHatasi ? h.message : hataMesaji(h) });
    }
  }

  return (
    <section className="kart" aria-label={m.ayarlar} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 16 }}>{m.ayarlar}</h2>
        <span className="ikincil kucuk" style={{ flex: 1 }}>{m.ayarMetni(ayar.haftalikAzamiSaat, ayar.nobetSonrasiDinlenmeSaat, ayar.ardisikGeceAzami)}</span>
        {duzenlenebilir && <button type="button" className="dugme dugme-sade dugme-kucuk" onClick={() => setAcik(!acik)} aria-expanded={acik}>{metin.genel.duzenle}</button>}
      </div>
      {durum && <div className={durum.tur === 'hata' ? 'kutu kutu-hata' : 'kutu kutu-basari'} role={durum.tur === 'hata' ? 'alert' : 'status'}>{durum.mesaj}</div>}
      {acik && (
        <form onSubmit={(e) => void kaydet(e)} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, alignItems: 'end' }}>
          <Alan etiket={m.haftalik}><input type="number" min={1} max={168} value={deger.haftalikAzamiSaat} onChange={(e) => setDeger({ ...deger, haftalikAzamiSaat: Number(e.target.value) })} /></Alan>
          <Alan etiket={m.dinlenme}><input type="number" min={0} max={72} value={deger.nobetSonrasiDinlenmeSaat} onChange={(e) => setDeger({ ...deger, nobetSonrasiDinlenmeSaat: Number(e.target.value) })} /></Alan>
          <Alan etiket={m.gece}><input type="number" min={1} max={14} value={deger.ardisikGeceAzami} onChange={(e) => setDeger({ ...deger, ardisikGeceAzami: Number(e.target.value) })} /></Alan>
          <button type="submit" className="dugme dugme-kucuk">{metin.genel.kaydet}</button>
        </form>
      )}
    </section>
  );
}

