import type { NextRequest } from 'next/server';

import {
  appleAssociationForHost,
  associationResponseHeaders,
} from '@/lib/mobile-association';

export const dynamic = 'force-dynamic';

export function GET(request: NextRequest) {
  const association = appleAssociationForHost(request.headers.get('host'));
  if (!association) return new Response('Not Found', { status: 404 });

  return Response.json(association, { headers: associationResponseHeaders });
}
