import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { config, proxy } from './proxy';

describe('proxy', () => {
  it('only matches the PostHog relay', () => {
    expect(config.matcher).toBe('/nt-relay/:path*');
  });

  it('still rewrites PostHog capture to the US host', () => {
    const response = proxy(new NextRequest('https://quiz.test/nt-relay/e/?ip=1'));
    const rewrite = response.headers.get('x-middleware-rewrite');
    expect(rewrite).toContain('https://us.i.posthog.com/e/');
    expect(response.headers.get('x-middleware-request-host')).toBe('us.i.posthog.com');
  });

  it('does not rewrite pages or record a path header', () => {
    const response = proxy(new NextRequest('https://quiz.test/survey/en?utm_source=meta', {
      headers: { 'x-nutree-pathname': '/survey/vi' },
    }));
    expect(response.headers.get('x-middleware-rewrite')).toBeNull();
    expect(response.headers.get('x-middleware-request-x-nutree-pathname')).toBeNull();
  });
});
