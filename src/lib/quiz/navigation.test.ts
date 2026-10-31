import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { useQuizStore as useQuizStoreType } from './store';
import type {
  editQuizAnswer as editQuizAnswerType,
  goToNextQuizStep as goToNextQuizStepType,
  goToPreviousQuizStep as goToPreviousQuizStepType,
  returnToFunnelStart as returnToFunnelStartType,
} from './navigation';

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
let goToNextQuizStep: typeof goToNextQuizStepType;
let editQuizAnswer: typeof editQuizAnswerType;
let returnToFunnelStart: typeof returnToFunnelStartType;

const router = { push() {}, replace() {} };

describe('quiz start navigation', () => {
  beforeAll(async () => {
    const store = await import('./store');
    const navigation = await import('./navigation');
    useQuizStore = store.useQuizStore;
    goToPreviousQuizStep = navigation.goToPreviousQuizStep;
    goToNextQuizStep = navigation.goToNextQuizStep;
    editQuizAnswer = navigation.editQuizAnswer;
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
    useQuizStore.getState().setCurrentStep('age_group');
    useQuizStore.getState().setData({ fitness_goal: 'cut' });

    goToPreviousQuizStep(router, 'age_group');

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

describe('editing an answer from the review screen', () => {
  const answers = {
    measurement_unit: 'metric' as const,
    fitness_goal: 'cut' as const,
    gender: 'female' as const,
    age: 30,
    height_cm: 165,
    weight_kg: 70,
    target_weight_kg: 62,
  };

  beforeAll(async () => {
    const store = await import('./store');
    const navigation = await import('./navigation');
    useQuizStore = store.useQuizStore;
    goToPreviousQuizStep = navigation.goToPreviousQuizStep;
    goToNextQuizStep = navigation.goToNextQuizStep;
    editQuizAnswer = navigation.editQuizAnswer;
  });

  beforeEach(() => {
    sessionMem.clear();
    useQuizStore.getState().reset();
    useQuizStore.getState().setData(answers);
    useQuizStore.getState().setFunnelScreen('quiz');
    useQuizStore.getState().setCurrentStep('body_review');
  });

  it('comes straight back to the review after the edited answer', () => {
    editQuizAnswer(router, 'age');
    expect(useQuizStore.getState().currentStep).toBe('age');

    useQuizStore.getState().setData({ age: 31 });
    goToNextQuizStep(router, 'age');

    expect(useQuizStore.getState().currentStep).toBe('body_review');
    expect(useQuizStore.getState().editReturn).toBeNull();
    // Later answers go forward as usual again.
    goToNextQuizStep(router, 'body_review');
    expect(useQuizStore.getState().currentStep).toBe('activity_level');
  });

  it('asks the target again when the new goal points the other way', () => {
    editQuizAnswer(router, 'goal');
    useQuizStore.getState().setData({ fitness_goal: 'bulk' });
    goToNextQuizStep(router, 'goal');
    expect(useQuizStore.getState().currentStep).toBe('target_weight');

    useQuizStore.getState().setData({ target_weight_kg: 74, fitness_goal: 'bulk' });
    goToNextQuizStep(router, 'target_weight');
    expect(useQuizStore.getState().currentStep).toBe('body_review');
  });

  it('asks the target again when a new height puts it under the healthy range', () => {
    editQuizAnswer(router, 'height');
    useQuizStore.getState().setData({ height_cm: 185 });
    goToNextQuizStep(router, 'height');
    // 62 kg at 185 cm is a BMI of 18.1: under the range, so the target screen would refuse it.
    expect(useQuizStore.getState().currentStep).toBe('target_weight');
  });

  it('returns to the review on Back without walking the questions in between', () => {
    editQuizAnswer(router, 'weight');
    goToPreviousQuizStep(router, 'weight');
    expect(useQuizStore.getState().currentStep).toBe('body_review');
    expect(useQuizStore.getState().editReturn).toBeNull();
  });
});

describe('Back skips screens that were skipped on the way in', () => {
  beforeEach(() => {
    sessionMem.clear();
    useQuizStore.getState().reset();
    useQuizStore.getState().setFunnelScreen('quiz');
  });

  it('skips the session-length question when there are no training days', () => {
    useQuizStore.getState().setData({ training_days_per_week: 0, training_minutes_per_session: 0 });
    goToPreviousQuizStep(router, 'eating_pattern');
    expect(useQuizStore.getState().currentStep).toBe('training_days');
  });

  it('keeps the session-length question for people who train', () => {
    useQuizStore.getState().setData({ training_days_per_week: 3, training_minutes_per_session: 45 });
    goToPreviousQuizStep(router, 'eating_pattern');
    expect(useQuizStore.getState().currentStep).toBe('training_duration');
  });

  it('goes from the plan to the last question, not the loader', () => {
    goToPreviousQuizStep(router, 'result');
    expect(useQuizStore.getState().currentStep).toBe('not_alone');
  });
});
