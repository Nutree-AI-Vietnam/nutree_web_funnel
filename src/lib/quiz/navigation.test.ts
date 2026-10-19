import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { useQuizStore as useQuizStoreType } from './store';
import type { goToPreviousQuizStep as goToPreviousQuizStepType, returnToFunnelStart as returnToFunnelStartType } from './navigation';

const sessionMem = new Map<string, string>();
const localMem = new Map<string, string>();

function memoryStorage(mem: Map<string, string>): Storage {
  return {
    getItem: (key) => mem.get(key) ?? null,
    setItem: (key, value) => void mem.set(key, value),
    removeItem: (key) => void mem.delete(key),
    clear: () => mem.clear(),
    key: (index) => [...mem.keys()][index] ?? null,
    get length() {
      return mem.size;
    },
  };
}

Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: memoryStorage(localMem) });
Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: memoryStorage(sessionMem) });

let useQuizStore: typeof useQuizStoreType;
let goToPreviousQuizStep: typeof goToPreviousQuizStepType;
let returnToFunnelStart: typeof returnToFunnelStartType;

const router = { push() {}, replace() {} };

describe('quiz start navigation', () => {
  beforeAll(async () => {
    const store = await import('./store');
    const navigation = await import('./navigation');
    useQuizStore = store.useQuizStore;
    goToPreviousQuizStep = navigation.goToPreviousQuizStep;
    returnToFunnelStart = navigation.returnToFunnelStart;
  });

  beforeEach(() => {
    sessionMem.clear();
    localMem.clear();
    useQuizStore.getState().reset();
  });

  it('restarts the goal step from the back button when landing is skipped', () => {
    useQuizStore.getState().setFunnelScreen('quiz');
    useQuizStore.getState().setCurrentStep('goal');
    useQuizStore.getState().setData({ fitness_goal: 'cut' });
    sessionStorage.setItem('quiz:lastIndex', '3');

    goToPreviousQuizStep(router, 'goal');

    expect(useQuizStore.getState().funnelScreen).toBe('quiz');
    expect(useQuizStore.getState().currentStep).toBe('goal');
    expect(useQuizStore.getState().data.fitness_goal).toBeUndefined();
    expect(sessionStorage.getItem('quiz:lastIndex')).toBeNull();
  });

  it('steps back inside the quiz without restarting', () => {
    useQuizStore.getState().setFunnelScreen('quiz');
    useQuizStore.getState().setCurrentStep('name_ask');
    useQuizStore.getState().setData({ fitness_goal: 'cut' });

    goToPreviousQuizStep(router, 'name_ask');

    expect(useQuizStore.getState().funnelScreen).toBe('quiz');
    expect(useQuizStore.getState().currentStep).toBe('goal');
    expect(useQuizStore.getState().data.fitness_goal).toBe('cut');
  });

  it('sends exit intent to a fresh goal step', () => {
    useQuizStore.getState().setFunnelScreen('quiz');
    useQuizStore.getState().setCurrentStep('motivation');
    useQuizStore.getState().setData({ fitness_goal: 'bulk', name: 'Anh' });

    returnToFunnelStart();

    expect(useQuizStore.getState().funnelScreen).toBe('quiz');
    expect(useQuizStore.getState().currentStep).toBe('goal');
    expect(useQuizStore.getState().data).toEqual({ measurement_unit: 'metric' });
  });
});
