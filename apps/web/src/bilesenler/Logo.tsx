interface Props {
  boyut?: number;
  koyuZemin?: boolean;
}

/** “Koruyan Halka” işareti (docs/12-marka-kilavuzu.md). */
export function LogoIsaret({ boyut = 36, koyuZemin = false }: Props) {
  const halka = koyuZemin ? '#F6F4EF' : '#0E4F5C';
  const arti = koyuZemin ? '#E8896E' : '#D9694A';
  return (
    <svg width={boyut} height={boyut} viewBox="0 0 64 64" aria-hidden="true">
      <path d="M52 16 A24 24 0 1 0 52 48" fill="none" stroke={halka} strokeWidth="8" strokeLinecap="round" />
      <rect x="27" y="21" width="10" height="22" rx="3" fill={arti} />
      <rect x="21" y="27" width="22" height="10" rx="3" fill={arti} />
    </svg>
  );
}

export function Logo({ koyuZemin = false }: Props) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <LogoIsaret koyuZemin={koyuZemin} />
      <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
        <span style={{ fontSize: 17, fontWeight: 600, color: koyuZemin ? '#F6F4EF' : '#0E4F5C' }}>DC Doktor</span>
        <span style={{ fontSize: 13, color: koyuZemin ? '#CFE6DF' : '#13232A' }}>Klinik</span>
      </span>
    </span>
  );
}
