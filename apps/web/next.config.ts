import type { NextConfig } from 'next';

const API_URL = process.env.API_URL ?? 'http://localhost:3000';

const nextConfig: NextConfig = {
  // Tarayıcı API'ye aynı adres üzerinden erişir: oturum çerezi SameSite=Strict kalabilir, CORS gerekmez.
  async rewrites() {
    return [{ source: '/api/v1/:yol*', destination: `${API_URL}/api/v1/:yol*` }];
  },
  poweredByHeader: false,
  // Tarayıcı güvenlik başlıkları: çerçeveleme (clickjacking), MIME tahmini ve dış kaynak yüklemeye karşı.
  async headers() {
    const gelistirme = process.env.NODE_ENV !== 'production';
    const csp = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${gelistirme ? " 'unsafe-eval'" : ''}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      `connect-src 'self'${gelistirme ? ' ws:' : ''}`,
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join('; ');
    const basliklar = [
      { key: 'Content-Security-Policy', value: csp },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
    ];
    if (!gelistirme) {
      basliklar.push({ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' });
    }
    return [{ source: '/:yol*', headers: basliklar }];
  },
};

export default nextConfig;
