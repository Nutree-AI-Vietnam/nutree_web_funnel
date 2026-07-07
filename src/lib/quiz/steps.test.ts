import { describe, it, expect } from 'vitest';
import { QUIZ_STEPS, isQuizStep, nextRoute, prevRoute, stepIndex } from './steps';

describe('quiz steps', () => {
  it('has 23 steps in spec order, starting with name_ask and ending with result_promising', () => {
    expect(QUIZ_STEPS).toHaveLength(23);
    expect(QUIZ_STEPS[0]).toBe('name_ask');
    expect(QUIZ_STEPS[QUIZ_STEPS.length - 1]).toBe('result_promising');
  });

  it('validates step slugs', () => {
    expect(isQuizStep('goal')).toBe(true);
    expect(isQuizStep('health_connect')).toBe(false);
    expect(isQuizStep('nonsense')).toBe(false);
  });

  it('navigates forward through quiz steps', () => {
    expect(nextRoute('name_ask')).toBe('/quiz/goal');
    expect(nextRoute('diet')).toBe('/quiz/tdee_science_promo');
  });

  it('exits to /email after the last quiz step', () => {
    expect(nextRoute('result_promising')).toBe('/email');
  });

  it('navigates backward, landing page before first step', () => {
    expect(prevRoute('goal')).toBe('/quiz/name_ask');
    expect(prevRoute('name_ask')).toBe('/');
  });

  it('exposes 1-based progress index', () => {
    expect(stepIndex('name_ask')).toBe(1);
    expect(stepIndex('result_promising')).toBe(23);
  });
});
