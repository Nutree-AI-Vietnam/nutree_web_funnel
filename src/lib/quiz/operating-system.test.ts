import { describe, expect, it } from 'vitest';
import { continuationAfterOperatingSystem } from './operating-system';

describe('continuation after the phone question', () => {
  it('sends Android and iOS into the same quiz step', () => {
    expect(continuationAfterOperatingSystem(null)).toEqual({ screen: 'quiz', step: 'goal' });
  });

  it('resumes a saved quiz step or email screen', () => {
    expect(continuationAfterOperatingSystem({ screen: 'quiz', step: 'activity_level' })).toEqual({
      screen: 'quiz',
      step: 'activity_level',
    });
    expect(continuationAfterOperatingSystem({ screen: 'email' })).toEqual({ screen: 'email' });
  });
});
