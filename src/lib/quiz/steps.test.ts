import { describe, it, expect } from 'vitest';
import {
  EN_QUIZ_STEPS,
  QUIZ_STEPS,
  STEP_CHAPTERS,
  VI_QUIZ_STEPS,
  VI_STEP_KINDS,
  VI_SURVEY,
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

  it('orders the Vietnamese survey like the full coaching flow, without an email gate', () => {
    expect(new Set(VI_QUIZ_STEPS).size).toBe(VI_QUIZ_STEPS.length);
    expect(VI_QUIZ_STEPS[0]).toBe('goal');
    expect(VI_QUIZ_STEPS[1]).toBe('sex');
    expect(VI_QUIZ_STEPS[2]).toBe('pregnant');
    expect(VI_QUIZ_STEPS.at(-4)).toBe('calculating');
    expect(VI_QUIZ_STEPS.at(-3)).toBe('day_plan');
    expect(VI_QUIZ_STEPS.at(-2)).toBe('result');
    expect(VI_QUIZ_STEPS.at(-1)).toBe('progress_final');
    expect(VI_QUIZ_STEPS).not.toContain('email');
    const nooms = VI_SURVEY.map((entry) => entry.noom).filter((noom) => noom != null);
    expect(new Set(nooms).size).toBe(nooms.length);
    expect(nooms).not.toContain(3);
    expect(nooms).not.toContain(20);
    expect(nooms).not.toContain(76);
    expect(nooms).toContain(1);
    expect(nooms).toContain(73);
    expect(nooms).toContain(75);
    expect(nooms.length).toBe(73);
    expect(VI_STEP_KINDS.insight_pace).toBe('insight');
    expect(VI_STEP_KINDS.profile_1).toBe('question');
    expect(VI_STEP_KINDS.profile_result).toBe('archetype');
    expect(VI_STEP_KINDS.food_light_why).toBe('explain');
    expect(VI_STEP_KINDS.calculating).toBe('loader');
    expect(VI_STEP_KINDS.result).toBe('plan');
    expect(VI_STEP_KINDS.progress_final).toBe('projection');
  });

  it('keeps the answer slugs the paywall and plan still read', () => {
    for (const step of ['goal', 'sex', 'age_group', 'aim', 'zones', 'occasion', 'height', 'weight', 'target_weight', 'activity_level', 'training_days', 'training_duration', 'obstacle', 'diet_style', 'calculating', 'result'] as const) {
      expect(VI_QUIZ_STEPS).toContain(step);
      expect(EN_QUIZ_STEPS).toContain(step);
    }
    for (const step of ['body_current', 'body_target', 'tried', 'weekend', 'trigger', 'proof'] as const) {
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
    expect(nextStep('sex', 'vi')).toBe('pregnant');
    expect(nextStep('pregnant', 'vi')).toBe('age_group');
    expect(nextStep('target_weight', 'vi')).toBe('insight_pace');
    expect(nextStep('insight_pace', 'vi')).toBe('zones');
    expect(nextStep('progress', 'vi')).toBe('first_name');
    expect(nextStep('profile_10', 'vi')).toBe('loader_profile');
    expect(nextStep('training_duration', 'vi')).toBe('obstacle');
    expect(nextStep('referral', 'vi')).toBe('calculating');
    expect(nextStep('calculating', 'vi')).toBe('day_plan');
    expect(nextStep('day_plan', 'vi')).toBe('result');
    expect(nextStep('result', 'vi')).toBe('progress_final');
    expect(nextStep('progress_final', 'vi')).toBeNull();
  });

  it('counts screens that ask something', () => {
    expect(questionCount('goal', 'en')).toBe(19);
    expect(questionCount('proof', 'en')).toBe(16);
    expect(questionCount('occasion', 'en')).toBe(12);
    expect(questionCount('calculating', 'en')).toBe(0);
    expect(questionCount('result', 'en')).toBe(0);
    expect(questionCount('goal', 'vi')).toBe(VI_SURVEY.filter((entry) => entry.kind === 'question').length);
    expect(questionCount('calculating', 'vi')).toBe(0);
  });

  it('navigates backward on each language', () => {
    expect(previousStep('proof', 'en')).toBe('age_group');
    expect(previousStep('age_group', 'en')).toBe('sex');
    expect(previousStep('sex', 'en')).toBe('goal');
    expect(previousStep('body_current', 'en')).toBe('aim');
    expect(previousStep('goal', 'en')).toBeNull();
    expect(previousStep('pregnant', 'vi')).toBe('sex');
    expect(previousStep('age_group', 'vi')).toBe('pregnant');
    expect(previousStep('first_name', 'vi')).toBe('progress');
    expect(previousStep('goal', 'vi')).toBeNull();
  });

  it('skips the loader on the way back from the plan', () => {
    expect(previousStep('result', 'en')).toBe('day_plan');
    expect(previousStep('day_plan', 'en')).toBe('with_you');
    expect(previousStep('calculating', 'en')).toBe('with_you');
    expect(previousStep('result', 'vi')).toBe('day_plan');
    expect(previousStep('day_plan', 'vi')).toBe('referral');
    expect(previousStep('calculating', 'vi')).toBe('referral');
    expect(previousStep('progress_final', 'vi')).toBe('result');
    expect(previousStep('profile_result', 'vi')).toBe('profile_10');
  });

  it('sends a saved English-only screen to the Vietnamese lesson that replaced it', () => {
    expect(nearestQuizStep('proof', 'vi')).toBe('with_you');
    expect(nearestQuizStep('insight_pace', 'en')).toBe('target_weight');
    expect(nearestQuizStep('height', 'vi')).toBe('height');
  });

  it('exposes 1-based progress index', () => {
    expect(stepIndex('goal', 'en')).toBe(1);
    expect(stepIndex('height', 'en')).toBe(10);
    expect(stepIndex('result', 'en')).toBe(25);
    expect(stepIndex('goal', 'vi')).toBe(1);
    expect(stepIndex('height', 'vi')).toBe(5);
    expect(stepIndex('progress_final', 'vi')).toBe(VI_QUIZ_STEPS.length);
    expect(STEP_CHAPTERS.activity_level).toBe('routine');
  });

  it('keeps the Vietnamese chapter bar moving forward', () => {
    const rank = { you: 0, body: 1, habits: 2, plan: 3 } as const;
    let previous = 0;
    for (const entry of VI_SURVEY) {
      const chapter = rank[entry.chapter];
      expect(chapter, entry.id).toBeGreaterThanOrEqual(previous);
      previous = chapter;
    }
    expect(stepIndex('first_name', 'vi')).toBeGreaterThan(stepIndex('progress', 'vi'));
  });

  it('continues the same progress bar through the value tour', () => {
    expect(valueProgressIndex('snap', 'en')).toBe(EN_QUIZ_STEPS.length + 1);
    expect(valueProgressIndex('sources', 'en')).toBe(onboardingStepCount('en'));
    expect(valueProgressIndex('snap', 'vi')).toBe(VI_QUIZ_STEPS.length + 1);
    expect(valueProgressIndex('sources', 'vi')).toBe(onboardingStepCount('vi'));
    expect(VALUE_TOUR_STEPS).toEqual(['snap', 'activity', 'macros', 'sources']);
  });
});
