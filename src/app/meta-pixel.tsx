import Script from 'next/script';
import { isProductionDeployment } from '@/lib/analytics/ad-pixel-host';
import { metaPixelBootstrapScript } from '@/lib/analytics/meta-pixel-snippet';

/**
 * The one Meta pixel for this document. The layout passes the id already chosen
 * for the route, so a page never initializes a second pixel. The snippet checks
 * the host itself; the no-script image cannot, so it ships only in production.
 */
export function MetaPixel({ pixelId }: { pixelId: string }) {
  if (!/^\d+$/.test(pixelId)) return null;
  const snippet = metaPixelBootstrapScript(pixelId);
  if (!snippet) return null;
  return (
    <>
      <Script id="meta-pixel" strategy="beforeInteractive">
        {snippet}
      </Script>
      {isProductionDeployment() && (
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
      )}
    </>
  );
}
