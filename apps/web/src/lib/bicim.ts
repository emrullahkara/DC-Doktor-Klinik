/** Doğum tarihinden (YYYY-AA-GG) bugünkü yaş. */
export function yasHesapla(dogumTarihi: string | null, bugun = new Date()): number | null {
  if (!dogumTarihi) return null;
  const [y, a, g] = dogumTarihi.split('-').map(Number);
  if (!y || !a || !g) return null;
  let yas = bugun.getFullYear() - y;
  if (bugun.getMonth() + 1 < a || (bugun.getMonth() + 1 === a && bugun.getDate() < g)) yas -= 1;
  return yas;
}

export function tarihBicimle(tarih: string | null): string {
  if (!tarih) return '—';
  const [y, a, g] = tarih.slice(0, 10).split('-');
  return `${g}.${a}.${y}`;
}

export function telefonBicimle(tel: string | null): string {
  if (!tel) return '—';
  const m = /^0?(\d{3})(\d{3})(\d{2})(\d{2})$/.exec(tel);
  return m ? `0${m[1]} ${m[2]} ${m[3]} ${m[4]}` : tel;
}
