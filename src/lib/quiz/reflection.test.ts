import { describe, it, expect } from 'vitest';
import { buildReflection } from './reflection';

describe('buildReflection', () => {
  it('interpolates name, goal label, challenge labels, duration label', () => {
    const text = buildReflection({
      name: 'Anh',
      fitness_goal: 'cut',
      pain_points: ['no_time', 'cravings'],
      challenge_duration: 'few_months',
    });
    expect(text).toContain('Anh');
    expect(text).toContain('Giảm cân'.toLowerCase());
    expect(text).toContain('không có thời gian');
    expect(text).toContain('thèm ăn vặt');
    expect(text).toContain('vài tháng');
    expect(text).not.toMatch(/\[(name|goal|challenges|duration)\]/);
  });

  it('falls back to generic name when name skipped', () => {
    const text = buildReflection({ fitness_goal: 'bulk' });
    expect(text.startsWith('Bạn')).toBe(true);
  });
});
