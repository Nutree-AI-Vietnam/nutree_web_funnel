import { hasOptionalConsent } from '@/lib/analytics/optional-consent';
import { registerDocumentFunnelLocale } from '@/lib/analytics/posthog';
import { startOptionalAnalytics } from '@/lib/analytics/optional-analytics';
import { isFragmentCapabilityRoute } from '@/lib/handoff/fragment-capability-route';

// Pages whose fragment carries a secret never start analytics.
// Optional trackers stay unloaded until this browser has accepted them.
if (!isFragmentCapabilityRoute(window.location.pathname)) {
  if (hasOptionalConsent()) startOptionalAnalytics();
  else document.documentElement.lang = registerDocumentFunnelLocale(window.location.pathname);
}
