export const LEAD_ACCESS_COOKIE = 'nutree_lead_access';

export function leadAccessCookie(value: string) {
  return { name: LEAD_ACCESS_COOKIE, value, httpOnly: true, secure: true, sameSite: 'lax' as const, path: '/api/web-funnel', maxAge: 60 * 60 * 24 };
}

export function clearLeadAccessCookie() {
  return { ...leadAccessCookie(''), maxAge: 0 };
}

export function isSameOriginMutation(headers: Headers, origin: string): boolean {
  const requestOrigin = headers.get('origin');
  return !requestOrigin || requestOrigin === origin;
}
