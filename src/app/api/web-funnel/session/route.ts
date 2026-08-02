import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { isSameOriginMutation, LEAD_ACCESS_COOKIE, leadAccessCookie } from '@/lib/handoff/lead-access-session';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request.headers, request.nextUrl.origin)) return NextResponse.json({ detail: 'Cross-site mutation rejected.' }, { status: 403 });
  const response = NextResponse.json({ ready: true }, { headers: { 'Cache-Control': 'no-store' } });
  if (!request.cookies.get(LEAD_ACCESS_COOKIE)?.value) response.cookies.set(leadAccessCookie(randomBytes(32).toString('base64url')));
  return response;
}
