import posthog from 'posthog-js';
import { registerDocumentFunnelLocale } from '@/lib/analytics/posthog';
import { POSTHOG_PROXY_PATH } from '@/lib/analytics/posthog-proxy';
import { isFragmentCapabilityRoute } from '@/lib/handoff/fragment-capability-route';

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;

// Pages whose fragment carries a secret never start analytics.
if (projectToken && !isFragmentCapabilityRoute(window.location.pathname)) {
  posthog.init(projectToken, {
    api_host: POSTHOG_PROXY_PATH,
    ui_host: 'https://us.posthog.com',
    defaults: '2026-05-30',
    persistence: 'localStorage',
    person_profiles: 'identified_only',
    capture_pageview: 'history_change',
    capture_pageleave: true,
    // Plan and claim links carry their secret in the fragment; keep it out of every event.
    disable_capture_url_hashes: true,
    autocapture: true,
    capture_performance: true,
    disable_surveys: true,
    advanced_disable_feature_flags: true,
    // The recorder is a large script; loading it with the first screen kept taps waiting on slow phones.
    disable_session_recording: true,
    session_recording: {
      maskAllInputs: true,
      recordBody: false,
      recordHeaders: false,
    },
    debug: process.env.NODE_ENV === 'development',
  });
  posthog.register({ source: 'web_funnel' });
  document.documentElement.lang = registerDocumentFunnelLocale(window.location.pathname);

  // Start the replay once the first screen has answered a tap.
  const startRecording = () => {
    window.removeEventListener('pointerdown', startRecording, true);
    window.removeEventListener('keydown', startRecording, true);
    window.setTimeout(() => posthog.startSessionRecording(), 0);
  };
  window.addEventListener('pointerdown', startRecording, true);
  window.addEventListener('keydown', startRecording, true);
}
