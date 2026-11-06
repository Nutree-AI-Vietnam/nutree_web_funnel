/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RouteLocaleProvider } from '@/lib/copy/use-copy';
import { useQuizStore } from '@/lib/quiz/store';
import { OptionalCookieConsent } from './optional-cookie-consent';

vi.mock('next/navigation', () => ({ usePathname: () => '/survey/en' }));
vi.mock('next/script', () => ({
  default: ({ id, children }: { id?: string; children?: string }) => <script id={id}>{children}</script>,
}));

describe('optional cookie banner', () => {
  beforeEach(() => {
    useQuizStore.setState({ locale: 'en' });
  });
  afterEach(() => {
    cleanup();
    localStorage.clear();
    document.cookie = 'nutree_optional_cookies=; Path=/; Max-Age=0';
  });

  it('shows equal allow and reject actions and loads no pixel before a choice', () => {
    render(<RouteLocaleProvider locale="en"><OptionalCookieConsent pixelId="863565810110494" /></RouteLocaleProvider>);
    const reject = screen.getByRole('button', { name: 'Allow optional cookies' }).compareDocumentPosition(
      screen.getByRole('button', { name: 'Reject optional cookies' }),
    );
    expect(reject).not.toBe(0);
    expect(screen.getByRole('button', { name: 'Reject optional cookies' }).className).toContain('min-h-12');
    expect(screen.getByRole('button', { name: 'Allow optional cookies' }).className).toContain('min-h-12');
    expect(document.getElementById('meta-pixel')).toBeNull();
    expect(document.getElementById('ga4')).toBeNull();
    expect(document.getElementById('tiktok-pixel')).toBeNull();
  });

  it('reject then reload state still does not mount the pixel', () => {
    render(<RouteLocaleProvider locale="en"><OptionalCookieConsent pixelId="863565810110494" /></RouteLocaleProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Reject optional cookies' }));
    cleanup();
    render(<RouteLocaleProvider locale="en"><OptionalCookieConsent pixelId="863565810110494" /></RouteLocaleProvider>);
    expect(document.getElementById('meta-pixel')).toBeNull();
    expect(screen.getByRole('button', { name: 'Cookie choices' })).toBeTruthy();
  });

  it('accept mounts one pixel and does not mount a second copy', () => {
    render(<RouteLocaleProvider locale="en"><OptionalCookieConsent pixelId="863565810110494" /></RouteLocaleProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Allow optional cookies' }));
    expect(document.querySelectorAll('#meta-pixel')).toHaveLength(1);
    expect(document.getElementById('meta-pixel')?.textContent).toContain("fbq('init','863565810110494'");
  });

  it('withdrawal after allow removes the pixel and reloads', () => {
    const reload = vi.fn();
    vi.stubGlobal('location', { reload, protocol: 'https:', href: 'https://quiz.nutreeai.com/survey/en' });
    render(<RouteLocaleProvider locale="en"><OptionalCookieConsent pixelId="863565810110494" /></RouteLocaleProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Allow optional cookies' }));
    expect(document.getElementById('meta-pixel')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cookie choices' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reject optional cookies' }));
    expect(reload).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('nutree_optional_cookies_v1')).toBe('1.denied');
    expect(document.cookie).toContain('nutree_optional_cookies=1.denied');
    expect(document.getElementById('meta-pixel')).toBeNull();
    vi.unstubAllGlobals();
  });
});
