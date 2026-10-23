import posthog from 'posthog-js';
import { registerDocumentFunnelLocale } from '@/lib/analytics/posthog';
import { POSTHOG_PROXY_PATH } from '@/lib/analytics/posthog-proxy';

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;

if (projectToken) {
  posthog.init(projectToken, {
    api_host: POSTHOG_PROXY_PATH,
    ui_host: 'https://us.posthog.com',
    defaults: '2026-05-30',
    persistence: 'localStorage',
    person_profiles: 'identified_only',
    capture_pageview: 'history_change',
    capture_pageleave: true,
    autocapture: true,
    // Unhandled errors and rejections. `true` uses this SDK's exception autocapture defaults.
    capture_exceptions: true,
    capture_performance: true,
    disable_surveys: true,
    advanced_disable_feature_flags: true,
    session_recording: {
      maskAllInputs: true,
      recordBody: false,
      recordHeaders: false,
    },
    debug: process.env.NODE_ENV === 'development',
  });
  posthog.register({ source: 'web_funnel' });
  document.documentElement.lang = registerDocumentFunnelLocale(window.location.pathname);
}
