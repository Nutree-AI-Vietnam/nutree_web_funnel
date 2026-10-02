import { describe, it, expect } from 'vitest';
import { chapterLabel, QUIZ_STEPS, isQuizStep, nextStep, previousStep, stepIndex } from './steps';

describe('quiz steps', () => {
  it('keeps one input or decision per quiz screen', () => {
    expect(QUIZ_STEPS).toEqual([
      'operating_system',
      'goal',
      'name_ask',
      'welcome',
      'challenges',
      'duration',
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
      'support_style',
      'science',
      'science_sources',
      'preview',
      'care_pause',
      'calculating',
      'result',
      'progress',
    ]);
  });

  it('validates step slugs', () => {
    expect(isQuizStep('goal')).toBe(true);
    expect(isQuizStep('health_connect')).toBe(false);
    expect(isQuizStep('nonsense')).toBe(false);
  });

  it('navigates forward through quiz screens without creating subroutes', () => {
    expect(nextStep('operating_system')).toBe('goal');
    expect(nextStep('goal')).toBe('name_ask');
    expect(nextStep('name_ask')).toBe('welcome');
    expect(nextStep('diet')).toBe('support_style');
    expect(nextStep('body_review')).toBe('activity_level');
    expect(nextStep('support_style')).toBe('science');
    expect(nextStep('science')).toBe('science_sources');
    expect(nextStep('science_sources')).toBe('preview');
  });

  it('continues from result through progress before email capture', () => {
    expect(nextStep('result')).toBe('progress');
    expect(nextStep('progress')).toBeNull();
  });

  it('navigates backward, landing page before first screen', () => {
    expect(previousStep('name_ask')).toBe('goal');
    expect(previousStep('goal')).toBe('operating_system');
    expect(previousStep('operating_system')).toBeNull();
  });

  it('exposes 1-based progress index', () => {
    expect(stepIndex('operating_system')).toBe(1);
    expect(stepIndex('goal')).toBe(2);
    expect(stepIndex('height')).toBe(11);
    expect(stepIndex('result')).toBe(26);
    expect(chapterLabel('training_days')).toBe('Thói quen');
  });
});
