import { cloneElement, type ReactElement, useId } from 'react';

interface Props {
  etiket: string;
  ipucu?: string;
  hata?: string;
  genis?: boolean;
  /** Tek bir input/select/textarea */
  children: ReactElement<{ id?: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }>;
}

/**
 * Etiketli form alanı. İpucu ve hata metni alanın adına karışmaz; ekran okuyucuya
 * `aria-describedby` ile açıklama olarak bağlanır.
 */
export function Alan({ etiket, ipucu, hata, genis, children }: Props) {
  const id = useId();
  const aciklamaId = `${id}-aciklama`;
  const aciklama = hata ?? ipucu;
  return (
    <div className="alan" style={genis ? { gridColumn: '1 / -1' } : undefined}>
      <label htmlFor={id}>
        <span>{etiket}</span>
      </label>
      {cloneElement(children, {
        id,
        'aria-describedby': aciklama ? aciklamaId : undefined,
        'aria-invalid': hata ? true : undefined,
      })}
      {aciklama && (
        <span id={aciklamaId} className={hata ? 'alan-hata' : 'alan-ipucu'} role={hata ? 'alert' : undefined}>
          {aciklama}
        </span>
      )}
    </div>
  );
}
