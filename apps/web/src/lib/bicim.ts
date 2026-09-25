/** Doğum tarihinden (YYYY-AA-GG) bugünkü yaş. */
export function yasHesapla(dogumTarihi: string | null, bugun = new Date()): number | null {
  if (!dogumTarihi) return null;
  const [y, a, g] = dogumTarihi.split('-').map(Number);
  if (!y || !a || !g) return null;
  let yas = bugun.getFullYear() - y;
  if (bugun.getMonth() + 1 < a || (bugun.getMonth() + 1 === a && bugun.getDate() < g)) yas -= 1;
  return yas;
}

/** “GG.AA.YYYY”. Salt tarih (YYYY-AA-GG) olduğu gibi; zaman damgası Türkiye saatindeki güne çevrilir. */
export function tarihBicimle(tarih: string | null): string {
  if (!tarih) return '—';
  const gun = tarih.length > 10 ? bugunTarihi(new Date(tarih)) : tarih;
  const [y, a, g] = gun.split('-');
  return `${g}.${a}.${y}`;
}

export function telefonBicimle(tel: string | null): string {
  if (!tel) return '—';
  const m = /^0?(\d{3})(\d{3})(\d{2})(\d{2})$/.exec(tel);
  return m ? `0${m[1]} ${m[2]} ${m[3]} ${m[4]}` : tel;
}

const SAAT_BICIMI = new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const GUN_BICIMI = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' });

/** Zamanın Türkiye saatindeki “SS:DD” gösterimi. */
export function saatBicimle(zaman: string | Date): string {
  return SAAT_BICIMI.format(new Date(zaman));
}

/** Zamanın Türkiye saatinde gece yarısından bu yana geçen dakikası. */
export function gunDakikasi(zaman: string | Date): number {
  const [s, d] = saatBicimle(zaman).split(':').map(Number);
  return (s ?? 0) * 60 + (d ?? 0);
}

/** Türkiye saatine göre bugünün tarihi (YYYY-AA-GG). */
export function bugunTarihi(zaman: Date = new Date()): string {
  return GUN_BICIMI.format(zaman);
}

export function gunEkle(tarih: string, gun: number): string {
  const d = new Date(`${tarih}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + gun);
  return d.toISOString().slice(0, 10);
}

export function uzunTarih(tarih: string): string {
  return new Date(`${tarih}T12:00:00+03:00`).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Istanbul' });
}
