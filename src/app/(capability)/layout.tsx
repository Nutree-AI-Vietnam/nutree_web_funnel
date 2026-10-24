import { RootDocument } from '../root-document';
import '../globals.css';

export const metadata = { robots: { index: false, follow: false } };

/**
 * Document for pages whose URL fragment carries a secret (/plan, /unsubscribe).
 * No ad pixel loads here, and PostHog skips these paths, so the fragment cannot
 * reach a third party before the page clears it.
 */
export default function CapabilityLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <RootDocument locale="en" pixelId="">
      {children}
    </RootDocument>
  );
}
