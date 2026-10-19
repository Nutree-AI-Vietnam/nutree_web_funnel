'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { registerDocumentFunnelLocale } from '@/lib/analytics/posthog';

/** Attaches funnel_locale and funnel to later PostHog events, and keeps <html lang> with the chosen funnel. */
export function FunnelLocaleAnalytics() {
  const pathname = usePathname();
  useEffect(() => {
    document.documentElement.lang = registerDocumentFunnelLocale(pathname);
  }, [pathname]);
  return null;
}
