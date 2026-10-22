import { NextRequest, NextResponse } from 'next/server';
import { isSameOriginMutation } from '@/lib/handoff/lead-access-session';
import { momoUpstream, NO_STORE } from '@/lib/payments/momo-bff';
import { isMomoPayUrl, MOMO_UNAVAILABLE, momoCheckoutFailureDetail } from '@/lib/payments/momo-checkout';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request.headers, request.nextUrl.origin)) {
    return NextResponse.json({ detail: 'Cross-site mutation rejected.' }, { status: 403 });
  }
  const result = await momoUpstream(request, '/v1/web-funnel/momo/checkouts', {
    method: 'POST',
    body: await request.text(),
  });
  if ('response' in result) return result.response;
  const payload = result.payload as { pay_url?: unknown; order_id?: unknown; amount?: unknown } | null;
  if (result.status !== 201) {
    return NextResponse.json({ detail: momoCheckoutFailureDetail(payload) }, { status: result.status });
  }
  if (!isMomoPayUrl(payload?.pay_url) || typeof payload?.order_id !== 'string') {
    return NextResponse.json({ detail: MOMO_UNAVAILABLE }, { status: 502 });
  }
  return NextResponse.json(
    { pay_url: payload.pay_url, order_id: payload.order_id, amount: payload.amount ?? null },
    { status: 201, headers: NO_STORE },
  );
}
