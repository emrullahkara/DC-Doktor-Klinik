import type { NextConfig } from 'next';

const API_URL = process.env.API_URL ?? 'http://localhost:3000';

const nextConfig: NextConfig = {
  // Tarayıcı API'ye aynı adres üzerinden erişir: oturum çerezi SameSite=Strict kalabilir, CORS gerekmez.
  async rewrites() {
    return [{ source: '/api/v1/:yol*', destination: `${API_URL}/api/v1/:yol*` }];
  },
  poweredByHeader: false,
};

export default nextConfig;
