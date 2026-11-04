import { describe, it, expect } from 'vitest';
import {
  EN_QUIZ_STEPS,
  QUIZ_STEPS,
  STEP_CHAPTERS,
  VI_QUIZ_STEPS,
  VI_STEP_KINDS,
  VALUE_TOUR_STEPS,
  isQuizStep,
  nearestQuizStep,
  nextStep,
  onboardingStepCount,
  previousStep,
  questionCount,
  stepIndex,
  valueProgressIndex,
} from './steps';

const ENGLISH_ORDER = [
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
  'training_days',
  'training_duration',
  'tried',
  'obstacle',
  'diet_style',
  'weekend',
  'trigger',
  'with_you',
  'calculating',
  'day_plan',
  'result',
] as const;

describe('quiz steps', () => {
  it('keeps the English survey order unchanged', () => {
    expect(EN_QUIZ_STEPS).toEqual([...ENGLISH_ORDER]);
    expect(QUIZ_STEPS).toEqual([...ENGLISH_ORDER]);
  });

  it('orders the Vietnamese survey as questions, lessons, a projection, a loader, and a plan', () => {
    expect(VI_QUIZ_STEPS).toEqual([
      'goal',
      'sex',
      'age_group',
      'insight_pace',
      'height',
      'weight',
      'target_weight',
      'progress',
      'body_current',
      'body_target',
      'zones',
      'insight_body',
      'aim',
      'occasion',
      'insight_why',
      'activity_level',
      'training_days',
      'training_duration',
      'insight_movement',
      'tried',
      'obstacle',
      'insight_obstacle',
      'diet_style',
      'weekend',
      'trigger',
      'insight_habits',
      'with_you',
      'calculating',
      'result',
    ]);
    expect(VI_STEP_KINDS.insight_pace).toBe('insight');
    expect(VI_STEP_KINDS.progress).toBe('projection');
    expect(VI_STEP_KINDS.with_you).toBe('coaching');
    expect(VI_STEP_KINDS.calculating).toBe('loader');
    expect(VI_STEP_KINDS.result).toBe('plan');
    const kinds = VI_QUIZ_STEPS.map((step) => VI_STEP_KINDS[step]);
    expect(kinds.indexOf('insight')).toBeGreaterThan(kinds.indexOf('question'));
    expect(kinds.lastIndexOf('insight')).toBeLessThan(kinds.indexOf('loader'));
    expect(kinds.indexOf('loader')).toBe(kinds.indexOf('plan') - 1);
  });

  it('keeps the answer slugs the paywall and plan still read', () => {
    for (const step of ['goal', 'sex', 'age_group', 'aim', 'body_current', 'body_target', 'zones', 'occasion', 'height', 'weight', 'target_weight', 'activity_level', 'training_days', 'training_duration', 'tried', 'obstacle', 'diet_style', 'weekend', 'trigger', 'calculating', 'result'] as const) {
      expect(VI_QUIZ_STEPS).toContain(step);
      expect(EN_QUIZ_STEPS).toContain(step);
    }
  });

  it('validates step slugs', () => {
    expect(isQuizStep('goal')).toBe(true);
    expect(isQuizStep('insight_pace')).toBe(true);
    expect(isQuizStep('health_connect')).toBe(false);
    expect(isQuizStep('nonsense')).toBe(false);
  });

  it('navigates the English survey without creating subroutes', () => {
    expect(nextStep('goal', 'en')).toBe('sex');
    expect(nextStep('sex', 'en')).toBe('age_group');
    expect(nextStep('age_group', 'en')).toBe('proof');
    expect(nextStep('proof', 'en')).toBe('aim');
    expect(nextStep('aim', 'en')).toBe('body_current');
    expect(nextStep('body_current', 'en')).toBe('body_target');
    expect(nextStep('body_target', 'en')).toBe('zones');
    expect(nextStep('zones', 'en')).toBe('occasion');
    expect(nextStep('target_weight', 'en')).toBe('progress');
    expect(nextStep('progress', 'en')).toBe('activity_level');
    expect(nextStep('activity_level', 'en')).toBe('training_days');
    expect(nextStep('training_days', 'en')).toBe('training_duration');
    expect(nextStep('training_duration', 'en')).toBe('tried');
    expect(nextStep('with_you', 'en')).toBe('calculating');
    expect(nextStep('calculating', 'en')).toBe('day_plan');
    expect(nextStep('day_plan', 'en')).toBe('result');
    expect(nextStep('result', 'en')).toBeNull();
  });

  it('navigates the Vietnamese survey through lessons before the plan', () => {
    expect(nextStep('goal', 'vi')).toBe('sex');
    expect(nextStep('age_group', 'vi')).toBe('insight_pace');
    expect(nextStep('insight_pace', 'vi')).toBe('height');
    expect(nextStep('target_weight', 'vi')).toBe('progress');
    expect(nextStep('progress', 'vi')).toBe('body_current');
    expect(nextStep('zones', 'vi')).toBe('insight_body');
    expect(nextStep('training_duration', 'vi')).toBe('insight_movement');
    expect(nextStep('trigger', 'vi')).toBe('insight_habits');
    expect(nextStep('with_you', 'vi')).toBe('calculating');
    expect(nextStep('calculating', 'vi')).toBe('result');
    expect(nextStep('result', 'vi')).toBeNull();
  });

  it('counts screens that ask something', () => {
    expect(questionCount('goal', 'en')).toBe(19);
    expect(questionCount('proof', 'en')).toBe(16);
    expect(questionCount('occasion', 'en')).toBe(12);
    expect(questionCount('calculating', 'en')).toBe(0);
    expect(questionCount('result', 'en')).toBe(0);
    expect(questionCount('goal', 'vi')).toBe(19);
    expect(questionCount('insight_pace', 'vi')).toBe(16);
    expect(questionCount('calculating', 'vi')).toBe(0);
  });

  it('navigates backward on each language', () => {
    expect(previousStep('proof', 'en')).toBe('age_group');
    expect(previousStep('age_group', 'en')).toBe('sex');
    expect(previousStep('sex', 'en')).toBe('goal');
    expect(previousStep('body_current', 'en')).toBe('aim');
    expect(previousStep('goal', 'en')).toBeNull();
    expect(previousStep('insight_pace', 'vi')).toBe('age_group');
    expect(previousStep('height', 'vi')).toBe('insight_pace');
    expect(previousStep('goal', 'vi')).toBeNull();
  });

  it('skips the loader on the way back from the plan', () => {
    expect(previousStep('result', 'en')).toBe('day_plan');
    expect(previousStep('day_plan', 'en')).toBe('with_you');
    expect(previousStep('calculating', 'en')).toBe('with_you');
    expect(previousStep('result', 'vi')).toBe('with_you');
    expect(previousStep('calculating', 'vi')).toBe('with_you');
  });

  it('sends a saved English-only screen to the Vietnamese lesson that replaced it', () => {
    expect(nearestQuizStep('proof', 'vi')).toBe('insight_pace');
    expect(nearestQuizStep('insight_pace', 'en')).toBe('age_group');
    expect(nearestQuizStep('height', 'vi')).toBe('height');
  });

  it('exposes 1-based progress index', () => {
    expect(stepIndex('goal', 'en')).toBe(1);
    expect(stepIndex('height', 'en')).toBe(10);
    expect(stepIndex('result', 'en')).toBe(25);
    expect(stepIndex('goal', 'vi')).toBe(1);
    expect(stepIndex('height', 'vi')).toBe(5);
    expect(stepIndex('result', 'vi')).toBe(VI_QUIZ_STEPS.length);
    expect(STEP_CHAPTERS.activity_level).toBe('routine');
  });

  it('continues the same progress bar through the value tour', () => {
    expect(valueProgressIndex('snap', 'en')).toBe(EN_QUIZ_STEPS.length + 1);
    expect(valueProgressIndex('sources', 'en')).toBe(onboardingStepCount('en'));
    expect(valueProgressIndex('snap', 'vi')).toBe(VI_QUIZ_STEPS.length + 1);
    expect(valueProgressIndex('sources', 'vi')).toBe(onboardingStepCount('vi'));
    expect(VALUE_TOUR_STEPS).toEqual(['snap', 'activity', 'macros', 'sources']);
  });
});
