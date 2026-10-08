import { describe, expect, it } from 'vitest';
import { goalAfterTargetWeight, goalForTargetWeight, toBackendGoal } from './fitness-goal';

describe('toBackendGoal', () => {
  it('maps maintain to recomp and passes the other goals through', () => {
    expect(toBackendGoal('maintain')).toBe('recomp');
    expect(toBackendGoal('cut')).toBe('cut');
    expect(toBackendGoal('bulk')).toBe('bulk');
    expect(toBackendGoal('recomp')).toBe('recomp');
    expect(toBackendGoal(undefined)).toBeUndefined();
  });
});

describe('goalForTargetWeight', () => {
  it('treats a target within 1 kg as recomp', () => {
    expect(goalForTargetWeight(52, 52)).toBe('recomp');
    expect(goalForTargetWeight(52, 51)).toBe('recomp');
    expect(goalForTargetWeight(52, 53)).toBe('recomp');
  });

  it('points lower targets to cut and higher targets to bulk', () => {
    expect(goalForTargetWeight(52, 47)).toBe('cut');
    expect(goalForTargetWeight(52, 50.9)).toBe('cut');
    expect(goalForTargetWeight(52, 58)).toBe('bulk');
  });
});

describe('goalAfterTargetWeight', () => {
  it('switches a gain goal to cut when the target is lower', () => {
    expect(goalAfterTargetWeight('bulk', 52, 47)).toBe('cut');
  });

  it('switches a lose goal to bulk when the target is higher', () => {
    expect(goalAfterTargetWeight('cut', 52, 58)).toBe('bulk');
  });

  it('switches to recomp when the target is about the current weight', () => {
    expect(goalAfterTargetWeight('cut', 52, 52)).toBe('recomp');
    expect(goalAfterTargetWeight('bulk', 52, 53)).toBe('recomp');
  });

  it('switches recomp and maintain once the target moves more than 1 kg', () => {
    expect(goalAfterTargetWeight('recomp', 52, 47)).toBe('cut');
    expect(goalAfterTargetWeight('maintain', 52, 58)).toBe('bulk');
  });

  it('keeps a goal that already matches the target', () => {
    expect(goalAfterTargetWeight('cut', 52, 47)).toBe('cut');
    expect(goalAfterTargetWeight('bulk', 52, 58)).toBe('bulk');
    expect(goalAfterTargetWeight('recomp', 52, 52)).toBe('recomp');
    expect(goalAfterTargetWeight('maintain', 52, 51)).toBe('maintain');
  });

  it('keeps the goal when the current weight is unknown', () => {
    expect(goalAfterTargetWeight('bulk', undefined, 47)).toBe('bulk');
    expect(goalAfterTargetWeight('bulk', Number.NaN, 47)).toBe('bulk');
  });
});
