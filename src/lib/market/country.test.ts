import { describe, expect, it } from 'vitest';
import { browserListsVietnamese, localeForVisitor } from './country';

describe('browserListsVietnamese', () => {
  it('finds Vietnamese anywhere in the list, but not when it is refused', () => {
    expect(browserListsVietnamese('vi-VN,vi;q=0.9,en;q=0.8')).toBe(true);
    expect(browserListsVietnamese('en-US,en;q=0.9,vi;q=0.7')).toBe(true);
    expect(browserListsVietnamese('en-US,en;q=0.9,vi;q=0')).toBe(false);
    expect(browserListsVietnamese('en-US,en;q=0.9')).toBe(false);
    expect(browserListsVietnamese(null)).toBe(false);
  });
});

describe('localeForVisitor', () => {
  it('keeps Vietnam in Vietnamese, where prices are in dong', () => {
    expect(localeForVisitor('VN', 'en-US,en;q=0.9')).toBe('vi');
  });

  it('follows the browser elsewhere and when the country is unknown', () => {
    expect(localeForVisitor('US', 'en-US,en;q=0.9')).toBe('en');
    expect(localeForVisitor('AU', 'vi,en;q=0.8')).toBe('vi');
    expect(localeForVisitor(null, 'en-GB')).toBe('en');
    expect(localeForVisitor('XX', 'vi-VN')).toBe('vi');
  });
});
