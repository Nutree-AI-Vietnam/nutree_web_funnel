import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import type { useQuizStore as useQuizStoreType, isUserPurchased as isUserPurchasedType } from './store';
import { savePendingRedemptionCorrelation, clearPendingRedemptionCorrelation } from '@/lib/revenuecat/redemption-handoff';

const sessionMem = new Map<string, string>();
const storage = {
  getItem: (k: string) => sessionMem.get(k) ?? null,
  setItem: (k: string, v: string) => void sessionMem.set(k, v),
  removeItem: (k: string) => void sessionMem.delete(k),
  clear: () => sessionMem.clear(),
  key: (i: number) => [...sessionMem.keys()][i] ?? null,
  get length() {
    return sessionMem.size;
  },
} satisfies Storage;

Object.defineProperty(globalThis, 'sessionStorage', {
  configurable: true,
  value: storage,
});

Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: { sessionStorage: storage },
});

let useQuizStore: typeof useQuizStoreType;
let isUserPurchased: typeof isUserPurchasedType;

describe('purchase visibility rules', () => {
  beforeAll(async () => {
    const store = await import('./store');
    useQuizStore = store.useQuizStore;
    isUserPurchased = store.isUserPurchased;
  });

  beforeEach(() => {
    useQuizStore.getState().reset();
    sessionMem.clear();
  });

  it('returns false when user has not completed a purchase', () => {
    expect(isUserPurchased()).toBe(false);

    useQuizStore.getState().setLead({
      lead_id: 'lead-test-1',
      masked_email: 'u***@nutree.dev',
      status: 'payment_pending',
    });
    expect(isUserPurchased()).toBe(false);
  });

  it('returns true when in-memory purchased flag is set', () => {
    useQuizStore.getState().setPurchased(true);
    expect(isUserPurchased()).toBe(true);
  });

  it('returns true when lead status is payment_verified', () => {
    useQuizStore.getState().setLead({
      lead_id: 'lead-test-1',
      masked_email: 'u***@nutree.dev',
      status: 'payment_verified',
    });
    expect(isUserPurchased()).toBe(true);
  });

  it('returns true when lead status is claimed or other post-pay status', () => {
    useQuizStore.getState().setLead({
      lead_id: 'lead-test-1',
      masked_email: 'u***@nutree.dev',
      status: 'claimed',
    });
    expect(isUserPurchased()).toBe(true);
  });

  it('returns true when pending redemption correlation exists for active lead', () => {
    useQuizStore.getState().setLead({
      lead_id: 'lead-test-pending',
      masked_email: 'p***@nutree.dev',
      status: 'payment_pending',
    });

    savePendingRedemptionCorrelation({
      leadId: 'lead-test-pending',
      appUserId: '$RCAnonymousID:customer-1',
      redemptionLinkHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    });

    expect(isUserPurchased()).toBe(true);

    clearPendingRedemptionCorrelation('lead-test-pending');
    expect(isUserPurchased()).toBe(false);
  });

  it('ignores pending redemption correlation if it belongs to a different lead', () => {
    useQuizStore.getState().setLead({
      lead_id: 'lead-current',
      masked_email: 'c***@nutree.dev',
      status: 'payment_pending',
    });

    savePendingRedemptionCorrelation({
      leadId: 'lead-different',
      appUserId: '$RCAnonymousID:customer-diff',
      redemptionLinkHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    });

    expect(isUserPurchased()).toBe(false);
  });

  it('evaluates explicit arguments without relying on global store', () => {
    expect(isUserPurchased({ purchased: true })).toBe(true);
    expect(isUserPurchased({ lead: { status: 'payment_verified' } })).toBe(true);
    expect(isUserPurchased({ purchased: false, lead: { status: 'payment_pending' } })).toBe(false);
  });

  it('reverts to unpurchased on store reset', () => {
    useQuizStore.getState().setPurchased(true);
    expect(isUserPurchased()).toBe(true);
    useQuizStore.getState().reset();
    expect(isUserPurchased()).toBe(false);
  });
});
