'use client';

import Link from 'next/link';
import { localPreviewData, localPreviewLead, localPreviewTdee, useLocalPreviewHost } from '@/lib/local-preview';
import { useQuizStore } from '@/lib/quiz/store';

const routes = [
  ['Home', '/'],
  ['Email', '/email'],
  ['Gift', '/welcome-gift'],
  ['Paywall', '/paywall'],
  ['Checkout', '/paywall?localCheckout=1'],
] as const;

export function LocalPreviewTools() {
  const setData = useQuizStore((s) => s.setData);
  const setLead = useQuizStore((s) => s.setLead);
  const setTdee = useQuizStore((s) => s.setTdee);
  const enabled = useLocalPreviewHost();

  if (!enabled) return null;

  const seedPreview = () => {
    setData(localPreviewData);
    setLead(localPreviewLead);
    setTdee(localPreviewTdee, 'fallback');
  };

  return (
    <div className="fixed bottom-3 left-1/2 z-[80] w-[calc(100%-1.5rem)] max-w-lg -translate-x-1/2 rounded-2xl border border-white/65 bg-white/80 p-2 shadow-[0_18px_44px_rgb(16_39_32_/_0.16)] backdrop-blur-xl">
      <div className="flex items-center gap-1 overflow-x-auto">
        <button type="button" onClick={seedPreview} className="min-h-9 shrink-0 rounded-xl bg-forest px-3 text-xs font-extrabold text-white">
          Seed
        </button>
        {routes.map(([label, href]) => (
          <Link key={href} href={href} className="grid min-h-9 shrink-0 place-items-center rounded-xl border border-border-brand bg-white/75 px-3 text-xs font-extrabold text-forest">
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
