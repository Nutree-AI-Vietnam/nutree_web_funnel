import { describe, it, expect, beforeEach, afterEach, vi as vitest } from 'vitest';
import { buildDownloadLink } from './links';

beforeEach(() => {
  vitest.stubEnv('NEXT_PUBLIC_AIRBRIDGE_TRACKING_LINK', 'https://abr.ge/abc123');
});

afterEach(() => vitest.unstubAllEnvs());

describe('buildDownloadLink', () => {
  it('appends claim token as deep-link param on the Airbridge tracking link', () => {
    const url = new URL(buildDownloadLink('ct_42'));
    expect(url.origin + url.pathname).toBe('https://abr.ge/abc123');
    expect(url.searchParams.get('deeplink_url')).toBe('nutree://claim?token=ct_42');
  });

  it('preserves existing query params on the tracking link', () => {
    vitest.stubEnv(
      'NEXT_PUBLIC_AIRBRIDGE_TRACKING_LINK',
      'https://abr.ge/abc123?campaign=web_funnel',
    );
    const url = new URL(buildDownloadLink('ct_42'));
    expect(url.searchParams.get('campaign')).toBe('web_funnel');
    expect(url.searchParams.get('deeplink_url')).toBe('nutree://claim?token=ct_42');
  });

  it('falls back to a safe same-origin link when tracking env is absent', () => {
    vitest.unstubAllEnvs();
    const url = new URL(buildDownloadLink('ct_42'));
    expect(url.origin + url.pathname).toBe('https://quiz.nutreeai.com/');
    expect(url.searchParams.get('deeplink_url')).toBe('nutree://claim?token=ct_42');
  });

  it('does not add a claim deeplink before a verified claim token exists', () => {
    const url = new URL(buildDownloadLink(''));
    expect(url.searchParams.has('deeplink_url')).toBe(false);
  });
});
