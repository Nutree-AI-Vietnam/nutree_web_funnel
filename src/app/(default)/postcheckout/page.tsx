import type { Metadata } from 'next';
import { PostcheckoutPageClient } from './postcheckout-page-client';

export const metadata: Metadata = {
  title: 'Your Nutree plan is ready',
  description: 'Finish setting up your Nutree plan in the mobile app.',
  robots: { index: false, follow: false },
};

export default function PostcheckoutPage() {
  return <PostcheckoutPageClient />;
}
