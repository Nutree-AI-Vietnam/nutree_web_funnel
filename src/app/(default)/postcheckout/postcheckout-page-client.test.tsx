/** @vitest-environment jsdom */

import { act, cleanup, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEY, useQuizStore } from '@/lib/quiz/store';
import { PostcheckoutPageClient } from './postcheckout-page-client';

vi.mock('@/lib/api/client', () => ({
  correlateRevenueCatCustomer: vi.fn(),
}));

const desktop = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36';

function persisted(locale: 'en' | 'vi', countryCode = 'VN') {
  return JSON.stringify({
    state: {
      funnelScreen: 'paywall',
      currentStep: 'goal',
      data: { measurement_unit: 'metric' },
      planAnswers: {},
      locale,
      units: 'metric',
      countryCode,
      tdee: null,
      tdeeSource: null,
      lead: null,
    },
    version: 16,
  });
}

describe('post-checkout QR presentation', () => {
  beforeEach(async () => {
    sessionStorage.clear();
    Object.defineProperty(navigator, 'userAgent', { configurable: true, value: desktop });
    await useQuizStore.persist.rehydrate();
    useQuizStore.getState().reset();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('server HTML has no QR image', () => {
    const html = renderToString(<PostcheckoutPageClient />);
    expect(html).not.toContain('data-testid="app-handoff-qr"');
    expect(html).not.toContain('<svg');
    expect(html).toContain('App Store');
    expect(html).toContain('Google Play');
  });

  it('keeps the QR off English after hydration, reload, and a locale toggle, even in Vietnam', async () => {
    sessionStorage.setItem(STORAGE_KEY, persisted('en', 'VN'));
    await useQuizStore.persist.rehydrate();

    const html = renderToString(<PostcheckoutPageClient />);
    const container = document.createElement('div');
    document.body.appendChild(container);
    container.innerHTML = html;
    let root: ReturnType<typeof hydrateRoot> | undefined;
    await act(async () => {
      root = hydrateRoot(container, <PostcheckoutPageClient />);
    });
    expect(container.querySelector('[data-testid="app-handoff-qr"]')).toBeNull();
    expect(container.textContent).toContain('App Store');
    expect(container.textContent).toContain('Google Play');
    expect(container.textContent).not.toContain('VietQR');

    cleanup();
    root?.unmount();
    container.remove();

    useQuizStore.getState().setLocale('vi');
    render(<PostcheckoutPageClient />);
    expect(await screen.findByTestId('app-handoff-qr')).toBeTruthy();
    expect(screen.getByText('Đang dùng máy tính? Quét mã để tiếp tục trên điện thoại')).toBeTruthy();

    act(() => {
      useQuizStore.getState().setLocale('en');
    });
    expect(screen.queryByTestId('app-handoff-qr')).toBeNull();
    expect(screen.queryByText(/VietQR|Quét mã|QR code/)).toBeNull();
    expect(screen.getByRole('link', { name: 'App Store' }).getAttribute('href')).toBe('https://apps.apple.com/app/id6751159552');
    expect(screen.getByRole('link', { name: 'Google Play' }).getAttribute('href')).toBe(
      'https://play.google.com/store/apps/details?id=com.nutreeai.mobile',
    );
  });

  it('still shows the desktop QR for Vietnamese after hydration', async () => {
    sessionStorage.setItem(STORAGE_KEY, persisted('vi', 'US'));
    await useQuizStore.persist.rehydrate();
    render(<PostcheckoutPageClient />);
    expect(await screen.findByTestId('app-handoff-qr')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'App Store' })).toBeTruthy();
  });
});
