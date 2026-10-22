import { NextRequest, NextResponse } from 'next/server';
import { momoUpstream, NO_STORE } from '@/lib/payments/momo-bff';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const leadId = request.nextUrl.searchParams.get('lead_id');
  if (!leadId) return NextResponse.json({ detail: 'Lead required.' }, { status: 400 });
  const result = await momoUpstream(request, `/v1/web-funnel/momo/plans?lead_id=${encodeURIComponent(leadId)}`);
  if ('response' in result) return result.response;
  if (result.status !== 200) return NextResponse.json({ detail: 'MoMo prices are unavailable.' }, { status: result.status });
  const plans = (result.payload as { plans?: unknown } | null)?.plans;
  return NextResponse.json({ plans: Array.isArray(plans) ? plans : [] }, { headers: NO_STORE });
}
