import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { AYARLAR, type Ayarlar } from '../ayarlar';

const SURUM = 'v1';

/**
 * Hassas alanların (kimlik numarası) uygulama katmanında şifrelenmesi.
 *  - `sifrele` / `coz`: AES-256-GCM, her değer için rastgele IV; bütünlük etiketiyle birlikte saklanır.
 *  - `ozet`: HMAC-SHA256 kör indeks; şifreli alanda tekillik ve tam eşleşme araması için.
 * Şifreleme ve özet anahtarları ana anahtardan HKDF ile ayrı ayrı türetilir.
 */
@Injectable()
export class AlanSifrelemeService {
  private readonly sifreAnahtari: Buffer;
  private readonly ozetAnahtari: Buffer;

  constructor(@Inject(AYARLAR) ayarlar: Ayarlar) {
    this.sifreAnahtari = Buffer.from(hkdfSync('sha256', ayarlar.alanAnahtari, Buffer.alloc(0), 'dc-alan-sifreleme', 32));
    this.ozetAnahtari = Buffer.from(hkdfSync('sha256', ayarlar.alanAnahtari, Buffer.alloc(0), 'dc-kor-indeks', 32));
  }

  sifrele(acik: string): string {
    const iv = randomBytes(12);
    const sifreleyici = createCipheriv('aes-256-gcm', this.sifreAnahtari, iv);
    const sifreli = Buffer.concat([sifreleyici.update(acik, 'utf8'), sifreleyici.final()]);
    return `${SURUM}:${Buffer.concat([iv, sifreleyici.getAuthTag(), sifreli]).toString('base64')}`;
  }

  coz(deger: string): string {
    const [surum, veri] = deger.split(':');
    if (surum !== SURUM || !veri) throw new Error('Desteklenmeyen şifreleme sürümü');
    const tampon = Buffer.from(veri, 'base64');
    const cozucu = createDecipheriv('aes-256-gcm', this.sifreAnahtari, tampon.subarray(0, 12));
    cozucu.setAuthTag(tampon.subarray(12, 28));
    return Buffer.concat([cozucu.update(tampon.subarray(28)), cozucu.final()]).toString('utf8');
  }

  ozet(acik: string): string {
    return createHmac('sha256', this.ozetAnahtari).update(acik, 'utf8').digest('hex');
  }
}
