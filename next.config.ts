import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    const headers = [
      { key: 'Cache-Control', value: 'no-store' },
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'" },
    ];
    return [
      { source: '/open-nutree', headers },
      { source: '/redeem', headers },
    ];
  },
};

export default nextConfig;
