'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
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
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col items-center justify-center gap-6 px-5 py-8 text-center">
      <h1 className="text-3xl font-extrabold text-forest">{vi.success.headline}</h1>
      <p className="text-slate-brand">{vi.success.body}</p>

      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <QRCodeSVG value={link} size={192} fgColor="#1a4739" />
        <p className="mt-3 text-sm text-muted-brand">{vi.success.qrHint}</p>
      </div>

      <div className="flex w-full flex-col gap-3">
        <a href={link} className="rounded-2xl bg-forest-dark px-6 py-4 text-lg font-semibold text-white">
          {vi.success.appStore}
        </a>
        <a href={link} className="rounded-2xl bg-forest-dark px-6 py-4 text-lg font-semibold text-white">
          ▶ {vi.success.playStore}
        </a>
      </div>

      <p className="text-sm text-muted-brand">{vi.success.emailHint}</p>
    </main>
  );
}
