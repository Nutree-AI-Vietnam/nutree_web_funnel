import { describe, expect, it } from 'vitest';
import { en } from '@/lib/copy/en';
import { vi } from '@/lib/copy/vi';
import { optionalConsentCopy } from '@/lib/copy/optional-consent-copy';
import { viFlowStrings } from '@/lib/quiz/vi-survey';

const UNSUPPORTED = [/#\s*1\b/, /95\s*%/, /3000\s*\+/, /3[,.]000\s*\+/];

function strings(value: unknown, found: string[] = []): string[] {
  if (typeof value === 'string') found.push(value);
  else if (Array.isArray(value)) value.forEach((item) => strings(item, found));
  else if (value && typeof value === 'object') Object.values(value).forEach((item) => strings(item, found));
  return found;
}

describe('unsupported marketing claims', () => {
  it('does not show #1, 95%, or 3000+ in quiz copy', () => {
    const shown = [...strings(en), ...strings(vi), ...viFlowStrings(), ...strings(optionalConsentCopy)];
    for (const text of shown) {
      for (const pattern of UNSUPPORTED) expect(text, `${pattern} matched ${text}`).not.toMatch(pattern);
    }
  });

  it('puts the variable-results disclaimer next to the quote copy, without a new statistic', () => {
    expect(optionalConsentCopy.en.disclaimer).toBe('Results vary. AI nutrition estimates are not medical advice.');
    expect(optionalConsentCopy.vi.disclaimer).toBe('Kết quả có thể khác nhau. Ước tính dinh dưỡng bằng AI không phải tư vấn y khoa.');
    for (const pattern of UNSUPPORTED) {
      expect(optionalConsentCopy.en.disclaimer).not.toMatch(pattern);
      expect(optionalConsentCopy.vi.disclaimer).not.toMatch(pattern);
    }
  });
});
