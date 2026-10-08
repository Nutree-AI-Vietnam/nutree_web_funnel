import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DEFAULT_LOCALE, type Locale } from '@/lib/copy';
import { readPendingRedemptionCorrelation } from '@/lib/revenuecat/redemption-handoff';
import { goalAfterTargetWeight } from './fitness-goal';
import { isQuizStep, type QuizStep } from './steps';
import type { CheckoutResponse, Lead, OnboardingPayload, TdeeResult } from './types';

export type PayPalCheckout = CheckoutResponse & { offerLabel: string };
const FUNNEL_SCREENS = ['landing', 'quiz', 'email', 'welcome-gift', 'paywall', 'exit-offer'] as const;
export type FunnelScreen = (typeof FUNNEL_SCREENS)[number];

export const STORAGE_KEY = 'nutree_funnel_v1';
const STORE_VERSION = 9;

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

/**
 * Keep funnel progress inside the current browser tab only. Remove the old
 * localStorage record so an upgrade cannot resurrect prior survey data.
 */
function getQuizStorage(): Storage {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Continue with session storage when legacy storage is unavailable.
  }
  return sessionStorage;
}

type LegacyResume = { screen: 'quiz'; step: QuizStep } | { screen: 'email' };

/** Where a tab saved behind the removed phone question was headed next. */
function legacyResume(saved: unknown): LegacyResume | null {
  if (!saved || typeof saved !== 'object') return null;
  const { screen, step } = saved as { screen?: unknown; step?: unknown };
  if (screen === 'quiz' && typeof step === 'string' && isQuizStep(step)) return { screen: 'quiz', step };
  return screen === 'email' ? { screen: 'email' } : null;
}

/** Older answers could pair a gain goal with a lower target weight; derive it like the app does. */
function withGoalForTargetWeight(data: OnboardingPayload): OnboardingPayload {
  if (data.target_weight_kg == null) return data;
  const fitness_goal = goalAfterTargetWeight(data.fitness_goal, data.weight_kg, data.target_weight_kg);
  return fitness_goal === data.fitness_goal ? data : { ...data, fitness_goal };
}

/** Drops untrusted legacy checkout and claim data during persisted-state upgrades. */
export function migratePersistedQuizState(persistedState: unknown): PersistedQuizState {
  const state = (persistedState && typeof persistedState === 'object' ? persistedState : {}) as
    Partial<Omit<QuizState, 'funnelScreen' | 'currentStep'>> & { funnelScreen?: unknown; currentStep?: unknown; resumeAfterOS?: unknown };
  const savedScreen = FUNNEL_SCREENS.find((screen) => screen === state.funnelScreen);
  const storedStep = typeof state.currentStep === 'string' && isQuizStep(state.currentStep) ? state.currentStep : initial.currentStep;
  const resume = legacyResume(state.resumeAfterOS);
  const atPhoneQuestion = state.funnelScreen === 'android-filter' || (state.currentStep === 'operating_system' && savedScreen === 'quiz');
  const currentStep = resume?.screen === 'quiz' ? resume.step : storedStep;
  const lead = state.lead?.lead_id && state.lead.masked_email && state.lead.status
    ? { lead_id: state.lead.lead_id, masked_email: state.lead.masked_email, status: state.lead.status }
    : null;
  const savedData = state.data ?? initial.data;
  // A lead's snapshot already holds the goal on the server, so only answers still in progress are corrected.
  const data = lead ? savedData : withGoalForTargetWeight(savedData);
  const goalChanged = data !== savedData;

  return {
    funnelScreen: atPhoneQuestion
      ? resume?.screen ?? 'quiz'
      : savedScreen ?? (state.lead ? 'paywall' : currentStep === initial.currentStep ? 'landing' : 'quiz'),
    currentStep,
    data,
    locale: state.locale ?? initial.locale,
    // Calories computed for the old goal would contradict the corrected one; the result step recalculates.
    tdee: goalChanged ? null : state.tdee ?? initial.tdee,
    tdeeSource: goalChanged ? null : state.tdeeSource ?? initial.tdeeSource,
    lead,
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
      storage: createJSONStorage(getQuizStorage),
      version: STORE_VERSION,
      partialize: toPersistedQuizState,
      migrate: (persistedState) => migratePersistedQuizState(persistedState),
    },
  ),
);

/**
 * True once the tab-scoped state has been rehydrated on the client.
 * Render quiz UI only after this to avoid SSR/sessionStorage mismatch.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    (cb) => useQuizStore.persist.onFinishHydration(cb),
    () => useQuizStore.persist.hasHydrated(),
    () => false,
  );
}

export function isUserPurchased(state?: { purchased?: boolean; lead?: { lead_id?: string; status?: string } | null }): boolean {
  if (state?.purchased) return true;
  if (state?.lead?.status && state.lead.status !== 'payment_pending') return true;
  try {
    const current = useQuizStore.getState();
    if (current.purchased) return true;
    if (current.lead?.status && current.lead.status !== 'payment_pending') return true;
    const pending = readPendingRedemptionCorrelation();
    const effectiveLeadId = state?.lead?.lead_id ?? current.lead?.lead_id;
    if (pending && (!effectiveLeadId || pending.leadId === effectiveLeadId)) return true;
  } catch {
    // Session storage or store unavailable
  }
  return false;
}
