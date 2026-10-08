import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import type { useQuizStore as useQuizStoreType } from './store';

const mem = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
  key: (i: number) => [...mem.keys()][i] ?? null,
  get length() {
    return mem.size;
  },
  } satisfies Storage,
});

const sessionMem = new Map<string, string>();
Object.defineProperty(globalThis, 'sessionStorage', {
  configurable: true,
  value: {
  getItem: (k: string) => sessionMem.get(k) ?? null,
  setItem: (k: string, v: string) => void sessionMem.set(k, v),
  removeItem: (k: string) => void sessionMem.delete(k),
  clear: () => sessionMem.clear(),
  key: (i: number) => [...sessionMem.keys()][i] ?? null,
  get length() {
    return sessionMem.size;
  },
  } satisfies Storage,
});

let useQuizStore: typeof useQuizStoreType;
let STORAGE_KEY: string;
let migratePersistedQuizState: typeof import('./store').migratePersistedQuizState;

describe('quiz store', () => {
  beforeAll(async () => {
    const store = await import('./store');
    useQuizStore = store.useQuizStore;
    STORAGE_KEY = store.STORAGE_KEY;
    migratePersistedQuizState = store.migratePersistedQuizState;
  });

  beforeEach(() => {
    useQuizStore.getState().reset();
    mem.clear();
    sessionMem.clear();
  });

  it('merges partial payload patches', () => {
    useQuizStore.getState().setData({ fitness_goal: 'cut' });
    useQuizStore.getState().setData({ birth_year: 1996, birth_month: 3, birth_day: 14 });
    expect(useQuizStore.getState().data).toMatchObject({
      fitness_goal: 'cut',
      birth_year: 1996,
      measurement_unit: 'metric',
    });
  });

  it('stores tdee result with source', () => {
    const r = { bmr: 1700, tdee: 2040, calories: 1540, protein_g: 165, carbs_g: 85, fat_g: 60 };
    useQuizStore.getState().setTdee(r, 'fallback');
    expect(useQuizStore.getState().tdee).toEqual(r);
    expect(useQuizStore.getState().tdeeSource).toBe('fallback');
  });

  it('stores the safe lead projection and purchase flag', () => {
    useQuizStore.getState().setLead({ lead_id: 'lead-1', masked_email: 'a***@b.c', status: 'payment_pending' });
    useQuizStore.getState().setPurchased(true);
    expect(useQuizStore.getState().lead).toEqual({ lead_id: 'lead-1', masked_email: 'a***@b.c', status: 'payment_pending' });
    expect(useQuizStore.getState().purchased).toBe(true);
  });

  it('persists the implicit funnel screen', () => {
    useQuizStore.getState().setFunnelScreen('paywall');
    expect(JSON.parse(sessionStorage.getItem(STORAGE_KEY)!).state.funnelScreen).toBe('paywall');
    useQuizStore.getState().reset();
    expect(useQuizStore.getState().funnelScreen).toBe('landing');
  });

  it('persists to sessionStorage under the versioned key', () => {
    useQuizStore.getState().setData({ name: 'Anh' });
    const raw = sessionStorage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!).state.data.name).toBe('Anh');
    expect(JSON.parse(raw!).state).not.toHaveProperty('purchased');
    expect(JSON.parse(raw!).state).not.toHaveProperty('paypalCheckout');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('drops legacy claim credentials and untrusted payment state during migration', () => {
    const migrated = migratePersistedQuizState({
      data: { measurement_unit: 'metric', name: 'Anh' },
      locale: 'en',
      tdee: null,
      tdeeSource: null,
    lead: { email: 'a@b.c', lead_id: 'lead-1', masked_email: 'a***@b.c', status: 'payment_pending', claim_token: 'legacy-secret', claimToken: 'legacy-secret' },
      purchased: true,
      paypalCheckout: { claimToken: 'legacy-secret' },
    });

    expect(migrated).toEqual({
      funnelScreen: 'paywall',
      currentStep: 'goal',
      data: { measurement_unit: 'metric', name: 'Anh' },
      locale: 'en',
      tdee: null,
      tdeeSource: null,
      lead: { lead_id: 'lead-1', masked_email: 'a***@b.c', status: 'payment_pending' },
    });
    expect(migrated).not.toHaveProperty('purchased');
    expect(migrated).not.toHaveProperty('paypalCheckout');
    expect(migrated.lead).not.toHaveProperty('claim_token');
    expect(migrated.lead).not.toHaveProperty('claimToken');
  });

  it('rehydrates legacy records without restoring a client-claimed purchase', async () => {
    sessionMem.set(STORAGE_KEY, JSON.stringify({
      state: {
        data: { measurement_unit: 'metric' },
        locale: 'en',
    lead: { email: 'a@b.c', lead_id: 'lead-1', masked_email: 'a***@b.c', status: 'payment_pending', claim_token: 'legacy-secret' },
        purchased: true,
        paypalCheckout: { checkoutId: 'checkout-1', claimToken: 'legacy-secret' },
      },
      version: 1,
    }));

    await useQuizStore.persist.rehydrate();

    expect(useQuizStore.getState().lead).toEqual({ lead_id: 'lead-1', masked_email: 'a***@b.c', status: 'payment_pending' });
    expect(useQuizStore.getState().purchased).toBe(false);
    expect(useQuizStore.getState().paypalCheckout).toBeNull();
  });

  it('continues a saved Android filter into the quiz', () => {
    const migrated = migratePersistedQuizState({
      funnelScreen: 'android-filter',
      currentStep: 'operating_system',
      deviceOS: 'android',
      resumeAfterOS: null,
      data: { measurement_unit: 'metric' },
      locale: 'en',
    });

    expect(migrated.funnelScreen).toBe('quiz');
    expect(migrated.currentStep).toBe('goal');
    expect(migrated).not.toHaveProperty('deviceOS');
    expect(migrated).not.toHaveProperty('resumeAfterOS');
  });

  it('moves a tab waiting on the removed phone question to where it was headed', () => {
    const atPhoneQuestion = { funnelScreen: 'quiz', currentStep: 'operating_system', deviceOS: null, data: { measurement_unit: 'metric' }, locale: 'vi' };

    const fresh = migratePersistedQuizState({ ...atPhoneQuestion, resumeAfterOS: null });
    expect([fresh.funnelScreen, fresh.currentStep]).toEqual(['quiz', 'goal']);

    const midQuiz = migratePersistedQuizState({ ...atPhoneQuestion, resumeAfterOS: { screen: 'quiz', step: 'activity_level' } });
    expect([midQuiz.funnelScreen, midQuiz.currentStep]).toEqual(['quiz', 'activity_level']);

    const finished = migratePersistedQuizState({ ...atPhoneQuestion, resumeAfterOS: { screen: 'email' } });
    expect(finished.funnelScreen).toBe('email');
  });

  it('keeps a saved landing or paywall screen when the old phone step is stored', () => {
    const landing = migratePersistedQuizState({
      funnelScreen: 'landing',
      currentStep: 'operating_system',
      resumeAfterOS: { screen: 'quiz', step: 'height' },
      data: { measurement_unit: 'metric' },
    });
    expect([landing.funnelScreen, landing.currentStep]).toEqual(['landing', 'height']);

    const paywall = migratePersistedQuizState({
      funnelScreen: 'paywall',
      currentStep: 'operating_system',
      data: { measurement_unit: 'metric' },
      lead: { lead_id: 'lead-1', masked_email: 'a***@b.c', status: 'payment_pending' },
    });
    expect([paywall.funnelScreen, paywall.currentStep]).toEqual(['paywall', 'goal']);
  });

  it('keeps ordinary saved quiz progress unchanged', () => {
    const migrated = migratePersistedQuizState({
      funnelScreen: 'quiz',
      currentStep: 'activity_level',
      data: { measurement_unit: 'metric', fitness_goal: 'cut', weight_kg: 60, target_weight_kg: 55 },
    });
    expect([migrated.funnelScreen, migrated.currentStep]).toEqual(['quiz', 'activity_level']);
    expect(migrated.data.fitness_goal).toBe('cut');
  });

  it('derives the goal from the target weight for answers saved before email', () => {
    const tdee = { bmr: 1300, tdee: 1820, calories: 2120, protein_g: 88, carbs_g: 300, fat_g: 59 };
    const saved = {
      funnelScreen: 'quiz',
      currentStep: 'result',
      data: { measurement_unit: 'metric', fitness_goal: 'bulk', weight_kg: 52, target_weight_kg: 47 },
      tdee,
      tdeeSource: 'api',
    };

    const inProgress = migratePersistedQuizState(saved);
    expect(inProgress.data.fitness_goal).toBe('cut');
    expect(inProgress.tdee).toBeNull();
    expect(inProgress.tdeeSource).toBeNull();

    const withLead = migratePersistedQuizState({
      ...saved,
      funnelScreen: 'paywall',
      lead: { lead_id: 'lead-1', masked_email: 'a***@b.c', status: 'payment_pending' },
    });
    expect(withLead.data.fitness_goal).toBe('bulk');
    expect(withLead.tdee).toEqual(tdee);
  });

  it('reset clears everything', () => {
    useQuizStore.getState().setData({ name: 'Anh' });
    useQuizStore.getState().setPurchased(true);
    useQuizStore.getState().reset();
    expect(useQuizStore.getState().data.name).toBeUndefined();
    expect(useQuizStore.getState().purchased).toBe(false);
  });
});
