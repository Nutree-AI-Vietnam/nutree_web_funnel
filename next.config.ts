import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PostHog capture endpoints use a trailing slash. Redirecting those breaks ingestion.
  skipTrailingSlashRedirect: true,
  experimental: {
    // Unmatched URLs skip every root layout, so the 404 has to be its own document.
    globalNotFound: true,
  },
  async headers() {
    const headers = [
      { key: 'Cache-Control', value: 'no-store' },
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'" },
    ];
    return [
      { source: '/open-nutree', headers },
      { source: '/redeem', headers },
      { source: '/auth/email-link', headers },
      // These pages run client code to redeem the fragment, so they keep the default script policy.
      { source: '/plan', headers: headers.slice(0, 2) },
      { source: '/unsubscribe', headers: headers.slice(0, 2) },
    ];
  },
};

export default nextConfig;
