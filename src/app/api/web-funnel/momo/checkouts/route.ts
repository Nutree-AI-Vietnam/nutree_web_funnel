import { NextRequest, NextResponse } from 'next/server';
import { isSameOriginMutation } from '@/lib/handoff/lead-access-session';
import { momoUpstream, NO_STORE } from '@/lib/payments/momo-bff';
import { cardPlanPrice } from '@/lib/payments/momo-card-price';
import { isMomoAmount, isMomoEnabled, isMomoPayUrl, MOMO_PACKAGE_ID, MOMO_UNAVAILABLE, momoCheckoutFailureDetail } from '@/lib/payments/momo-checkout';

export const dynamic = 'force-dynamic';

/**
 * A MoMo pass for the card plan the buyer picked. The browser names only the RevenueCat package; the price is read
 * here, on the server, from that package's Paddle price, so MoMo charges the card's number and no browser sets it.
 */
export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request.headers, request.nextUrl.origin)) {
    return NextResponse.json({ detail: 'Cross-site mutation rejected.' }, { status: 403 });
  }
  if (!isMomoEnabled()) return NextResponse.json({ detail: MOMO_UNAVAILABLE }, { status: 404 });
  const body = (await request.json().catch(() => null)) as { package_id?: unknown; method?: unknown; lang?: unknown; lead_id?: unknown } | null;
  const packageId = typeof body?.package_id === 'string' && MOMO_PACKAGE_ID.test(body.package_id) ? body.package_id : null;
  const method = body?.method === 'atm' ? 'atm' : body?.method === 'wallet' ? 'wallet' : null;
  const lang = body?.lang === 'en' ? 'en' : 'vi';
  const leadId = typeof body?.lead_id === 'string' && body.lead_id ? body.lead_id : null;
  if (!packageId || !method || !leadId) return NextResponse.json({ detail: MOMO_UNAVAILABLE }, { status: 400 });

  let price: Awaited<ReturnType<typeof cardPlanPrice>>;
  try {
    price = await cardPlanPrice(packageId);
  } catch (error) {
    console.warn('MoMo checkout could not read the card plan price.', error);
    return NextResponse.json({ detail: MOMO_UNAVAILABLE }, { status: 502 });
  }
  if (!price) return NextResponse.json({ detail: MOMO_UNAVAILABLE }, { status: 400 });

  const result = await momoUpstream(request, '/v1/web-funnel/momo/checkouts', {
    method: 'POST',
    body: JSON.stringify({ package_id: price.packageId, weeks: price.weeks, amount: price.amount, method, lang, lead_id: leadId }),
  });
  if ('response' in result) return result.response;
  const payload = result.payload as { pay_url?: unknown; order_id?: unknown; amount?: unknown } | null;
  if (result.status !== 201) {
    return NextResponse.json({ detail: momoCheckoutFailureDetail(payload) }, { status: result.status });
  }
  // The paywall compares the charged amount with the price it showed before sending the buyer to MoMo.
  if (!isMomoPayUrl(payload?.pay_url) || typeof payload?.order_id !== 'string' || !isMomoAmount(payload?.amount)) {
    return NextResponse.json({ detail: MOMO_UNAVAILABLE }, { status: 502 });
  }
  return NextResponse.json(
    { pay_url: payload.pay_url, order_id: payload.order_id, amount: payload.amount },
    { status: 201, headers: NO_STORE },
  );
}
