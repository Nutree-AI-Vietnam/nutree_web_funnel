import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DEFAULT_LOCALE, type Locale } from '@/lib/copy';
import { isQuizStep, type QuizStep } from './steps';
import type { CheckoutResponse, Lead, OnboardingPayload, TdeeResult } from './types';

export type PayPalCheckout = CheckoutResponse & { offerLabel: string };
export type FunnelScreen = 'landing' | 'quiz' | 'email' | 'welcome-gift' | 'paywall' | 'exit-offer';

export const STORAGE_KEY = 'nutree_funnel_v1';
const STORE_VERSION = 6;

interface QuizState {
  funnelScreen: FunnelScreen;
  currentStep: QuizStep;
  data: OnboardingPayload;
  locale: Locale;
  tdee: TdeeResult | null;
  tdeeSource: 'api' | 'fallback' | null;
  lead: Lead | null;
  paypalCheckout: PayPalCheckout | null;
  momoOrderId: string | null;
  purchased: boolean;
  setData: (patch: Partial<OnboardingPayload>) => void;
  setFunnelScreen: (screen: FunnelScreen) => void;
  setCurrentStep: (step: QuizStep) => void;
  setLocale: (locale: Locale) => void;
  setTdee: (result: TdeeResult, source: 'api' | 'fallback') => void;
  setLead: (lead: Lead) => void;
  setPayPalCheckout: (checkout: PayPalCheckout | null) => void;
  setMomoOrderId: (orderId: string | null) => void;
  setPurchased: (v: boolean) => void;
  reset: () => void;
}

const initial = {
  funnelScreen: 'landing' as FunnelScreen,
  currentStep: 'goal' as QuizStep,
  data: { measurement_unit: 'metric' } as OnboardingPayload,
  locale: DEFAULT_LOCALE,
  tdee: null,
  tdeeSource: null,
  lead: null,
  paypalCheckout: null,
  momoOrderId: null,
  purchased: false,
};

type PersistedQuizState = Pick<QuizState, 'funnelScreen' | 'currentStep' | 'data' | 'locale' | 'tdee' | 'tdeeSource' | 'lead'>;

function toPersistedQuizState(state: QuizState): PersistedQuizState {
  return {
    funnelScreen: state.funnelScreen ?? initial.funnelScreen,
    currentStep: state.currentStep ?? initial.currentStep,
    data: state.data,
    locale: state.locale,
    tdee: state.tdee,
    tdeeSource: state.tdeeSource,
    lead: state.lead ? { lead_id: state.lead.lead_id, masked_email: state.lead.masked_email, status: state.lead.status } : null,
  };
}

/** Drops untrusted legacy checkout and claim data during persisted-state upgrades. */
export function migratePersistedQuizState(persistedState: unknown): PersistedQuizState {
  const state = persistedState && typeof persistedState === 'object'
    ? persistedState as Partial<QuizState>
    : {};

  const hasFunnelScreen = state.funnelScreen === 'landing' || state.funnelScreen === 'quiz' || state.funnelScreen === 'email' || state.funnelScreen === 'welcome-gift' || state.funnelScreen === 'paywall' || state.funnelScreen === 'exit-offer';
  const currentStep = typeof state.currentStep === 'string' && isQuizStep(state.currentStep) ? state.currentStep : initial.currentStep;

  return {
    funnelScreen: hasFunnelScreen ? state.funnelScreen as FunnelScreen : state.lead ? 'paywall' : currentStep === initial.currentStep ? 'landing' : 'quiz',
    currentStep,
    data: state.data ?? initial.data,
    locale: state.locale ?? initial.locale,
    tdee: state.tdee ?? initial.tdee,
    tdeeSource: state.tdeeSource ?? initial.tdeeSource,
    lead: state.lead?.lead_id && state.lead.masked_email && state.lead.status
      ? { lead_id: state.lead.lead_id, masked_email: state.lead.masked_email, status: state.lead.status }
      : null,
  };
}

export const useQuizStore = create<QuizState>()(
  persist(
    (set) => ({
      ...initial,
      setData: (patch) => set((s) => ({ data: { ...s.data, ...patch } })),
      setFunnelScreen: (funnelScreen) => set({ funnelScreen }),
      setCurrentStep: (currentStep) => set({ currentStep }),
      setLocale: (locale) => set({ locale }),
      setTdee: (result, source) => set({ tdee: result, tdeeSource: source }),
      setLead: (lead) => set({ lead }),
      setPayPalCheckout: (paypalCheckout) => set({ paypalCheckout }),
      setMomoOrderId: (momoOrderId) => set({ momoOrderId }),
      setPurchased: (purchased) => set({ purchased }),
      // Language is a UI preference, not quiz data — keep it across a reset.
      reset: () => set((s) => ({ ...initial, data: { ...initial.data }, locale: s.locale })),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      version: STORE_VERSION,
      partialize: toPersistedQuizState,
      migrate: (persistedState) => migratePersistedQuizState(persistedState),
    },
  ),
);

/**
 * True once the persisted state has been rehydrated on the client.
 * Render quiz UI only after this to avoid SSR/localStorage mismatch.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    (cb) => useQuizStore.persist.onFinishHydration(cb),
    () => useQuizStore.persist.hasHydrated(),
    () => false,
  );
}
