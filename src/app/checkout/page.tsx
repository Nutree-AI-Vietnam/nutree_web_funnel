'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useHydrated, useQuizStore } from '@/lib/quiz/store';

/**
 * Legacy browser checkout URLs must not infer entitlement from a client-side
 * provider callback. Paddle owns checkout from the paywall and fulfillment is
 * finalized by trusted server-side systems.
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
