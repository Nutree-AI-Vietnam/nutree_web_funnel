import { describe, expect, it } from 'vitest';
import { formatWeight } from './units';

describe('formatWeight', () => {
  it('writes kilograms with the locale decimal mark', () => {
    expect(formatWeight(70.3, 'metric', 'vi')).toBe('70,3\u00A0kg');
    expect(formatWeight(70.3, 'metric', 'en')).toBe('70.3\u00A0kg');
    expect(formatWeight(81.64, 'metric', 'vi')).toBe('81,6\u00A0kg');
    expect(formatWeight(0.5, 'metric', 'vi')).toBe('0,5\u00A0kg');
  });

  it('drops a zero decimal and defaults to English', () => {
    expect(formatWeight(70, 'metric', 'vi')).toBe('70\u00A0kg');
    expect(formatWeight(70.3, 'metric')).toBe('70.3\u00A0kg');
  });

  it('keeps pounds whole in either locale', () => {
    expect(formatWeight(70.3, 'imperial', 'en')).toBe('155\u00A0lb');
    expect(formatWeight(70.3, 'imperial', 'vi')).toBe('155\u00A0lb');
  });
});
