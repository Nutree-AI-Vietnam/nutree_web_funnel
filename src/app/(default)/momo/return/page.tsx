'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Retained only so old payment-return bookmarks return to the supported survey. */
export default function MomoReturnPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/survey/vi');
  }, [router]);

  return null;
}
