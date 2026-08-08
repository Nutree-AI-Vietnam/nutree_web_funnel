import { describe, it, expect } from 'vitest';
import { chapterLabel, QUIZ_STEPS, isQuizStep, nextRoute, prevRoute, stepIndex } from './steps';

describe('quiz steps', () => {
  it('keeps one input or decision per quiz screen', () => {
    expect(QUIZ_STEPS).toEqual([
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
      'science',
      'science_sources',
      'activity_level',
      'training_days',
      'training_duration',
      'eating_pattern',
      'diet',
      'support_style',
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

  it('navigates forward through quiz steps', () => {
    expect(nextRoute('goal')).toBe('/quiz/name_ask');
    expect(nextRoute('name_ask')).toBe('/quiz/welcome');
    expect(nextRoute('diet')).toBe('/quiz/support_style');
    expect(nextRoute('science')).toBe('/quiz/science_sources');
    expect(nextRoute('science_sources')).toBe('/quiz/activity_level');
  });

  it('routes the result through progress before email capture', () => {
    expect(nextRoute('result')).toBe('/quiz/progress');
    expect(nextRoute('progress')).toBe('/email');
  });

  it('navigates backward, landing page before first step', () => {
    expect(prevRoute('name_ask')).toBe('/quiz/goal');
    expect(prevRoute('goal')).toBe('/');
  });

  it('exposes 1-based progress index', () => {
    expect(stepIndex('goal')).toBe(1);
    expect(stepIndex('height')).toBe(10);
    expect(stepIndex('result')).toBe(25);
    expect(chapterLabel('training_days')).toBe('Thói quen');
  });
});
