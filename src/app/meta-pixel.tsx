import Script from 'next/script';
import type { FunnelLocale } from '@/lib/analytics/funnel-locale';
import { metaPixelIdForLocale } from '@/lib/analytics/meta-identity';
import { metaPixelBootstrapScript } from '@/lib/analytics/meta-pixel-snippet';

/**
 * The one Meta pixel for this page load. Rendered only from the root layout.
 * English uses the EN pixel when it is configured; otherwise the default pixel.
 * A page renders this once, so the other pixel is never initialized.
 */
export function MetaPixel({ locale }: { locale: FunnelLocale }) {
  const pixelId = metaPixelIdForLocale(locale);
  if (!pixelId) return null;
  const snippet = metaPixelBootstrapScript(pixelId);
  if (!snippet) return null;
  return (
    <>
      <Script id="meta-pixel" strategy="beforeInteractive">
        {snippet}
      </Script>
      <noscript>
        {/* Tracking pixel for browsers with JavaScript disabled. next/image cannot sit in noscript. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height={1}
          width={1}
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}
