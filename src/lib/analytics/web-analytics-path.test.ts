import { describe, expect, it } from 'vitest';
import { surveyAnalyticsPath } from './web-analytics-path';

describe('surveyAnalyticsPath', () => {
  it('keeps the landing screen on the real survey URL', () => {
    expect(surveyAnalyticsPath('/survey/vi', 'landing', 'goal')).toBe('/survey/vi');
  });

  it('gives each later screen its own path', () => {
    expect(surveyAnalyticsPath('/survey/en/', 'quiz', 'weight')).toBe('/survey/en/weight');
    expect(surveyAnalyticsPath('/survey/vi', 'paywall', 'goal')).toBe('/survey/vi/paywall');
  });

  it('leaves real route changes to the automatic pageview', () => {
    expect(surveyAnalyticsPath('/postcheckout', 'paywall', 'goal')).toBeNull();
  });
});
