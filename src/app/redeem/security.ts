import type { Metadata } from 'next';

export const redeemMetadata: Metadata = {
  title: 'Redeem on Nutree',
  robots: { index: false, follow: false },
};

export const redeemHeaders = {
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
};
