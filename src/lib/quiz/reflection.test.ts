import { describe, it, expect } from 'vitest';
import { buildReflection, getGreetingName } from './reflection';
import { vi, en } from '../copy';

describe('buildReflection', () => {
  it('interpolates the name and leaves no placeholders', () => {
    const text = buildReflection(
      {
        name: 'Anh',
        fitness_goal: 'cut',
        pain_points: ['no_time', 'cravings'],
        challenge_duration: 'few_months',
      },
      vi,
    );
    expect(text).toContain('Anh');
    expect(text).not.toMatch(/\[(name|goal|challenges|duration)\]/);
  });

  it('falls back to the locale name when name is skipped', () => {
    expect(buildReflection({ fitness_goal: 'bulk' }, vi).startsWith('Bạn')).toBe(true);
    expect(buildReflection({ fitness_goal: 'bulk' }, en).startsWith('friend')).toBe(true);
  });

  it('uses a friendly lowercase greeting fallback when name is skipped', () => {
    expect(getGreetingName(undefined, vi)).toBe('bạn');
    expect(getGreetingName('  ', vi)).toBe('bạn');
    expect(getGreetingName(undefined, en)).toBe('friend');
  });
});
