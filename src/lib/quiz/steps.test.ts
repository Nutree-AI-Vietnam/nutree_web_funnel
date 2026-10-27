import { describe, it, expect } from 'vitest';
import { QUIZ_STEPS, STEP_CHAPTERS, questionCount, VALUE_TOUR_STEPS, isQuizStep, nextStep, onboardingStepCount, previousStep, stepIndex, valueProgressIndex } from './steps';

describe('quiz steps', () => {
  it('keeps one input or decision per quiz screen', () => {
    expect(QUIZ_STEPS).toEqual([
      'goal',
      'name_ask',
      'welcome',
      'challenges',
      'motivation',
      'reflection',
      'sex',
      'age',
      'height',
      'weight',
      'target_weight',
      'body_review',
      'activity_level',
      'training_days',
      'training_duration',
      'eating_pattern',
      'diet',
      'step_goal',
      'not_alone',
      'calculating',
      'result',
      'progress',
      'confidence',
    ]);
  });

  it('validates step slugs', () => {
    expect(isQuizStep('goal')).toBe(true);
    expect(isQuizStep('health_connect')).toBe(false);
    expect(isQuizStep('nonsense')).toBe(false);
  });

  it('navigates forward through quiz screens without creating subroutes', () => {
    expect(nextStep('goal')).toBe('name_ask');
    expect(nextStep('name_ask')).toBe('welcome');
    expect(nextStep('diet')).toBe('step_goal');
    expect(nextStep('step_goal')).toBe('not_alone');
    expect(nextStep('not_alone')).toBe('calculating');
    expect(nextStep('body_review')).toBe('activity_level');
  });

  it('continues from result through progress and the confidence question before email capture', () => {
    expect(nextStep('result')).toBe('progress');
    expect(nextStep('progress')).toBe('confidence');
    expect(nextStep('confidence')).toBeNull();
  });

  it('counts the questions the welcome screen promises', () => {
    expect(questionCount()).toBe(16);
  });

  it('navigates backward, landing page before first screen', () => {
    expect(previousStep('name_ask')).toBe('goal');
    expect(previousStep('motivation')).toBe('challenges');
    expect(previousStep('goal')).toBeNull();
  });

  it('skips the loader on the way back from the plan', () => {
    expect(previousStep('result')).toBe('not_alone');
    expect(previousStep('calculating')).toBe('not_alone');
  });

  it('exposes 1-based progress index', () => {
    expect(stepIndex('goal')).toBe(1);
    expect(stepIndex('height')).toBe(9);
    expect(stepIndex('result')).toBe(21);
    expect(STEP_CHAPTERS.training_days).toBe('routine');
  });

  it('continues the same progress bar through the value tour', () => {
    expect(valueProgressIndex('plan')).toBe(QUIZ_STEPS.length + 1);
    expect(valueProgressIndex('snap')).toBe(onboardingStepCount());
    expect(VALUE_TOUR_STEPS).toEqual(['plan', 'sources', 'snap']);
  });
});
