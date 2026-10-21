import Script from 'next/script';
import { metaPixelBootstrapScript } from '@/lib/analytics/meta-pixel-snippet';

/**
 * The one Meta pixel for this document. The layout passes the id already chosen
 * for the route, so a page never initializes a second pixel. The snippet checks
 * the host itself. There is no no-script image: it could not check the host,
 * and the quiz needs JavaScript.
 */
export function MetaPixel({ pixelId }: { pixelId: string }) {
  if (!/^\d+$/.test(pixelId)) return null;
  const snippet = metaPixelBootstrapScript(pixelId);
  if (!snippet) return null;
  return (
    <Script id="meta-pixel" strategy="beforeInteractive">
      {snippet}
    </Script>
  );
}
