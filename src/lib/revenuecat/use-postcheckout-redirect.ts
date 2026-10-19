'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isPostcheckoutRedirectHeld, isPurchaseHandoffInFlight } from './purchase-handoff';

/** Leaves for post-checkout once the purchase handoff is no longer running. */
export function usePostcheckoutRedirect(ready: boolean) {
  const router = useRouter();
  useEffect(() => {
    if (!ready || isPurchaseHandoffInFlight() || isPostcheckoutRedirectHeld()) return;
    router.replace('/postcheckout');
  }, [ready, router]);
}
