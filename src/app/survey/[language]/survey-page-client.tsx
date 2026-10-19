'use client';

import { useCallback, useEffect, useLayoutEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ExitOfferPageClient } from '@/app/exit-offer/exit-offer-page-client';
import { PaywallPageClient } from '@/app/paywall/paywall-page-client';
import { StepRenderer } from '@/app/quiz/step-renderer';
import { EmailCaptureScreen } from '@/components/email-capture-screen';
import { LandingPage } from '@/components/landing-page';
import { QuizShell } from '@/components/quiz-shell';
import { ValueTourScreen } from '@/components/value-tour-screen';
import { captureAttribution, stripNonAttributionParams } from '@/lib/analytics/attribution';
import { SKIP_LANDING } from '@/lib/funnel/skip-landing';
import { startQuizFromLanding } from '@/lib/quiz/navigation';
import { isUserPurchased, useHydrated, useQuizStore } from '@/lib/quiz/store';
import type { FunnelScreen } from '@/lib/quiz/store';
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
    stripNonAttributionParams();
  }, []);

  useLayoutEffect(() => {
    if (!SKIP_LANDING || !hydrated || screen !== 'landing') return;
    startQuizFromLanding();
  }, [hydrated, screen]);

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

  if (!hydrated || screen === 'landing') return null;

  switch (screen) {
    case 'quiz':
      return <QuizShell step={currentStep}><StepRenderer step={currentStep} /></QuizShell>;
    case 'email':
      return <EmailCaptureScreen onComplete={() => goToScreen('value')} />;
    case 'value':
      return <ValueTourScreen onComplete={() => goToScreen('paywall')} onBack={() => goToScreen('email')} onMissingLead={() => goToScreen('email')} />;
    case 'exit-offer': {
      if (isUserPurchased({ purchased, lead })) {
        router.replace('/postcheckout');
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
