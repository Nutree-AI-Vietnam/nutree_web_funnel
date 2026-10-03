import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DEFAULT_LOCALE, type Locale } from '@/lib/copy';
import { readPendingRedemptionCorrelation } from '@/lib/revenuecat/redemption-handoff';
import { continuationAfterOperatingSystem } from './operating-system';
import { isQuizStep, type QuizStep } from './steps';
import type { CheckoutResponse, Lead, OnboardingPayload, TdeeResult } from './types';

export type PayPalCheckout = CheckoutResponse & { offerLabel: string };
export type FunnelScreen = 'landing' | 'quiz' | 'email' | 'welcome-gift' | 'paywall' | 'exit-offer';
export type DeviceOS = 'android' | 'ios';
export type ResumeAfterOS = { screen: 'quiz'; step: QuizStep } | { screen: 'email' };

export const STORAGE_KEY = 'nutree_funnel_v1';
const STORE_VERSION = 8;

interface QuizState {
  funnelScreen: FunnelScreen;
  currentStep: QuizStep;
  deviceOS: DeviceOS | null;
  resumeAfterOS: ResumeAfterOS | null;
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
  setDeviceOS: (deviceOS: DeviceOS) => void;
  setResumeAfterOS: (resume: ResumeAfterOS | null) => void;
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
  currentStep: 'operating_system' as QuizStep,
  deviceOS: null as DeviceOS | null,
  resumeAfterOS: null as ResumeAfterOS | null,
  data: { measurement_unit: 'metric' } as OnboardingPayload,
  locale: DEFAULT_LOCALE,
  tdee: null,
  tdeeSource: null,
  lead: null,
  paypalCheckout: null,
  momoOrderId: null,
  purchased: false,
};

type PersistedQuizState = Pick<QuizState, 'funnelScreen' | 'currentStep' | 'deviceOS' | 'resumeAfterOS' | 'data' | 'locale' | 'tdee' | 'tdeeSource' | 'lead'>;

function toPersistedQuizState(state: QuizState): PersistedQuizState {
  return {
    funnelScreen: state.funnelScreen ?? initial.funnelScreen,
    currentStep: state.currentStep ?? initial.currentStep,
    deviceOS: state.deviceOS ?? initial.deviceOS,
    resumeAfterOS: state.resumeAfterOS ?? initial.resumeAfterOS,
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

/** Drops untrusted legacy checkout and claim data during persisted-state upgrades. */
export function migratePersistedQuizState(persistedState: unknown, version = STORE_VERSION): PersistedQuizState {
  const state = persistedState && typeof persistedState === 'object'
    ? persistedState as Partial<QuizState>
    : {};

  const persistedScreen = typeof (state as { funnelScreen?: unknown }).funnelScreen === 'string'
    ? (state as { funnelScreen: string }).funnelScreen
    : '';
  const wasAndroidFiltered = persistedScreen === 'android-filter';
  const hasFunnelScreen = state.funnelScreen === 'landing' || state.funnelScreen === 'quiz' || state.funnelScreen === 'email' || state.funnelScreen === 'welcome-gift' || state.funnelScreen === 'paywall' || state.funnelScreen === 'exit-offer';
  const deviceOS = state.deviceOS === 'android' || state.deviceOS === 'ios' ? state.deviceOS : null;
  const hasLeadProjection = Boolean(state.lead?.lead_id && state.lead.masked_email && state.lead.status);
  const storedStep = typeof state.currentStep === 'string' && isQuizStep(state.currentStep) ? state.currentStep : initial.currentStep;
  const savedResume = state.resumeAfterOS;
  const validSavedResume: ResumeAfterOS | null = savedResume?.screen === 'quiz' && isQuizStep(savedResume.step)
    ? { screen: 'quiz', step: savedResume.step }
    : savedResume?.screen === 'email' ? { screen: 'email' } : null;
  const needsLegacyOSGate = version < STORE_VERSION && !deviceOS && !hasLeadProjection;
  const migratedResume: ResumeAfterOS | null = needsLegacyOSGate && state.funnelScreen === 'quiz'
    ? { screen: 'quiz', step: storedStep }
    : needsLegacyOSGate && (state.funnelScreen === 'email' || state.funnelScreen === 'welcome-gift')
      ? { screen: 'email' }
      : needsLegacyOSGate && !hasFunnelScreen && storedStep !== initial.currentStep
        ? { screen: 'quiz', step: storedStep }
        : null;
  const savedResumeAfterOS = migratedResume ?? validSavedResume;
  const androidContinuation = wasAndroidFiltered
    ? continuationAfterOperatingSystem(savedResumeAfterOS)
    : null;
  const resumeAfterOS = androidContinuation ? null : savedResumeAfterOS;
  const needsOSGate = resumeAfterOS !== null && deviceOS !== 'android';
  const currentStep = androidContinuation?.screen === 'quiz'
    ? androidContinuation.step
    : needsOSGate ? initial.currentStep : storedStep;

  return {
    funnelScreen: androidContinuation
      ? androidContinuation.screen
      : needsOSGate
        ? 'quiz'
        : hasFunnelScreen ? state.funnelScreen as FunnelScreen : state.lead ? 'paywall' : currentStep === initial.currentStep ? 'landing' : 'quiz',
    currentStep,
    deviceOS,
    resumeAfterOS,
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
      setDeviceOS: (deviceOS) => set({ deviceOS }),
      setResumeAfterOS: (resumeAfterOS) => set({ resumeAfterOS }),
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
      migrate: (persistedState, version) => migratePersistedQuizState(persistedState, version),
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
