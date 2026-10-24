import { describe, expect, it } from 'vitest';
import { recommendedStepGoal } from './step-goal';

describe('recommendedStepGoal', () => {
  it('scales with the job and stays in the app’s 6,000–10,000 range', () => {
    expect(recommendedStepGoal({ job_type: 'desk', age: 34 })).toBe(8000);
    expect(recommendedStepGoal({ job_type: 'on_feet', age: 34 })).toBe(9000);
    expect(recommendedStepGoal({ job_type: 'physical', age: 34 })).toBe(10000);
    expect(recommendedStepGoal({ job_type: 'desk', age: 65 })).toBe(7000);
    expect(recommendedStepGoal({})).toBe(8000);
  });
});
