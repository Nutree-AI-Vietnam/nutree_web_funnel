/**
 * @vitest-environment jsdom
 * @vitest-environment-options {"url":"https://quiz.nutreeai.com/"}
 */

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HomePage from './page';
import { STORAGE_KEY, useQuizStore } from '@/lib/quiz/store';

const BCT_HREF = 'https://online.gov.vn/nen-tang/8827acb5-d544-4881-8984-e67248f540d3';

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

function viewedSteps() {
  const gtag = (window as unknown as { gtag: ReturnType<typeof vi.fn> }).gtag;
  return gtag.mock.calls
    .filter(([method, event]) => method === 'event' && event === 'funnel_step_viewed')
    .map(([, , params]) => params?.step as string);
}

async function hydrateHome(html: string) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  container.innerHTML = html;
  const recoverable: unknown[] = [];
  let root: ReturnType<typeof hydrateRoot> | undefined;
  await act(async () => {
    root = hydrateRoot(container, <HomePage />, {
      onRecoverableError(error) {
        recoverable.push(error);
      },
    });
  });
  return {
    container,
    recoverable,
    async unmount() {
      await act(async () => {
        root?.unmount();
      });
      container.remove();
    },
  };
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
    // The rating stars on the goal step reveal when in view.
    if (!('IntersectionObserver' in globalThis)) {
      class IntersectionObserverStub {
        observe() {}
        unobserve() {}
        disconnect() {}
        takeRecords() {
          return [];
        }
      }
      vi.stubGlobal('IntersectionObserver', IntersectionObserverStub);
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

    expect(screen.queryByRole('button', { name: 'Quay lại' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Tiếng Việt' })).toBeTruthy();
    expect(screen.getByRole('img', { name: '4.7/5 trên App Store. 40.000+ khách hàng đã chọn Nutree' })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Bộ Công Thương/ }).getAttribute('href')).toBe(BCT_HREF);

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

    fireEvent.click(screen.getByRole('button', { name: /^Giảm cân/ }));
    expect(await screen.findByRole('heading', { name: 'Tên bạn là gì?' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Quay lại' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Tiếng Việt' })).toBeNull();
    expect(screen.queryByRole('link', { name: /Bộ Công Thương/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Quay lại' }));
    expect(await screen.findByRole('heading', { name: 'Mục tiêu chính của bạn là gì?' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Quay lại' })).toBeNull();
    expect(screen.getByRole('link', { name: /Bộ Công Thương/ })).toBeTruthy();

    cleanup();
    render(<HomePage />);
    expect(await screen.findByRole('heading', { name: 'Mục tiêu chính của bạn là gì?' })).toBeTruthy();
    expect(viewContentCalls()).toHaveLength(1);
    expect(metaServerEvents()).toHaveLength(1);
  });

  it('server-renders the goal step, without the back arrow, with the badge and language switcher', () => {
    useQuizStore.getState().setFunnelScreen('quiz');
    useQuizStore.getState().setCurrentStep('activity_level');
    useQuizStore.getState().setData({ fitness_goal: 'cut' });

    const html = renderToString(<HomePage />);

    expect(html).toContain('Mục tiêu chính của bạn là gì?');
    expect(html).toContain('Giảm cân');
    expect(html).toContain('Khi tiếp tục, bạn đồng ý với');
    expect(html).toContain('Tiếng Việt');
    expect(html).toContain(BCT_HREF);
    expect(html).not.toContain('Mức độ hoạt động hàng ngày của bạn?');
    expect(html).not.toContain('Quay lại');
    expect(html).not.toContain('Xây kế hoạch của tôi');
    expect(html).not.toContain('aria-pressed="true"');
  });

  it('hydrates the server goal step without a mismatch', async () => {
    useQuizStore.getState().setFunnelScreen('quiz');
    useQuizStore.getState().setCurrentStep('activity_level');
    const html = renderToString(<HomePage />);
    const hydrated = await hydrateHome(html);

    expect(hydrated.recoverable).toEqual([]);
    expect(hydrated.container.textContent).toContain('Mức độ hoạt động hàng ngày của bạn?');
    await hydrated.unmount();
  });

  it('fires the goal view once after a fresh session hydrates', async () => {
    const html = renderToString(<HomePage />);
    const hydrated = await hydrateHome(html);

    expect(hydrated.recoverable).toEqual([]);
    expect(hydrated.container.textContent).toContain('Mục tiêu chính của bạn là gì?');
    expect(viewedSteps()).toEqual(['goal']);
    expect(viewContentCalls()).toHaveLength(1);
    expect(viewContentCalls()[0]).toEqual([
      'track',
      'ViewContent',
      { content_name: 'funnel_quiz_start', content_category: 'onboarding' },
      { eventID: 'ViewContent.test-event-id' },
    ]);
    expect(metaServerEvents()).toHaveLength(1);

    await act(async () => {});
    expect(viewedSteps()).toEqual(['goal']);
    expect(viewContentCalls()).toHaveLength(1);
    await hydrated.unmount();
  });

  it('fires only the restored step when a later session hydrates', async () => {
    useQuizStore.getState().setFunnelScreen('quiz');
    useQuizStore.getState().setCurrentStep('activity_level');
    useQuizStore.getState().setData({ fitness_goal: 'cut' });
    const html = renderToString(<HomePage />);
    expect(html).toContain('Mục tiêu chính của bạn là gì?');

    const hydrated = await hydrateHome(html);

    expect(hydrated.recoverable).toEqual([]);
    expect(hydrated.container.textContent).toContain('Mức độ hoạt động hàng ngày của bạn?');
    expect(hydrated.container.textContent).not.toContain('Mục tiêu chính của bạn là gì?');
    expect(viewedSteps()).toEqual(['activity_level']);
    expect(viewedSteps()).not.toContain('goal');
    expect(viewContentCalls()).toHaveLength(0);
    expect(metaServerEvents()).toHaveLength(0);
    expect(useQuizStore.getState().data.fitness_goal).toBe('cut');
    await hydrated.unmount();
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
    expect(screen.queryByRole('button', { name: 'Tiếng Việt' })).toBeNull();
    expect(screen.queryByRole('link', { name: /Bộ Công Thương/ })).toBeNull();
    expect(useQuizStore.getState().data.fitness_goal).toBe('cut');
    expect(viewContentCalls()).toHaveLength(0);
  });
});
