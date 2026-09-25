import type { Metadata } from 'next';
import { IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';
import type { ReactNode } from 'react';
import { metin } from '@/metin';
import './globals.css';

const plex = IBM_Plex_Sans({ subsets: ['latin', 'latin-ext', 'cyrillic'], weight: ['400', '500', '600'], variable: '--font-plex' });
const plexMono = IBM_Plex_Mono({ subsets: ['latin', 'latin-ext'], weight: ['500'], variable: '--font-plex-mono' });

export const metadata: Metadata = {
  title: metin.uygulama.ad,
  description: metin.uygulama.aciklama,
};

export default function KokDuzen({ children }: { children: ReactNode }) {
  return (
    <html lang={metin.dil} dir={metin.yon} className={`${plex.variable} ${plexMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
