import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Lead, OnboardingPayload, TdeeResult } from './types';

export const STORAGE_KEY = 'nutree_funnel_v1';

interface QuizState {
  data: OnboardingPayload;
  tdee: TdeeResult | null;
  tdeeSource: 'api' | 'fallback' | null;
  lead: Lead | null;
  purchased: boolean;
  setData: (patch: Partial<OnboardingPayload>) => void;
  setTdee: (result: TdeeResult, source: 'api' | 'fallback') => void;
  setLead: (lead: Lead) => void;
  setPurchased: (v: boolean) => void;
  reset: () => void;
}

const initial = {
  data: { measurement_unit: 'metric' } as OnboardingPayload,
  tdee: null,
  tdeeSource: null,
  lead: null,
  purchased: false,
};

export const useQuizStore = create<QuizState>()(
  persist(
    (set) => ({
      ...initial,
      setData: (patch) => set((s) => ({ data: { ...s.data, ...patch } })),
      setTdee: (result, source) => set({ tdee: result, tdeeSource: source }),
      setLead: (lead) => set({ lead }),
      setPurchased: (purchased) => set({ purchased }),
      reset: () => set({ ...initial, data: { ...initial.data } }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
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
