import { NextRequest, NextResponse } from 'next/server';
import { momoUpstream, NO_STORE } from '@/lib/payments/momo-bff';
import { MOMO_ORDER_ID } from '@/lib/payments/momo-checkout';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, context: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await context.params;
  if (!MOMO_ORDER_ID.test(orderId)) return NextResponse.json({ detail: 'Not found.' }, { status: 404 });
  const result = await momoUpstream(request, `/v1/web-funnel/momo/orders/${orderId}/status`);
  if ('response' in result) return result.response;
  if (result.status !== 200) {
    return NextResponse.json({ detail: 'Could not load MoMo order status.' }, { status: result.status });
  }
  const payload = result.payload as { status?: unknown; plan?: unknown; amount?: unknown } | null;
  // Plan and amount let the return page report the purchase to ad platforms.
  return NextResponse.json({
    order_id: orderId,
    status: payload?.status ?? 'pending',
    plan: typeof payload?.plan === 'string' ? payload.plan : null,
    amount: typeof payload?.amount === 'number' ? payload.amount : null,
  }, { headers: NO_STORE });
}
