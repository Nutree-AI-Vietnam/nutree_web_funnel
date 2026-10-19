import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { FUNNEL_PATH_HEADER } from '@/lib/analytics/funnel-locale';
import { proxy } from './proxy';

describe('proxy', () => {
  it('still rewrites PostHog capture to the US host', () => {
    const response = proxy(new NextRequest('https://quiz.test/nt-relay/e/?ip=1'));
    const rewrite = response.headers.get('x-middleware-rewrite');
    expect(rewrite).toContain('https://us.i.posthog.com/e/');
    expect(response.headers.get('x-middleware-request-host')).toBe('us.i.posthog.com');
  });

  it('records the survey path for the english pixel and leaves other routes on the default', () => {
    const english = proxy(new NextRequest('https://quiz.test/survey/en?utm_source=meta'));
    const home = proxy(new NextRequest('https://quiz.test/'));
    expect(english.headers.get('x-middleware-rewrite')).toBeNull();
    expect(english.headers.get(`x-middleware-request-${FUNNEL_PATH_HEADER}`)).toBe('/survey/en');
    expect(home.headers.get(`x-middleware-request-${FUNNEL_PATH_HEADER}`)).toBe('/');
    const spoofed = proxy(new NextRequest('https://quiz.test/survey/vi', {
      headers: { [FUNNEL_PATH_HEADER]: '/survey/en' },
    }));
    expect(spoofed.headers.get(`x-middleware-request-${FUNNEL_PATH_HEADER}`)).toBe('/survey/vi');
  });
});
