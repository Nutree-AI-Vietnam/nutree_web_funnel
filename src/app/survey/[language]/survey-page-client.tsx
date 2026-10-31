'use client';

import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { StepRenderer } from '@/app/(default)/quiz/step-renderer';
import { LandingPage } from '@/components/landing-page';
import { QuizShell } from '@/components/quiz-shell';
import { captureAttribution, stripNonAttributionParams } from '@/lib/analytics/attribution';
import { RouteLocaleProvider } from '@/lib/copy/use-copy';
import { goalFromSearch } from '@/lib/funnel/ad-goal';
import { useBrowserBack } from '@/lib/funnel/browser-back';
import { SKIP_LANDING } from '@/lib/funnel/skip-landing';
import { goToQuizStep, startQuizFromLanding } from '@/lib/quiz/navigation';
import { isUserPurchased, useHydrated, useQuizStore } from '@/lib/quiz/store';
import { useSeedCountry } from '@/lib/quiz/use-units';
import { isPurchaseHandoffInFlight } from '@/lib/revenuecat/purchase-handoff';
import { usePostcheckoutRedirect } from '@/lib/revenuecat/use-postcheckout-redirect';
import type { FunnelScreen } from '@/lib/quiz/store';
import type { ValueTourStep } from '@/lib/quiz/steps';
import type { Locale } from '@/lib/copy';

// Screens after the quiz load on demand, so the first screen does not wait for the
// checkout SDK and the paywall before it answers a tap.
const EmailCaptureScreen = dynamic(() => import('@/components/email-capture-screen').then((module) => module.EmailCaptureScreen));
const ValueTourScreen = dynamic(() => import('@/components/value-tour-screen').then((module) => module.ValueTourScreen));
const PaywallPageClient = dynamic(() => import('@/app/(default)/paywall/paywall-page-client').then((module) => module.PaywallPageClient));
const ExitOfferPageClient = dynamic(() => import('@/app/(default)/exit-offer/exit-offer-page-client').then((module) => module.ExitOfferPageClient));

/** Fetch the next screens once the quiz is under way, so they are ready when it ends. */
function preloadLaterScreens() {
  void import('@/components/email-capture-screen');
  void import('@/components/value-tour-screen');
  void import('@/app/(default)/paywall/paywall-page-client');
}

export function SurveyPageClient({ language, countryCode }: { language: Locale; countryCode?: string }) {
  return (
    <RouteLocaleProvider locale={language}>
      <SurveyPageContent language={language} countryCode={countryCode} />
    </RouteLocaleProvider>
  );
}

function SurveyPageContent({ language, countryCode }: { language: Locale; countryCode?: string }) {
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

  useSeedCountry(countryCode);

  // Read before the URL is cleaned below: an ad that names the goal skips the goal question.
  const [adGoal] = useState(() => (typeof window === 'undefined' ? null : goalFromSearch(window.location.search)));

  useLayoutEffect(() => {
    captureAttribution();
    stripNonAttributionParams();
  }, []);

  useLayoutEffect(() => {
    if (!SKIP_LANDING || !hydrated || screen !== 'landing') return;
    startQuizFromLanding();
    if (adGoal) {
      useQuizStore.getState().setData({ fitness_goal: adGoal });
      useQuizStore.getState().setCurrentStep('welcome');
    }
  }, [adGoal, hydrated, screen]);

  useEffect(() => {
    if (!hydrated || screen === 'landing') return;
    const idle = window.setTimeout(preloadLaterScreens, 4000);
    return () => window.clearTimeout(idle);
  }, [hydrated, screen]);

  usePostcheckoutRedirect(hydrated && (screen === 'paywall' || screen === 'exit-offer') && isUserPurchased({ purchased, lead }));

  const goToScreen = useCallback((nextScreen: FunnelScreen) => {
    setFunnelScreen(nextScreen);
  }, [setFunnelScreen]);

  const changeLocale = useCallback((nextLocale: Locale) => {
    setLocale(nextLocale);
    router.replace(`/survey/${nextLocale}`);
  }, [router, setLocale]);

  // Back from the paywall reopens the tour on its last screen; from the email screen, the tour starts over.
  const [tourStart, setTourStart] = useState<ValueTourStep>('plan');
  // Screens without a ← still answer the phone's Back button with the screen before them; the quiz and the tour handle their own.
  const screenBack = !hydrated
    ? null
    : screen === 'email'
      ? () => goToQuizStep(router, 'confidence')
      : screen === 'paywall' && !isUserPurchased({ purchased, lead })
        ? () => {
          setTourStart('snap');
          goToScreen('value');
        }
        : screen === 'exit-offer'
          ? () => goToScreen('paywall')
          : null;
  useBrowserBack(screenBack);

  if (!SKIP_LANDING && (!hydrated || screen === 'landing')) {
    return (
      <LandingPage
        language={language}
        surveyPath={`/survey/${language}`}
        onStart={() => goToScreen('quiz')}
        onLocaleChange={changeLocale}
      />
    );
  }

  if (SKIP_LANDING && (!hydrated || screen === 'landing')) {
    return (
      <QuizShell step="goal" renderBeforeHydration>
        <StepRenderer step="goal" />
      </QuizShell>
    );
  }

  switch (screen) {
    case 'quiz':
      return <QuizShell step={currentStep}><StepRenderer step={currentStep} /></QuizShell>;
    case 'email':
      return <EmailCaptureScreen onComplete={() => {
        setTourStart('plan');
        goToScreen('value');
      }} />;
    case 'value':
      return <ValueTourScreen initialStep={tourStart} onComplete={() => goToScreen('paywall')} onBack={() => goToScreen('email')} onMissingLead={() => goToScreen('email')} />;
    case 'exit-offer': {
      if (isUserPurchased({ purchased, lead }) && !isPurchaseHandoffInFlight()) {
        return null;
      }
      return <ExitOfferPageClient onClaim={() => goToScreen('paywall')} onDismiss={() => goToScreen('paywall')} onMissingLead={() => goToScreen('email')} onAlreadyClaimed={() => goToScreen('paywall')} />;
    }
    case 'paywall':
      return <PaywallPageClient initialCountryCode={language === 'vi' ? 'VN' : 'US'} exitOfferMode={false} onMissingLead={() => goToScreen('email')} onCheckoutCancelled={() => {
        if (!isUserPurchased({ purchased, lead })) {
          goToScreen('exit-offer');
        }
      }} />;
    default:
      return null;
  }
}
