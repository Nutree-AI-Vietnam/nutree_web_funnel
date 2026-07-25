'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { ConversionShell } from '@/components/conversion-shell';
import { GlowingCard } from '@/components/ui/glowing-card';
import { trackStepViewed } from '@/lib/analytics/track';
import { useCopy } from '@/lib/copy/use-copy';
import { buildDownloadLink } from '@/lib/handoff/links';
import { useHydrated, useQuizStore } from '@/lib/quiz/store';

export default function SuccessPage() {
  const router = useRouter();
  const vi = useCopy();
  const hydrated = useHydrated();
  const lead = useQuizStore((s) => s.lead);
  const purchased = useQuizStore((s) => s.purchased);

  useEffect(() => trackStepViewed('success'), []);
  useEffect(() => {
    if (hydrated && (!lead || !purchased)) router.replace(lead ? '/paywall' : '/email');
  }, [hydrated, lead, purchased, router]);

  if (!hydrated || !lead || !purchased) return null;

  const link = lead.claim_token ? buildDownloadLink(lead.claim_token) : buildDownloadLink('');

  return (
    <ConversionShell className="text-center">
      <div>
        <h1 className="text-3xl font-extrabold leading-tight text-forest">{vi.success.headline}</h1>
        <p className="mt-3 text-slate-brand">{vi.success.body}</p>
      </div>

      <GlowingCard className="mt-5 rounded-3xl">
        <div className="p-6">
          <QRCodeSVG value={link} size={192} fgColor="#1a4739" className="mx-auto" />
          <p className="mt-3 text-sm text-muted-brand">{vi.success.qrHint}</p>
        </div>
      </GlowingCard>

      <div className="mt-5 flex w-full flex-col gap-3">
        <a href={link} className="rounded-2xl bg-forest-dark px-6 py-4 text-lg font-semibold text-white shadow-[0_18px_40px_rgb(15_31_26_/_0.18)] transition hover:bg-emerald-deep">
          {vi.success.appStore}
        </a>
        <a href={link} className="rounded-2xl bg-forest-dark px-6 py-4 text-lg font-semibold text-white shadow-[0_18px_40px_rgb(15_31_26_/_0.18)] transition hover:bg-emerald-deep">
          {vi.success.playStore}
        </a>
      </div>

      <p className="mt-5 text-sm text-muted-brand">{vi.success.emailHint}</p>
    </ConversionShell>
  );
}
