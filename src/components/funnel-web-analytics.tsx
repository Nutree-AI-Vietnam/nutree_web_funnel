'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { captureWebPage } from '@/lib/analytics/posthog';
import { surveyAnalyticsPath } from '@/lib/analytics/web-analytics-path';
import { useHydrated, useQuizStore } from '@/lib/quiz/store';

/**
 * The quiz stays on /survey/:locale. Web analytics only splits paths, views,
 * bounce rate, and time on page when each screen is recorded as a page.
 */
export function FunnelWebAnalytics() {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const screen = useQuizStore((state) => state.funnelScreen);
  const step = useQuizStore((state) => state.currentStep);
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
    const path = surveyAnalyticsPath(pathname, screen, step);
    if (!path) {
      if (lastPath.current) captureWebPage(lastPath.current, 'leave');
      lastPath.current = null;
      return;
    }
    if (path === lastPath.current) return;
    if (lastPath.current) captureWebPage(lastPath.current, 'leave');
    if (!(lastPath.current === null && path === normalized)) captureWebPage(path, 'view');
    lastPath.current = path;
  }, [hydrated, pathname, screen, step]);

  return null;
}
