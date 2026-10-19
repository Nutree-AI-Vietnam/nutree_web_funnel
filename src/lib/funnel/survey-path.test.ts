import { describe, expect, it } from 'vitest';
import { surveyPathWithSearch } from './survey-path';

describe('surveyPathWithSearch', () => {
  it('returns the bare survey path when there is no query string', () => {
    expect(surveyPathWithSearch('vi')).toBe('/survey/vi');
    expect(surveyPathWithSearch('en', {})).toBe('/survey/en');
  });

  it('forwards campaign parameters onto the survey path', () => {
    expect(
      surveyPathWithSearch('en', { utm_source: 'nutree_website', utm_medium: 'owned', utm_content: 'home_hero' }),
    ).toBe('/survey/en?utm_source=nutree_website&utm_medium=owned&utm_content=home_hero');
  });

  it('keeps repeated keys, skips undefined values, and encodes reserved characters', () => {
    expect(surveyPathWithSearch('vi', { utm_campaign: ['a', 'b'], utm_term: undefined, fbclid: 'x y&z' })).toBe(
      '/survey/vi?utm_campaign=a&utm_campaign=b&fbclid=x+y%26z',
    );
  });
});
