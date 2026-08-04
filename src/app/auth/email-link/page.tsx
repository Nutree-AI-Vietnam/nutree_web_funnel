import type { Metadata } from 'next';

import { EmailLinkFallback } from './email-link-fallback';
import { emailLinkMetadata } from './security';

export const metadata: Metadata = emailLinkMetadata;

export default function EmailLinkFallbackPage() {
  return <EmailLinkFallback />;
}
