import type { Metadata } from 'next';

export const emailLinkMetadata: Metadata = {
  title: 'Return to Nutree',
  robots: { index: false, follow: false },
};

export const emailLinkHeaders = {
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
};
