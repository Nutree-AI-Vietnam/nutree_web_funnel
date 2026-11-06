/**
 * @vitest-environment jsdom
 * @vitest-environment-options {"url":"https://quiz.nutreeai.com/survey/en"}
 */

import { cleanup, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RouteLocaleProvider } from '@/lib/copy/use-copy';
import { STORAGE_KEY, useQuizStore } from '@/lib/quiz/store';
import { PaywallPageClient } from '@/app/(default)/paywall/paywall-page-client';
import { SurveyPageClient } from './survey-page-client';

vi.mock('next/image', () => ({
  default: ({ alt }: { alt?: string }) => <span role="img" aria-label={alt || undefined} />,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => '/survey/en',
  useSearchParams: () => new URLSearchParams(),
}));

function persisted(locale: 'en' | 'vi', screenName: 'quiz' | 'paywall') {
  return JSON.stringify({
    state: {
      funnelScreen: screenName,
      currentStep: 'goal',
      data: { measurement_unit: 'metric', fitness_goal: 'cut' },
      planAnswers: {},
      locale,
      units: 'metric',
      countryCode: 'VN',
      tdee: null,
      tdeeSource: null,
      lead: screenName === 'paywall'
        ? { lead_id: 'lead-en', masked_email: 'a***@nutree.ai', status: 'payment_pending' }
        : null,
    },
    version: 16,
  });
}

describe('explicit English survey entry', () => {
  beforeEach(async () => {
    sessionStorage.clear();
    window.scrollTo = () => undefined;
    window.matchMedia = () => ({ matches: true, media: '', onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false });
    class ResizeObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    class IntersectionObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() { return []; }
    }
    vi.stubGlobal('ResizeObserver', ResizeObserverStub);
    vi.stubGlobal('IntersectionObserver', IntersectionObserverStub);
    sessionStorage.setItem('nutree.paywall.welcome-voucher-claimed.v1', '1');
    await useQuizStore.persist.rehydrate();
    useQuizStore.getState().reset();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('paints English from /survey/en and replaces a stored Vietnamese locale', async () => {
    sessionStorage.setItem(STORAGE_KEY, persisted('vi', 'quiz'));
    await useQuizStore.persist.rehydrate();
    expect(useQuizStore.getState().locale).toBe('vi');

    const html = renderToString(<SurveyPageClient language="en" countryCode="VN" />);
    expect(html).toContain('How much weight do you want to lose?');
    expect(html).not.toContain('VietQR');
    expect(html).not.toContain('Quét mã');

    render(<SurveyPageClient language="en" countryCode="VN" />);
    expect(await screen.findByRole('heading', { name: 'How much weight do you want to lose?' })).toBeTruthy();
    expect(useQuizStore.getState().locale).toBe('en');
    expect(useQuizStore.getState().countryCode).toBe('VN');
    expect(screen.queryByText(/VietQR|Quét mã|QR code/)).toBeNull();
  });

  it('shows the existing Paddle paywall, not a QR, when /survey/en opens a stored Vietnamese paywall', async () => {
    sessionStorage.setItem(STORAGE_KEY, persisted('vi', 'paywall'));
    await useQuizStore.persist.rehydrate();

    render(<SurveyPageClient language="en" countryCode="VN" />);

    expect(await screen.findByText('Payments are processed securely by Paddle.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'App Store' }).getAttribute('href')).toBe('https://apps.apple.com/app/id6751159552');
    expect(screen.getByRole('link', { name: 'Google Play' }).getAttribute('href')).toBe(
      'https://play.google.com/store/apps/details?id=com.nutreeai.mobile',
    );
    expect(screen.queryByText(/VietQR|Quét mã|QR code/)).toBeNull();
    expect(document.querySelector('[data-testid="app-handoff-qr"]')).toBeNull();
    expect(useQuizStore.getState().locale).toBe('en');
    expect(useQuizStore.getState().countryCode).toBe('VN');
  });

  it('keeps a Vietnamese survey on the Vietnamese purchase surface', async () => {
    sessionStorage.setItem(STORAGE_KEY, persisted('vi', 'paywall'));
    await useQuizStore.persist.rehydrate();

    render(
      <RouteLocaleProvider locale="vi">
        <PaywallPageClient initialCountryCode="VN" />
      </RouteLocaleProvider>,
    );

    expect(await screen.findAllByRole('button', { name: 'Chọn gói của tôi' })).toHaveLength(2);
    expect(document.body.textContent).toContain('Thanh toán an toàn');
    expect(screen.queryByRole('link', { name: 'App Store' })).toBeNull();
    expect(screen.queryByText(/VietQR|Quét mã/)).toBeNull();
    expect(useQuizStore.getState().locale).toBe('vi');
  });
});
