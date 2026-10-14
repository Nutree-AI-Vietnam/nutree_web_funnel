import posthog from 'posthog-js';

/** Records a screen as its own page so the web analytics paths table can list it. */
export function captureWebPage(path: string, kind: 'view' | 'leave'): void {
  if (typeof window === 'undefined' || !path) return;
  try {
    posthog.capture(kind === 'view' ? '$pageview' : '$pageleave', {
      $current_url: `${window.location.origin}${path}`,
      $pathname: path,
    });
  } catch {
    // Analytics must never block the quiz.
  }
}

/** Mirror a funnel event into PostHog so the quiz and checkout show up on the session. */
export function captureFunnelEvent(name: string, properties: Record<string, unknown> = {}): void {
  try {
    posthog.capture(name, properties);
  } catch {
    // Analytics must never block checkout.
  }
}

/** Attach the anonymous replay to the lead once checkout identity exists. */
export function identifyFunnelLead(leadId: string, email?: string | null) {
  if (!leadId) return;
  posthog.identify(leadId, {
    source: 'web_funnel',
    ...(email ? { email } : {}),
  });
}
