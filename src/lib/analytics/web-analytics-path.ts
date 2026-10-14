import type { FunnelScreen } from '@/lib/quiz/store';
import type { QuizStep } from '@/lib/quiz/steps';

/** Page path the web analytics dashboard should list for the current funnel screen. */
export function surveyAnalyticsPath(pathname: string, screen: FunnelScreen, step: QuizStep): string | null {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  const match = normalized.match(/^\/survey\/([^/]+)$/);
  if (!match) return null;
  const locale = match[1];
  if (screen === 'landing') return `/survey/${locale}`;
  if (screen === 'quiz') return `/survey/${locale}/${step}`;
  return `/survey/${locale}/${screen}`;
}
