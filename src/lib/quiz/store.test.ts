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
  });

  it('merges partial payload patches', () => {
    useQuizStore.getState().setData({ fitness_goal: 'cut' });
    useQuizStore.getState().setData({ age: 30 });
    expect(useQuizStore.getState().data).toMatchObject({
      fitness_goal: 'cut',
      age: 30,
      measurement_unit: 'metric',
    });
  });

  it('stores tdee result with source', () => {
    const r = { bmr: 1700, tdee: 2040, calories: 1540, protein_g: 165, carbs_g: 85, fat_g: 60 };
    useQuizStore.getState().setTdee(r, 'fallback');
    expect(useQuizStore.getState().tdee).toEqual(r);
    expect(useQuizStore.getState().tdeeSource).toBe('fallback');
  });

  it('stores lead and purchase flag', () => {
    useQuizStore.getState().setLead({ email: 'a@b.c', lead_id: 'lead-1' });
    useQuizStore.getState().setPurchased(true);
    expect(useQuizStore.getState().lead?.lead_id).toBe('lead-1');
    expect(useQuizStore.getState().purchased).toBe(true);
  });

  it('persists to localStorage under the versioned key', () => {
    useQuizStore.getState().setData({ name: 'Anh' });
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!).state.data.name).toBe('Anh');
    expect(JSON.parse(raw!).state).not.toHaveProperty('purchased');
    expect(JSON.parse(raw!).state).not.toHaveProperty('paypalCheckout');
  });

  it('drops legacy claim credentials and untrusted payment state during migration', () => {
    const migrated = migratePersistedQuizState({
      data: { measurement_unit: 'metric', name: 'Anh' },
      locale: 'en',
      tdee: null,
      tdeeSource: null,
      lead: { email: 'a@b.c', lead_id: 'lead-1', claim_token: 'legacy-secret', claimToken: 'legacy-secret' },
      purchased: true,
      paypalCheckout: { claimToken: 'legacy-secret' },
    });

    expect(migrated).toEqual({
      data: { measurement_unit: 'metric', name: 'Anh' },
      locale: 'en',
      tdee: null,
      tdeeSource: null,
      lead: { email: 'a@b.c', lead_id: 'lead-1' },
    });
    expect(migrated).not.toHaveProperty('purchased');
    expect(migrated).not.toHaveProperty('paypalCheckout');
    expect(migrated.lead).not.toHaveProperty('claim_token');
    expect(migrated.lead).not.toHaveProperty('claimToken');
  });

  it('rehydrates legacy records without restoring a client-claimed purchase', async () => {
    mem.set(STORAGE_KEY, JSON.stringify({
      state: {
        data: { measurement_unit: 'metric' },
        locale: 'en',
        lead: { email: 'a@b.c', lead_id: 'lead-1', claim_token: 'legacy-secret' },
        purchased: true,
        paypalCheckout: { checkoutId: 'checkout-1', claimToken: 'legacy-secret' },
      },
      version: 1,
    }));

    await useQuizStore.persist.rehydrate();

    expect(useQuizStore.getState().lead).toEqual({ email: 'a@b.c', lead_id: 'lead-1' });
    expect(useQuizStore.getState().purchased).toBe(false);
    expect(useQuizStore.getState().paypalCheckout).toBeNull();
  });

  it('reset clears everything', () => {
    useQuizStore.getState().setData({ name: 'Anh' });
    useQuizStore.getState().setPurchased(true);
    useQuizStore.getState().reset();
    expect(useQuizStore.getState().data.name).toBeUndefined();
    expect(useQuizStore.getState().purchased).toBe(false);
  });
});
