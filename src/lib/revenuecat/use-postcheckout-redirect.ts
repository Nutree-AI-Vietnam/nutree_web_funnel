'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isPurchaseHandoffInFlight } from './purchase-handoff';

/** Leaves for post-checkout once the purchase handoff is no longer running. */
export function usePostcheckoutRedirect(ready: boolean) {
  const router = useRouter();
  useEffect(() => {
    if (!ready || isPurchaseHandoffInFlight()) return;
    router.replace('/postcheckout');
  }, [ready, router]);
}
