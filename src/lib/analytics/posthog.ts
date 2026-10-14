import posthog from 'posthog-js';

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
