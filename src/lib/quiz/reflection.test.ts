import { describe, it, expect } from 'vitest';
import { getGreetingName, reflectionHeadline, reflectionRows, reflectionSummary } from './reflection';
import { vi, en } from '../copy';

describe('reflectionHeadline', () => {
  it('puts the name in front of the motivation phrase', () => {
    expect(reflectionHeadline({ name: 'Sam', motivation: 'energy' }, en)).toBe('Sam, here’s your path to more energy');
    expect(reflectionHeadline({ name: ' Anh ', motivation: 'energy' }, vi)).toBe(
      'Anh, đây là lộ trình để bạn có nhiều năng lượng hơn',
    );
  });

  it('capitalises the phrase when the name is skipped', () => {
    expect(reflectionHeadline({ motivation: 'clarity' }, en)).toBe('Here’s your path to knowing what to eat');
    expect(reflectionHeadline({ name: '  ', motivation: 'health' }, vi)).toBe('Đây là lộ trình để bạn khỏe mạnh hơn');
  });

  it('uses the fallback phrase when motivation is missing', () => {
    expect(reflectionHeadline({ name: 'Sam' }, en)).toBe('Sam, here’s how your plan fits your life');
    expect(reflectionHeadline({}, en)).toBe('Here’s how your plan fits your life');
    expect(reflectionHeadline({}, vi)).toBe('Đây là cách kế hoạch hợp với nhịp sống của bạn');
  });
});

describe('reflectionRows', () => {
  it('keeps the order the challenges were picked in', () => {
    expect(reflectionRows({ pain_points: ['cravings', 'no_time'] }, en)).toEqual([
      { key: 'cravings', label: 'Snack cravings', fix: 'A daily protein target that helps you stay full' },
      { key: 'no_time', label: 'No time', fix: 'Log meals with a photo in seconds' },
    ]);
  });

  it('shows at most three rows', () => {
    const rows = reflectionRows({ pain_points: ['no_time', 'cravings', 'confusion', 'stress_eating'] }, vi);
    expect(rows.map((row) => row.key)).toEqual(['no_time', 'cravings', 'confusion']);
    expect(rows[0]).toEqual({ key: 'no_time', label: 'Không có thời gian', fix: 'Ghi bữa ăn bằng ảnh, chỉ mất vài giây' });
  });

  it('skips unknown keys before applying the cap', () => {
    const rows = reflectionRows({ pain_points: ['bogus', 'no_time', 'toString', 'cravings', 'slow_progress', 'confusion'] }, en);
    expect(rows.map((row) => row.key)).toEqual(['no_time', 'cravings', 'slow_progress']);
  });

  it('returns no rows when nothing was picked', () => {
    expect(reflectionRows({}, en)).toEqual([]);
    expect(reflectionRows({ pain_points: ['bogus'] }, vi)).toEqual([]);
  });

  it('has a fix for every challenge option in both locales', () => {
    for (const copy of [vi, en]) {
      for (const option of copy.challenges.options) {
        expect(reflectionRows({ pain_points: [option.key] }, copy)).toHaveLength(1);
      }
    }
  });
});

describe('getGreetingName', () => {
  it('uses a friendly lowercase greeting fallback when name is skipped', () => {
    expect(getGreetingName(undefined, vi)).toBe('bạn');
    expect(getGreetingName('  ', vi)).toBe('bạn');
    expect(getGreetingName(undefined, en)).toBe('friend');
  });
});

describe('reflectionSummary', () => {
  it('reads back the goal, the first challenge and the reason in the active language', () => {
    expect(reflectionSummary({ name: ' Alex ', fitness_goal: 'cut', pain_points: ['slow_progress', 'no_time'], motivation: 'confidence' }, vi)).toEqual({
      name: 'Alex',
      goal: 'Giảm cân',
      challenge: 'Tiến độ chậm',
      reason: 'Tự tin hơn với cơ thể',
    });
  });

  it('never leaves a tile empty when an answer is missing or stale', () => {
    expect(reflectionSummary({ pain_points: ['gone'] }, vi)).toEqual({
      name: vi.reflection.fallbackName,
      goal: vi.reflection.summary.goalFallback,
      challenge: vi.reflection.summary.challengeFallback,
      reason: vi.reflection.summary.reasonFallback,
    });
  });
});
