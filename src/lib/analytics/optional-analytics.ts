import posthog from 'posthog-js';
import { hasOptionalConsent } from '@/lib/analytics/optional-consent';
import { registerDocumentFunnelLocale } from '@/lib/analytics/posthog';
import { POSTHOG_PROXY_PATH } from '@/lib/analytics/posthog-proxy';
import { isFragmentCapabilityRoute } from '@/lib/handoff/fragment-capability-route';

let started = false;

/** Loads PostHog once, only after optional cookies were accepted. */
export function startOptionalAnalytics(): void {
  if (started || typeof window === 'undefined') return;
  if (!hasOptionalConsent()) return;
  if (isFragmentCapabilityRoute(window.location.pathname)) return;
  const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  if (!projectToken) {
    started = true;
    return;
  }
  started = true;
  posthog.init(projectToken, {
    api_host: POSTHOG_PROXY_PATH,
    ui_host: 'https://us.posthog.com',
    defaults: '2026-05-30',
    persistence: 'localStorage',
    person_profiles: 'identified_only',
    capture_pageview: 'history_change',
    capture_pageleave: true,
    disable_capture_url_hashes: true,
    autocapture: true,
    capture_performance: true,
    disable_surveys: true,
    advanced_disable_feature_flags: true,
    disable_session_recording: true,
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: '[data-quiz-answer], .ph-mask',
      recordBody: false,
      recordHeaders: false,
    },
    debug: process.env.NODE_ENV === 'development',
  });
  posthog.register({ source: 'web_funnel' });
  document.documentElement.lang = registerDocumentFunnelLocale(window.location.pathname);
  const startRecording = () => {
    window.removeEventListener('pointerdown', startRecording, true);
    window.removeEventListener('keydown', startRecording, true);
    window.setTimeout(() => posthog.startSessionRecording(), 0);
  };
  window.addEventListener('pointerdown', startRecording, true);
  window.addEventListener('keydown', startRecording, true);
}

export function optionalAnalyticsStarted(): boolean {
  return started;
}

/** Stops a tracker that was already loaded. Does not create one. */
export function stopOptionalAnalytics(): void {
  if (!started) return;
  try {
    posthog.opt_out_capturing();
    posthog.stopSessionRecording();
  } catch {
    // Unloading must not block withdrawal.
  }
}
