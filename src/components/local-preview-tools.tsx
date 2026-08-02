'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getLocalPreviewCountry, localPreviewData, localPreviewLead, localPreviewTdee, setLocalPreviewCountry, useLocalPreviewHost } from '@/lib/local-preview';
import { useQuizStore } from '@/lib/quiz/store';

const routes = [
  ['H', 'Home', '/'],
  ['E', 'Email', '/email'],
  ['G', 'Gift', '/welcome-gift'],
  ['P', 'Paywall', '/paywall'],
  ['C', 'Checkout', '/paywall?localCheckout=1'],
] as const;

export function LocalPreviewTools() {
  const pathname = usePathname();
  const setData = useQuizStore((s) => s.setData);
  const setLead = useQuizStore((s) => s.setLead);
  const setLocale = useQuizStore((s) => s.setLocale);
  const setTdee = useQuizStore((s) => s.setTdee);
  const enabled = useLocalPreviewHost();

  if (!enabled || pathname === '/open-nutree') return null;

  const previewCountry = getLocalPreviewCountry();

  const seedPreview = () => {
    setData(localPreviewData);
    setLead(localPreviewLead);
    setTdee(localPreviewTdee, 'fallback');
  };

  const toggleMarket = () => {
    const nextCountry = previewCountry === 'VN' ? 'US' : 'VN';
    setLocalPreviewCountry(nextCountry);
    setLocale(nextCountry === 'VN' ? 'vi' : 'en');
    window.location.reload();
  };

  return (
    <div className="fixed bottom-4 left-3 z-[70] rounded-2xl border border-white/65 bg-white/82 p-1.5 shadow-[0_18px_44px_rgb(16_39_32_/_0.14)] backdrop-blur-xl">
      <div className="grid gap-1">
        <button type="button" onClick={toggleMarket} aria-label="Toggle local language and location" title="Toggle language and location" className="grid h-9 w-9 place-items-center rounded-xl border border-teal-brand/30 bg-[#eef8f4] text-[0.64rem] font-extrabold text-forest">
          {previewCountry}
        </button>
        <button type="button" onClick={seedPreview} aria-label="Seed local preview" className="grid h-9 w-9 place-items-center rounded-xl bg-forest text-[0.64rem] font-extrabold text-white">
          Seed
        </button>
        {routes.map(([shortLabel, label, href]) => (
          <Link key={href} href={href} aria-label={label} title={label} className="grid h-9 w-9 place-items-center rounded-xl border border-border-brand bg-white/78 text-xs font-extrabold text-forest">
            {shortLabel}
          </Link>
        ))}
      </div>
    </div>
  );
}
