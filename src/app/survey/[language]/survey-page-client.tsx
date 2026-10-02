'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ExitOfferPageClient } from '@/app/exit-offer/exit-offer-page-client';
import { PaywallPageClient } from '@/app/paywall/paywall-page-client';
import { StepRenderer } from '@/app/quiz/step-renderer';
import { EmailCaptureScreen } from '@/components/email-capture-screen';
import { ConversionShell } from '@/components/conversion-shell';
import { LandingPage } from '@/components/landing-page';
import { QuizShell } from '@/components/quiz-shell';
import { WelcomeGiftScreen } from '@/components/welcome-gift-screen';
import { captureAttribution } from '@/lib/analytics/attribution';
import { trackStepViewed } from '@/lib/analytics/track';
import { isOneWeekPlanEnabled, type RevenueCatPaywallPlanId } from '@/lib/revenuecat/paywall-plans';
import { clearPaywallCheckoutPending, hasExitOfferBeenClaimed, hasPaywallCheckoutPending, readSelectedPaywallPlan } from '@/lib/revenuecat/web';
import { isUserPurchased, useHydrated, useQuizStore } from '@/lib/quiz/store';
import type { FunnelScreen } from '@/lib/quiz/store';
import { useCopy } from '@/lib/copy/use-copy';
import type { Locale } from '@/lib/copy';

export function SurveyPageClient({ language }: { language: Locale }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const screen = useQuizStore((state) => state.funnelScreen);
  const currentStep = useQuizStore((state) => state.currentStep);
  const activeLocale = useQuizStore((state) => state.locale);
  const setLocale = useQuizStore((state) => state.setLocale);
  const setFunnelScreen = useQuizStore((state) => state.setFunnelScreen);
  const lead = useQuizStore((state) => state.lead);
  const purchased = useQuizStore((state) => state.purchased);

  useEffect(() => {
    if (hydrated && activeLocale !== language) setLocale(language);
  }, [activeLocale, hydrated, language, setLocale]);

  useEffect(() => {
    captureAttribution();
    if (window.location.search) window.history.replaceState(window.history.state, '', window.location.pathname + window.location.hash);
  }, []);

  useEffect(() => {
    if (!hydrated || screen !== 'paywall' || !hasPaywallCheckoutPending()) return;
    clearPaywallCheckoutPending();
    if (!hasExitOfferBeenClaimed() && !isUserPurchased({ purchased, lead })) {
      setFunnelScreen('exit-offer');
    }
  }, [hydrated, lead, purchased, screen, setFunnelScreen]);

  useEffect(() => {
    if (!hydrated) return;
    if (isUserPurchased({ purchased, lead }) && (screen === 'paywall' || screen === 'exit-offer')) {
      router.replace('/postcheckout');
    }
  }, [hydrated, lead, purchased, router, screen]);

  const goToScreen = useCallback((nextScreen: FunnelScreen) => {
    setFunnelScreen(nextScreen);
  }, [setFunnelScreen]);

  const changeLocale = useCallback((nextLocale: Locale) => {
    setLocale(nextLocale);
    router.replace(`/survey/${nextLocale}`);
  }, [router, setLocale]);

  if (!hydrated || activeLocale !== language) return null;

  switch (screen) {
    case 'landing':
      return <LandingPage surveyPath={`/survey/${language}`} onStart={() => goToScreen('quiz')} onLocaleChange={changeLocale} />;
    case 'quiz':
      return <QuizShell step={currentStep}><StepRenderer step={currentStep} /></QuizShell>;
    case 'android-filter':
      return <AndroidFilteredScreen onBack={() => goToScreen('quiz')} />;
    case 'email':
      return <EmailCaptureScreen onComplete={() => goToScreen('welcome-gift')} />;
    case 'welcome-gift':
      return <WelcomeGiftScreen onComplete={() => goToScreen('paywall')} onMissingLead={() => goToScreen('email')} />;
    case 'exit-offer': {
      if (isUserPurchased({ purchased, lead })) {
        router.replace('/postcheckout');
        return null;
      }
      const planId = (readSelectedPaywallPlan() ?? '12-week') as RevenueCatPaywallPlanId;
      return <ExitOfferPageClient initialPlanId={planId} onClaim={() => goToScreen('paywall')} onDismiss={() => goToScreen('paywall')} onMissingLead={() => goToScreen('email')} onAlreadyClaimed={() => goToScreen('paywall')} />;
    }
    case 'paywall':
      return <PaywallPageClient initialCountryCode={language === 'vi' ? 'VN' : 'US'} exitOfferMode={false} oneWeekPlanEnabled={isOneWeekPlanEnabled()} onMissingLead={() => goToScreen('email')} onCheckoutCancelled={() => {
        if (!isUserPurchased({ purchased, lead })) {
          goToScreen('exit-offer');
        }
      }} />;
    default:
      return null;
  }
}

function AndroidFilteredScreen({ onBack }: { onBack: () => void }) {
  const allCopy = useCopy();
  const copy = allCopy.operatingSystem;
  const playStoreUrl = process.env.NEXT_PUBLIC_PLAYSTORE_URL;
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    trackStepViewed('android_filter');
    headingRef.current?.focus();
  }, []);

  return (
    <ConversionShell className="justify-center gap-5 text-center">
      <div>
        <h1 ref={headingRef} tabIndex={-1} className="rounded-sm text-3xl font-extrabold leading-tight text-forest focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/25">{copy.androidHeadline}</h1>
        <p className="mt-3 text-base font-semibold leading-relaxed text-slate-brand">{copy.androidBody}</p>
      </div>
      {playStoreUrl && (
        <a
          href={playStoreUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-forest px-6 py-4 text-base font-extrabold text-white shadow-[0_16px_34px_rgb(23_69_58_/_0.22)] transition hover:bg-emerald-deep focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/25"
        >
          {copy.androidCta}
        </a>
      )}
      <button
        type="button"
        onClick={onBack}
        className="min-h-11 self-center px-4 text-sm font-bold text-muted-brand underline decoration-muted-brand/40 underline-offset-4 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/20"
      >
        {allCopy.common.back}
      </button>
    </ConversionShell>
  );
}
