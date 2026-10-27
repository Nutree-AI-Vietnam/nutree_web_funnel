import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { config, proxy } from './proxy';

describe('proxy', () => {
  it('only matches the homepage and the PostHog relay', () => {
    expect(config.matcher).toEqual(['/', '/nt-relay/:path*']);
  });

  it('keeps Vietnam on the Vietnamese homepage, whatever the browser language', () => {
    const response = proxy(new NextRequest('https://quiz.test/?utm_source=meta', {
      headers: { 'x-vercel-ip-country': 'VN', 'accept-language': 'en-US,en;q=0.9' },
    }));
    expect(response.headers.get('location')).toBeNull();
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });

  it('sends an English browser outside Vietnam to the English quiz with its query string', () => {
    const response = proxy(new NextRequest('https://quiz.test/?utm_source=meta&utm_campaign=us', {
      headers: { 'x-vercel-ip-country': 'US', 'accept-language': 'en-US,en;q=0.9' },
    }));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://quiz.test/survey/en?utm_source=meta&utm_campaign=us');
  });

  it('keeps a Vietnamese browser abroad, or with no country, on the Vietnamese homepage', () => {
    const abroad = proxy(new NextRequest('https://quiz.test/', {
      headers: { 'x-vercel-ip-country': 'US', 'accept-language': 'en-US,en;q=0.9,vi;q=0.8' },
    }));
    expect(abroad.headers.get('location')).toBeNull();
    const unknown = proxy(new NextRequest('https://quiz.test/', { headers: { 'accept-language': 'vi-VN,vi;q=0.9' } }));
    expect(unknown.headers.get('location')).toBeNull();
  });

  it('sends an English browser with no country to the English quiz', () => {
    const response = proxy(new NextRequest('https://quiz.test/', { headers: { 'accept-language': 'en-GB,en;q=0.9' } }));
    expect(response.headers.get('location')).toBe('https://quiz.test/survey/en');
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
