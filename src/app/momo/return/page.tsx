'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Retained only so old bookmarks return to the supported RevenueCat paywall. */
export default function MomoReturnPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/paywall');
  }, [router]);

  return null;
}
