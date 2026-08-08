'use client';

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ExitOfferPageClient } from '@/app/exit-offer/exit-offer-page-client';
import { PaywallPageClient } from '@/app/paywall/paywall-page-client';
import { StepRenderer } from '@/app/quiz/step-renderer';
import { EmailCaptureScreen } from '@/components/email-capture-screen';
import { LandingPage } from '@/components/landing-page';
import { QuizShell } from '@/components/quiz-shell';
import { WelcomeGiftScreen } from '@/components/welcome-gift-screen';
import { isOneWeekPlanEnabled, type RevenueCatPaywallPlanId } from '@/lib/revenuecat/paywall-plans';
import { clearPaywallCheckoutPending, hasExitOfferBeenClaimed, hasPaywallCheckoutPending, readSelectedPaywallPlan } from '@/lib/revenuecat/web';
import { useHydrated, useQuizStore } from '@/lib/quiz/store';
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

  useEffect(() => {
    if (hydrated && activeLocale !== language) setLocale(language);
  }, [activeLocale, hydrated, language, setLocale]);

  useEffect(() => {
    if (window.location.search) window.history.replaceState(window.history.state, '', window.location.pathname + window.location.hash);
  }, []);

  useEffect(() => {
    if (!hydrated || screen !== 'paywall' || !hasPaywallCheckoutPending()) return;
    clearPaywallCheckoutPending();
    if (!hasExitOfferBeenClaimed()) setFunnelScreen('exit-offer');
  }, [hydrated, screen, setFunnelScreen]);

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
    case 'email':
      return <EmailCaptureScreen onComplete={() => goToScreen('welcome-gift')} />;
    case 'welcome-gift':
      return <WelcomeGiftScreen onComplete={() => goToScreen('paywall')} onMissingLead={() => goToScreen('email')} />;
    case 'exit-offer': {
      const planId = (readSelectedPaywallPlan() ?? '12-week') as RevenueCatPaywallPlanId;
      return <ExitOfferPageClient initialPlanId={planId} onClaim={() => goToScreen('paywall')} onDismiss={() => goToScreen('paywall')} onMissingLead={() => goToScreen('email')} onAlreadyClaimed={() => goToScreen('paywall')} />;
    }
    case 'paywall':
      return <PaywallPageClient initialCountryCode={language === 'vi' ? 'VN' : 'US'} exitOfferMode={false} oneWeekPlanEnabled={isOneWeekPlanEnabled()} onMissingLead={() => goToScreen('email')} onCheckoutCancelled={() => goToScreen('exit-offer')} />;
    default:
      return null;
  }
}
