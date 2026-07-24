'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConversionShell } from '@/components/conversion-shell';
import { PrimaryButton } from '@/components/primary-button';
import { trackEvent, trackStepViewed } from '@/lib/analytics/track';
import { useCopy } from '@/lib/copy/use-copy';
import { useHydrated } from '@/lib/quiz/store';

export default function WelcomeGiftPage() {
  const router = useRouter();
  const vi = useCopy();
  const hydrated = useHydrated();
  const ticketRef = useRef<HTMLDivElement>(null);
  const revealTriggered = useRef(false);
  const [revealed, setRevealed] = useState(false);
  const [scratchProgress, setScratchProgress] = useState(0);

  useEffect(() => trackStepViewed('welcome_gift'), []);

  if (!hydrated) return null;

  const claimGift = () => {
    if (!revealed) return;
    trackEvent('welcome_gift_claimed', { discount_percent: 50 });
    router.push('/paywall');
  };

  const finishReveal = () => {
    if (revealTriggered.current) return;
    revealTriggered.current = true;
    setRevealed(true);
    setScratchProgress(100);
    navigator.vibrate?.(18);
    trackEvent('welcome_gift_revealed', { discount_percent: 50 });
  };

  const updateScratchProgress = (clientX: number) => {
    const rect = ticketRef.current?.getBoundingClientRect();
    if (!rect || revealed) return;
    const nextProgress = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    setScratchProgress((current) => {
      const progress = Math.max(current, nextProgress);
      if (progress >= 76) window.setTimeout(finishReveal, 120);
      return progress;
    });
  };

  return (
    <ConversionShell className="gap-8">
      <section className="flex flex-1 flex-col justify-center gap-8 py-6 text-center">
        <div className="space-y-3">
          <p className="text-xs font-extrabold uppercase tracking-[0.28em] text-teal-brand">
            {vi.welcomeGift.eyebrow}
          </p>
          <h1 className="text-[2rem] font-extrabold leading-[1.12] text-forest">
            {vi.welcomeGift.headline}
          </h1>
          <p className="mx-auto max-w-sm text-base font-semibold leading-relaxed text-muted-brand">
            {vi.welcomeGift.subhead}
          </p>
        </div>

        <div
          ref={ticketRef}
          className="group relative mx-auto w-full max-w-[23rem] overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#7167ee_0%,#9b5ef4_48%,#52c3d8_100%)] px-5 py-10 text-center text-white shadow-[0_24px_70px_rgb(112_103_238_/_0.28)] transition duration-300 hover:-translate-y-1 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/30 active:scale-[0.99]"
          aria-label={revealed ? vi.welcomeGift.ticketAria : vi.welcomeGift.scratchAria}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            updateScratchProgress(event.clientX);
          }}
          onPointerMove={(event) => {
            if (event.buttons !== 1 && event.pointerType !== 'touch') return;
            updateScratchProgress(event.clientX);
          }}
        >
          <span className="absolute left-0 top-1/2 h-12 w-6 -translate-x-1/2 -translate-y-1/2 rounded-r-full bg-bg-brand" />
          <span className="absolute right-0 top-1/2 h-12 w-6 -translate-y-1/2 translate-x-1/2 rounded-l-full bg-bg-brand" />
          <span className="absolute inset-0 bg-[radial-gradient(circle_at_24%_18%,rgb(255_255_255_/_0.18),transparent_28%),radial-gradient(circle_at_80%_78%,rgb(255_255_255_/_0.16),transparent_28%)] opacity-80" />
          <span className="relative block text-xs font-extrabold uppercase tracking-[0.34em] text-white/85">
            {vi.welcomeGift.ticketLabel}
          </span>
          <span className="relative mt-4 block text-6xl font-black leading-none tracking-normal text-white">
            {vi.welcomeGift.discount}
          </span>
          <span className="relative mt-3 block text-lg font-extrabold text-white drop-shadow-sm">
            {vi.welcomeGift.ticketBody}
          </span>
          {revealed && (
            <span aria-hidden="true" className="absolute inset-0">
              {[18, 34, 50, 66, 82].map((left, index) => (
                <span
                  key={left}
                  className="absolute top-1/2 h-2 w-2 rounded-full bg-white/80 shadow-[0_0_16px_rgb(255_255_255_/_0.9)] animate-ping"
                  style={{ left: `${left}%`, animationDelay: `${index * 80}ms` }}
                />
              ))}
            </span>
          )}
          <div
            className="absolute inset-0 touch-none rounded-[2rem] bg-[linear-gradient(112deg,#d8dee8_0%,#ffffff_26%,#c8d0dc_50%,#f7f9fc_74%,#b9c4d2_100%)] transition-[clip-path,opacity] duration-300"
            style={{
              clipPath: `inset(0 0 0 ${revealed ? 100 : scratchProgress}%)`,
              opacity: revealed ? 0 : 1,
            }}
          >
            <span className="absolute inset-0 bg-[repeating-linear-gradient(135deg,rgb(255_255_255_/_0.55)_0_3px,transparent_3px_15px),radial-gradient(circle_at_20%_30%,rgb(255_255_255_/_0.42),transparent_24%),radial-gradient(circle_at_78%_72%,rgb(23_37_32_/_0.08),transparent_28%)]" />
            <span className="absolute inset-0 opacity-45 [background-image:radial-gradient(circle,rgb(23_37_32_/_0.18)_0_1px,transparent_1px)] [background-size:18px_18px]" />
            <span className="absolute left-1/2 top-1/2 w-full -translate-x-1/2 -translate-y-1/2 px-8 text-center text-lg font-black text-slate-brand/60">
              {vi.welcomeGift.scratchHint}
              <span className="mt-3 block text-sm tracking-[0.22em] text-slate-brand/35">← ←  → →</span>
            </span>
          </div>
          {!revealed && scratchProgress > 0 && (
            <span
              aria-hidden="true"
              className="absolute bottom-0 top-0 w-8 -translate-x-1/2 bg-[linear-gradient(90deg,transparent,rgb(255_255_255_/_0.8),transparent)] blur-[1px]"
              style={{ left: `${scratchProgress}%` }}
            />
          )}
        </div>
      </section>

      <div className="sticky bottom-3">
        <PrimaryButton disabled={!revealed} onClick={claimGift} className="bg-none">
          {revealed ? vi.welcomeGift.cta : vi.welcomeGift.lockedCta}
        </PrimaryButton>
      </div>
    </ConversionShell>
  );
}
