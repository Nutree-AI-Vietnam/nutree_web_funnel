import type { Lead, LeadStatus } from '@/lib/quiz/types';

const statusMap: Record<string, LeadStatus> = {
  draft: 'payment_pending',
  checkout_started: 'payment_pending',
  payment_verified: 'payment_verified',
  email_queued: 'claim_email_sent',
  claim_reserved: 'claim_email_sent',
  claimed: 'claimed',
  refunded: 'claim_revoked',
};

export function safeLeadProjection(value: unknown): Lead | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const status = typeof record.status === 'string' ? statusMap[record.status] : undefined;
  if (typeof record.lead_id !== 'string' || typeof record.masked_email !== 'string' || !status) return null;
  return { lead_id: record.lead_id, masked_email: record.masked_email, status };
}
