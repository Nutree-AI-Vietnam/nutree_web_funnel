import { describe, expect, it } from 'vitest';
import { isMetricValueValid, normalizeMetricDraft, parseMetricDraft } from './metric-input';

describe('metric input helpers', () => {
  it('normalizes Vietnamese decimal comma input', () => {
    expect(normalizeMetricDraft(' 72,5 ')).toBe('72.5');
    expect(parseMetricDraft('72,5')).toBe(72.5);
  });

  it('rejects empty or malformed values instead of coercing them to zero', () => {
    expect(parseMetricDraft('')).toBeNull();
    expect(parseMetricDraft('abc')).toBeNull();
    expect(isMetricValueValid('', 30, 250)).toBe(false);
  });

  it('validates inclusive metric ranges', () => {
    expect(isMetricValueValid('30', 30, 250)).toBe(true);
    expect(isMetricValueValid('250', 30, 250)).toBe(true);
    expect(isMetricValueValid('29.9', 30, 250)).toBe(false);
    expect(isMetricValueValid('250.1', 30, 250)).toBe(false);
  });
});
