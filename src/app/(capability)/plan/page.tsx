import type { Metadata } from 'next';
import { PlanLinkPageClient } from './plan-link-page-client';

export const metadata: Metadata = { title: 'Your Nutree plan', robots: { index: false, follow: false } };

export default function PlanLinkPage() {
  return <PlanLinkPageClient />;
}
