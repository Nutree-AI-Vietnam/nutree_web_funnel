'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useHydrated, useQuizStore } from '@/lib/quiz/store';

/**
 * Legacy browser checkout URLs must not infer entitlement from a client-side
 * provider callback. RevenueCat owns checkout and the mobile app confirms the
 * Redemption Link before it grants access.
 */
export default function CheckoutPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const hasLead = useQuizStore((state) => state.lead !== null);

  useEffect(() => {
    if (hydrated) router.replace(hasLead ? '/paywall' : '/email');
  }, [hasLead, hydrated, router]);

  return null;
}
