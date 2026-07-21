'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { BackgroundBeams } from '@/components/ui/background-beams';
import { GlowingCard } from '@/components/ui/glowing-card';
import { trackStepViewed } from '@/lib/analytics/track';
import { vi } from '@/lib/copy/vi';
import { buildDownloadLink } from '@/lib/handoff/links';
import { useHydrated, useQuizStore } from '@/lib/quiz/store';

export default function SuccessPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const lead = useQuizStore((s) => s.lead);
  const purchased = useQuizStore((s) => s.purchased);

  useEffect(() => trackStepViewed('success'), []);
  useEffect(() => {
    if (hydrated && (!lead || !purchased)) router.replace(lead ? '/paywall' : '/email');
  }, [hydrated, lead, purchased, router]);

  if (!hydrated || !lead || !purchased) return null;

  const link = buildDownloadLink(lead.claim_token);

  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-lg flex-col items-center justify-center gap-6 overflow-hidden px-5 py-8 text-center">
      <BackgroundBeams />
      <div className="relative z-10 animate-soft-enter">
        <h1 className="text-3xl font-extrabold leading-tight text-forest">{vi.success.headline}</h1>
        <p className="mt-3 text-slate-brand">{vi.success.body}</p>
      </div>

      <GlowingCard className="relative z-10 rounded-3xl">
        <div className="p-6">
          <QRCodeSVG value={link} size={192} fgColor="#1a4739" />
          <p className="mt-3 text-sm text-muted-brand">{vi.success.qrHint}</p>
        </div>
      </GlowingCard>

      <div className="relative z-10 flex w-full flex-col gap-3">
        <a href={link} className="rounded-2xl bg-forest-dark px-6 py-4 text-lg font-semibold text-white shadow-[0_18px_40px_rgb(15_31_26_/_0.18)] transition hover:bg-emerald-deep">
          {vi.success.appStore}
        </a>
        <a href={link} className="rounded-2xl bg-forest-dark px-6 py-4 text-lg font-semibold text-white shadow-[0_18px_40px_rgb(15_31_26_/_0.18)] transition hover:bg-emerald-deep">
          ▶ {vi.success.playStore}
        </a>
      </div>

      <p className="relative z-10 text-sm text-muted-brand">{vi.success.emailHint}</p>
    </main>
  );
}
