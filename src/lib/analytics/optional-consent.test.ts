import { describe, expect, it, vi } from 'vitest';
import {
  hasOptionalConsent,
  hasOptionalConsentCookie,
  parseOptionalConsent,
  stripHealthFields,
  writeOptionalConsent,
} from './optional-consent';

describe('optional consent', () => {
  it('denies when the choice is missing, old, or rejected', () => {
    expect(parseOptionalConsent(null)).toBeNull();
    expect(parseOptionalConsent('granted')).toBeNull();
    expect(parseOptionalConsent('0.granted')).toBeNull();
    expect(parseOptionalConsent('1.denied')).toBe('denied');
    expect(hasOptionalConsentCookie('1.granted')).toBe(true);
    expect(hasOptionalConsentCookie('1.denied')).toBe(false);
    expect(hasOptionalConsentCookie(undefined)).toBe(false);
  });

  it('persists a versioned grant and does not treat a later read as a queue', () => {
    const store = new Map<string, string>();
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => { store.set(key, value); },
      },
      dispatchEvent: () => true,
    });
    vi.stubGlobal('document', { cookie: '' });
    writeOptionalConsent('granted');
    expect(hasOptionalConsent()).toBe(true);
    writeOptionalConsent('denied');
    expect(hasOptionalConsent()).toBe(false);
    vi.unstubAllGlobals();
  });

  it('removes health questionnaire values from outbound analytics', () => {
    expect(stripHealthFields({
      step: 'weight',
      weight_kg: 70,
      height_cm: 165,
      target_weight_kg: 60,
      fitness_goal: 'cut',
      plan: '12-week',
    })).toEqual({ step: 'weight', plan: '12-week' });
  });
});
