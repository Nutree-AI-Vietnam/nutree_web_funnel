import { describe, expect, it } from 'vitest';
import { missingTrainingStep, trainingPair } from './training';

describe('training answers for the lead snapshot', () => {
  it('keeps a complete training pair', () => {
    expect(trainingPair({ training_days_per_week: 4, training_minutes_per_session: 60 })).toEqual({
      training_days_per_week: 4,
      training_minutes_per_session: 60,
    });
    expect(missingTrainingStep({ training_days_per_week: 4, training_minutes_per_session: 60 })).toBeNull();
  });

  it('treats zero days as no training, even with a leftover session length', () => {
    expect(trainingPair({ training_days_per_week: 0, training_minutes_per_session: 60 })).toEqual({
      training_days_per_week: 0,
      training_minutes_per_session: 0,
    });
    expect(missingTrainingStep({ training_days_per_week: 0, training_minutes_per_session: 60 })).toBeNull();
  });

  it('asks for days when the quiz never collected them', () => {
    expect(trainingPair({})).toEqual({ training_days_per_week: 0, training_minutes_per_session: 0 });
    expect(missingTrainingStep({})).toBe('training_days');
  });

  it('asks for session length when days are set without a valid duration', () => {
    expect(missingTrainingStep({ training_days_per_week: 3 })).toBe('training_duration');
    expect(missingTrainingStep({ training_days_per_week: 3, training_minutes_per_session: 10 })).toBe('training_duration');
  });
});
