/** @vitest-environment jsdom */

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HomePage from './page';
import { STORAGE_KEY, useQuizStore } from '@/lib/quiz/store';

vi.mock('next/image', () => ({
  default: ({ alt }: { alt?: string }) => <span role="img" aria-label={alt || undefined} />,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

const ENTRY_URL = '/?utm_source=meta&utm_medium=paid&utm_campaign=spring&ref=homepage';

function viewContentCalls() {
  const fbq = (window as unknown as { fbq: ReturnType<typeof vi.fn> }).fbq;
  return fbq.mock.calls.filter(([method, event]) => method === 'track' && event === 'ViewContent');
}

function metaServerEvents() {
  return (fetch as ReturnType<typeof vi.fn>).mock.calls
    .filter(([url]) => url === '/api/meta/events')
    .map(([, init]) => JSON.parse(init.body as string));
}

describe('home quiz entry', () => {
  beforeEach(async () => {
    if (!('ResizeObserver' in globalThis)) {
      class ResizeObserverStub {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
      vi.stubGlobal('ResizeObserver', ResizeObserverStub);
    }
    window.scrollTo = () => undefined;
    window.history.replaceState(null, '', ENTRY_URL);
    sessionStorage.clear();
    localStorage.clear();
    vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID', '1234567890');
    vi.stubEnv('NEXT_PUBLIC_TIKTOK_PIXEL_ID', '');
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(null, { status: 204 }))));
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('test-event-id');
    Object.assign(window, { fbq: vi.fn(), gtag: vi.fn() });
    await useQuizStore.persist.rehydrate();
    useQuizStore.getState().reset();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('opens the goal step with attribution, one ViewContent, and the terms notice', async () => {
    useQuizStore.getState().setData({ fitness_goal: 'cut' });
    useQuizStore.getState().setFunnelScreen('landing');
    sessionStorage.setItem('quiz:lastIndex', '4');

    render(<HomePage />);

    expect(await screen.findByRole('heading', { name: 'Mục tiêu chính của bạn là gì?' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Xây kế hoạch của tôi' })).toBeNull();
    expect(screen.queryByRole('heading', { name: /Chào bạn, cảm ơn bạn đã quan tâm/ })).toBeNull();

    const params = new URLSearchParams(window.location.search);
    expect(window.location.pathname).toBe('/');
    expect(params.get('utm_source')).toBe('meta');
    expect(params.get('utm_medium')).toBe('paid');
    expect(params.get('utm_campaign')).toBe('spring');
    expect(params.get('ref')).toBeNull();

    expect(JSON.parse(sessionStorage.getItem('nutree_attribution_v1')!)).toMatchObject({
      utm_source: 'meta',
      utm_medium: 'paid',
      utm_campaign: 'spring',
    });
    expect(sessionStorage.getItem('quiz:lastIndex')).toBeNull();
    expect(useQuizStore.getState().funnelScreen).toBe('quiz');
    expect(useQuizStore.getState().currentStep).toBe('goal');
    expect(useQuizStore.getState().data.fitness_goal).toBeUndefined();

    const terms = screen.getByRole('link', { name: 'Điều khoản' });
    const privacy = screen.getByRole('link', { name: 'Chính sách bảo mật' });
    expect(terms.getAttribute('href')).toBe('https://nutreeai.com/terms');
    expect(privacy.getAttribute('href')).toBe('https://nutreeai.com/privacy');
    expect(terms.closest('p')?.textContent).toBe('Khi tiếp tục, bạn đồng ý với Điều khoản và Chính sách bảo mật của Nutree.');

    await waitFor(() => expect(viewContentCalls()).toHaveLength(1));
    expect(viewContentCalls()[0]).toEqual([
      'track',
      'ViewContent',
      { content_name: 'funnel_quiz_start', content_category: 'onboarding' },
      { eventID: 'ViewContent.test-event-id' },
    ]);
    const gtag = (window as unknown as { gtag: ReturnType<typeof vi.fn> }).gtag;
    expect(gtag).toHaveBeenCalledWith('event', 'funnel_step_viewed', {
      utm_source: 'meta',
      utm_medium: 'paid',
      utm_campaign: 'spring',
      step: 'goal',
    });
    expect(gtag.mock.calls.some(([, , params]) => params?.step === 'landing')).toBe(false);

    await waitFor(() => expect(metaServerEvents()).toHaveLength(1));
    expect(metaServerEvents()[0]).toMatchObject({
      event_name: 'ViewContent',
      event_id: 'ViewContent.test-event-id',
      custom_data: { content_name: 'funnel_quiz_start', content_category: 'onboarding' },
    });

    cleanup();
    render(<HomePage />);
    expect(await screen.findByRole('heading', { name: 'Mục tiêu chính của bạn là gì?' })).toBeTruthy();
    expect(viewContentCalls()).toHaveLength(1);
    expect(metaServerEvents()).toHaveLength(1);
  });

  it('keeps an in-progress quiz instead of returning to the landing page', async () => {
    useQuizStore.getState().reset();
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY)!);
    saved.state = {
      ...saved.state,
      funnelScreen: 'quiz',
      currentStep: 'activity_level',
      data: { measurement_unit: 'metric', fitness_goal: 'cut' },
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    await useQuizStore.persist.rehydrate();

    render(<HomePage />);

    expect(await screen.findByRole('heading', { name: 'Mức độ hoạt động hàng ngày của bạn?' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Xây kế hoạch của tôi' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Điều khoản' })).toBeNull();
    expect(useQuizStore.getState().data.fitness_goal).toBe('cut');
    expect(viewContentCalls()).toHaveLength(0);
  });
});
