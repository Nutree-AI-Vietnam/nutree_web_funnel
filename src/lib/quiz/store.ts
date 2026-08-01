import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DEFAULT_LOCALE, type Locale } from '@/lib/copy';
import type { CheckoutResponse, Lead, OnboardingPayload, TdeeResult } from './types';

export type PayPalCheckout = CheckoutResponse & { offerLabel: string };

export const STORAGE_KEY = 'nutree_funnel_v1';
const STORE_VERSION = 3;

interface QuizState {
  data: OnboardingPayload;
  locale: Locale;
  tdee: TdeeResult | null;
  tdeeSource: 'api' | 'fallback' | null;
  lead: Lead | null;
  paypalCheckout: PayPalCheckout | null;
  momoOrderId: string | null;
  purchased: boolean;
  setData: (patch: Partial<OnboardingPayload>) => void;
  setLocale: (locale: Locale) => void;
  setTdee: (result: TdeeResult, source: 'api' | 'fallback') => void;
  setLead: (lead: Lead) => void;
  setPayPalCheckout: (checkout: PayPalCheckout | null) => void;
  setMomoOrderId: (orderId: string | null) => void;
  setPurchased: (v: boolean) => void;
  reset: () => void;
}

const initial = {
  data: { measurement_unit: 'metric' } as OnboardingPayload,
  locale: DEFAULT_LOCALE,
  tdee: null,
  tdeeSource: null,
  lead: null,
  paypalCheckout: null,
  momoOrderId: null,
  purchased: false,
};

type PersistedQuizState = Pick<QuizState, 'data' | 'locale' | 'tdee' | 'tdeeSource' | 'lead'>;

function toPersistedQuizState(state: QuizState): PersistedQuizState {
  return {
    data: state.data,
    locale: state.locale,
    tdee: state.tdee,
    tdeeSource: state.tdeeSource,
    lead: state.lead ? { email: state.lead.email } : null,
  };
}

/** Drops untrusted legacy checkout and claim data during persisted-state upgrades. */
export function migratePersistedQuizState(persistedState: unknown): PersistedQuizState {
  const state = persistedState && typeof persistedState === 'object'
    ? persistedState as Partial<QuizState>
    : {};

  return {
    data: state.data ?? initial.data,
    locale: state.locale ?? initial.locale,
    tdee: state.tdee ?? initial.tdee,
    tdeeSource: state.tdeeSource ?? initial.tdeeSource,
    lead: state.lead?.email ? { email: state.lead.email } : null,
  };
}

export const useQuizStore = create<QuizState>()(
  persist(
    (set) => ({
      ...initial,
      setData: (patch) => set((s) => ({ data: { ...s.data, ...patch } })),
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
