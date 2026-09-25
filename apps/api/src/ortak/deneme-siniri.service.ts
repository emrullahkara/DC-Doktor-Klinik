import { HttpStatus, Injectable } from '@nestjs/common';
import { ApiHatasi } from './dogrulama';

interface Sayac {
  adet: number;
  bitis: number;
}

/**
 * Kaba kuvvet (brute force) sınırı: bir anahtar (IP veya e-posta) için pencere içindeki deneme
 * sayısı sınırı aşarsa pencere bitene kadar 429 döner. Süreç içi bellekte tutulur; birden çok API
 * örneği çalıştırılırsa paylaşılan bir depoya (ör. Redis) taşınmalıdır.
 */
@Injectable()
export class DenemeSiniriService {
  private readonly sayaclar = new Map<string, Sayac>();

  /** Sınır aşıldıysa 429 fırlatır (sayacı artırmaz). */
  kontrol(anahtar: string, sinir: number): void {
    const s = this.oku(anahtar);
    if (s && s.adet >= sinir) {
      const saniye = Math.ceil((s.bitis - Date.now()) / 1000);
      throw new ApiHatasi(HttpStatus.TOO_MANY_REQUESTS, 'COK_FAZLA_DENEME', 'Çok fazla deneme yapıldı. Lütfen biraz sonra tekrar deneyin.', { bekleSaniye: saniye });
    }
  }

  artir(anahtar: string, pencereMs: number): void {
    const s = this.oku(anahtar);
    if (s) s.adet += 1;
    else this.sayaclar.set(anahtar, { adet: 1, bitis: Date.now() + pencereMs });
    if (this.sayaclar.size > 50_000) this.temizle();
  }

  sifirla(anahtar: string): void {
    this.sayaclar.delete(anahtar);
  }

  private oku(anahtar: string): Sayac | undefined {
    const s = this.sayaclar.get(anahtar);
    if (s && s.bitis <= Date.now()) {
      this.sayaclar.delete(anahtar);
      return undefined;
    }
    return s;
  }

  private temizle(): void {
    const simdi = Date.now();
    for (const [k, s] of this.sayaclar) if (s.bitis <= simdi) this.sayaclar.delete(k);
  }
}
