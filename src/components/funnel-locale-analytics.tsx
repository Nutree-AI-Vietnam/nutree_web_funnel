'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { analyticsLocale } from '@/lib/analytics/funnel-locale';
import { registerFunnelSuperProperties } from '@/lib/analytics/posthog';

/** Attaches funnel_locale and funnel to later PostHog events, and keeps <html lang> with the survey. */
export function FunnelLocaleAnalytics() {
  const pathname = usePathname();
  useEffect(() => {
    const locale = analyticsLocale(pathname);
    document.documentElement.lang = locale;
    registerFunnelSuperProperties(locale);
  }, [pathname]);
  return null;
}
