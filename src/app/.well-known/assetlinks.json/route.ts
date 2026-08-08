import type { NextRequest } from 'next/server';

import {
  androidAssociationForHost,
  associationResponseHeaders,
  mobileEnvironmentForHost,
} from '@/lib/mobile-association';

export const dynamic = 'force-dynamic';

export function GET(request: NextRequest) {
  const host = request.headers.get('host');
  if (!mobileEnvironmentForHost(host)) return new Response('Not Found', { status: 404 });

  return Response.json(androidAssociationForHost(host), { headers: associationResponseHeaders });
}
