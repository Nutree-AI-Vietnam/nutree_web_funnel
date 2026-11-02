import { describe, it, expect } from 'vitest';
import { QUIZ_STEPS, STEP_CHAPTERS, questionCount, VALUE_TOUR_STEPS, isQuizStep, nextStep, onboardingStepCount, previousStep, stepIndex, valueProgressIndex } from './steps';

describe('quiz steps', () => {
  it('keeps one input or decision per quiz screen', () => {
    expect(QUIZ_STEPS).toEqual([
      'goal',
      'sex',
      'age_group',
      'proof',
      'aim',
      'body_current',
      'body_target',
      'zones',
      'occasion',
      'height',
      'weight',
      'target_weight',
      'progress',
      'activity_level',
      'tried',
      'obstacle',
      'diet_style',
      'weekend',
      'trigger',
      'with_you',
      'calculating',
      'result',
    ]);
  });

  it('validates step slugs', () => {
    expect(isQuizStep('goal')).toBe(true);
    expect(isQuizStep('health_connect')).toBe(false);
    expect(isQuizStep('nonsense')).toBe(false);
  });

  it('navigates forward through quiz screens without creating subroutes', () => {
    expect(nextStep('goal')).toBe('sex');
    expect(nextStep('sex')).toBe('age_group');
    expect(nextStep('age_group')).toBe('proof');
    expect(nextStep('proof')).toBe('aim');
    expect(nextStep('aim')).toBe('body_current');
    expect(nextStep('body_current')).toBe('body_target');
    expect(nextStep('body_target')).toBe('zones');
    expect(nextStep('zones')).toBe('occasion');
    expect(nextStep('target_weight')).toBe('progress');
    expect(nextStep('progress')).toBe('activity_level');
    expect(nextStep('activity_level')).toBe('tried');
    expect(nextStep('with_you')).toBe('calculating');
    expect(nextStep('calculating')).toBe('result');
  });

  it('continues from the result straight to email', () => {
    expect(nextStep('result')).toBeNull();
  });

  it('counts screens that ask something', () => {
    expect(questionCount()).toBe(17);
    expect(questionCount('proof')).toBe(14);
    expect(questionCount('occasion')).toBe(10);
    expect(questionCount('calculating')).toBe(0);
    expect(questionCount('result')).toBe(0);
  });

  it('navigates backward, landing page before first screen', () => {
    expect(previousStep('proof')).toBe('age_group');
    expect(previousStep('age_group')).toBe('sex');
    expect(previousStep('sex')).toBe('goal');
    expect(previousStep('body_current')).toBe('aim');
    expect(previousStep('body_target')).toBe('body_current');
    expect(previousStep('goal')).toBeNull();
  });

  it('skips the loader on the way back from the plan', () => {
    expect(previousStep('result')).toBe('with_you');
    expect(previousStep('calculating')).toBe('with_you');
  });

  it('exposes 1-based progress index', () => {
    expect(stepIndex('goal')).toBe(1);
    expect(stepIndex('height')).toBe(10);
    expect(stepIndex('result')).toBe(22);
    expect(STEP_CHAPTERS.activity_level).toBe('routine');
  });

  it('continues the same progress bar through the value tour', () => {
    expect(valueProgressIndex('plan')).toBe(QUIZ_STEPS.length + 1);
    expect(valueProgressIndex('sources')).toBe(onboardingStepCount());
    expect(VALUE_TOUR_STEPS).toEqual(['plan', 'snap', 'activity', 'macros', 'sources']);
  });
});
