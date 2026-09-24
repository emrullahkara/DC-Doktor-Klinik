'use client';

import type { Izin } from '@dc/shared';
import { useRouter } from 'next/navigation';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, ApiHatasi, seciliSubeAyarla } from './api';

export interface Ben {
  kullanici: { id: string; eposta: string; adSoyad: string; meslek: string };
  subeler: { id: string; ad: string; kurumTipleri: string[] }[];
  roller: { rolKodu: string; subeId: string | null; ad: string }[];
  subeBaglami: string | null;
  izinler: Izin[];
}

interface OturumDegeri {
  ben: Ben;
  /** Seçili şube; null = tüm şubeler düzeyi */
  subeId: string | null;
  subeSec: (id: string | null) => void;
  izinVar: (izin: Izin) => boolean;
  yenile: () => Promise<void>;
  cikis: () => Promise<void>;
}

/** Kullanıcı listesini görebilen izinler (API ile aynı: rol atayabilen herkes). */
export const KULLANICI_LISTESI_IZINLERI: Izin[] = ['kullanici.yonet', 'yetki.saglik.onayla', 'mesul.mudur.ata'];

const OturumBaglami = createContext<OturumDegeri | null>(null);
const SUBE_ANAHTARI = 'dc.secili-sube';

function kayitliSube(): string | null {
  try {
    return localStorage.getItem(SUBE_ANAHTARI);
  } catch {
    return null;
  }
}

function subeKaydet(id: string | null) {
  try {
    if (id) localStorage.setItem(SUBE_ANAHTARI, id);
    else localStorage.removeItem(SUBE_ANAHTARI);
  } catch {
    /* tarayıcı depolaması kapalıysa seçim yalnızca bu oturumda kalır */
  }
}

/**
 * Başlangıç şubesi: daha önce seçilen (hâlâ geçerliyse); yoksa kişinin tüm şubelerde geçerli
 * bir rolü varsa “tüm şubeler”; yoksa rolünün bulunduğu ilk şube.
 */
function baslangicSubesi(ben: Ben): string | null {
  const kayitli = kayitliSube();
  if (kayitli && ben.subeler.some((s) => s.id === kayitli)) return kayitli;
  if (ben.roller.some((r) => r.subeId === null)) return null;
  return ben.roller.find((r) => r.subeId)?.subeId ?? null;
}

export function OturumSaglayici({ children, yukleniyor }: { children: ReactNode; yukleniyor: ReactNode }) {
  const router = useRouter();
  const [ben, setBen] = useState<Ben | null>(null);
  const [subeId, setSubeId] = useState<string | null | undefined>(undefined);

  const yukle = useCallback(
    async (sube: string | null | undefined) => {
      try {
        const ilk = await api<Ben>('/ben', { subeId: sube ?? null });
        if (sube === undefined) {
          const secilen = baslangicSubesi(ilk);
          seciliSubeAyarla(secilen);
          setSubeId(secilen);
          if (secilen !== null) {
            setBen(await api<Ben>('/ben', { subeId: secilen }));
            return;
          }
        }
        setBen(ilk);
      } catch (h) {
        if (h instanceof ApiHatasi && (h.durum === 401 || h.kod === 'SUBE_BULUNAMADI')) {
          subeKaydet(null);
          seciliSubeAyarla(null);
          router.replace('/giris');
          return;
        }
        throw h;
      }
    },
    [router],
  );

  useEffect(() => {
    void yukle(undefined);
  }, [yukle]);

  const deger = useMemo<OturumDegeri | null>(() => {
    if (!ben || subeId === undefined) return null;
    const izinler = new Set(ben.izinler);
    return {
      ben,
      subeId,
      subeSec: (id) => {
        subeKaydet(id);
        seciliSubeAyarla(id);
        setSubeId(id);
        void yukle(id);
      },
      izinVar: (izin) => izinler.has(izin),
      yenile: () => yukle(subeId),
      cikis: async () => {
        await api('/kimlik/cikis', { yontem: 'POST' }).catch(() => undefined);
        subeKaydet(null);
        seciliSubeAyarla(null);
        router.replace('/giris');
      },
    };
  }, [ben, subeId, yukle, router]);

  if (!deger) return <>{yukleniyor}</>;
  return <OturumBaglami.Provider value={deger}>{children}</OturumBaglami.Provider>;
}

export function useOturum(): OturumDegeri {
  const deger = useContext(OturumBaglami);
  if (!deger) throw new Error('useOturum, OturumSaglayici içinde kullanılmalı');
  return deger;
}
