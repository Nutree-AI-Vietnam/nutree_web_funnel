import { describe, expect, it } from 'vitest';
import { LEAD_ACCESS_COOKIE, clearLeadAccessCookie, isSameOriginMutation, leadAccessCookie } from './lead-access-session';

describe('lead access session', () => {
  it('creates an HttpOnly, secure, same-site cookie scoped to the BFF', () => {
    const cookie = leadAccessCookie('draft-key');
    expect(cookie).toMatchObject({ name: LEAD_ACCESS_COOKIE, value: 'draft-key', httpOnly: true, secure: true, sameSite: 'lax', path: '/api/web-funnel' });
  });

  it('clears the capability at the same BFF scope', () => {
    expect(clearLeadAccessCookie()).toMatchObject({ name: LEAD_ACCESS_COOKIE, value: '', maxAge: 0, path: '/api/web-funnel' });
  });

  it('only accepts same-origin browser mutations', () => {
    expect(isSameOriginMutation(new Headers({ origin: 'https://start.nutree.ai' }), 'https://start.nutree.ai')).toBe(true);
    expect(isSameOriginMutation(new Headers({ origin: 'https://evil.example' }), 'https://start.nutree.ai')).toBe(false);
  });
});
