/**
 * @vitest-environment jsdom
 * @vitest-environment-options {"url":"https://quiz.nutreeai.com/"}
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QuizShell } from '@/components/quiz-shell';
import { useQuizStore } from '@/lib/quiz/store';
import { VI_QUIZ_STEPS, VALUE_TOUR_STEPS } from '@/lib/quiz/steps';
import { CalculatingStep } from './calculating';
import { InsightStep } from './insight-step';
import { TdeeTargetsStep } from './tdee-targets';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
}));

vi.mock('next/image', () => ({
  default: ({ alt }: { alt?: string }) => <span role="img" aria-label={alt || undefined} />,
}));

describe('Vietnamese survey screens', () => {
  beforeEach(async () => {
    window.matchMedia = () => ({ matches: true, media: '', onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false });
    class ResizeObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', ResizeObserverStub);
    class IntersectionObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() { return []; }
    }
    vi.stubGlobal('IntersectionObserver', IntersectionObserverStub);
    window.scrollTo = () => undefined;
    sessionStorage.clear();
    Object.assign(window, { gtag: vi.fn(), fbq: vi.fn() });
    await useQuizStore.persist.rehydrate();
    useQuizStore.getState().reset();
    useQuizStore.getState().setLocale('vi');
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders an insight screen and continues to the next question', () => {
    render(<InsightStep step="insight_pace" />);
    expect(screen.getByRole('heading', { name: 'Đi đều sẽ dễ giữ hơn là siết mạnh' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Mình hiểu rồi' }));
    expect(useQuizStore.getState().currentStep).toBe('height');
  });

  it('personalizes the obstacle lesson from the saved answer', () => {
    useQuizStore.getState().setPlanAnswers({ answers: { obstacle: 'time' } });
    render(<InsightStep step="insight_obstacle" />);
    expect(screen.getByRole('heading', { name: 'Chỗ đó có đường vòng, không cần thắng nó' })).toBeTruthy();
    expect(screen.getByText(/Chụp một ảnh nhanh hơn/)).toBeTruthy();
  });

  it('fires funnel_step_viewed for a new insight id and shows the chapter bar', () => {
    render(
      <QuizShell step="insight_pace">
        <p>lesson</p>
      </QuizShell>,
    );
    const gtag = (window as unknown as { gtag: ReturnType<typeof vi.fn> }).gtag;
    expect(gtag).toHaveBeenCalledWith('event', 'funnel_step_viewed', expect.objectContaining({ step: 'insight_pace' }));
    const bar = screen.getByRole('progressbar', { name: 'Tiến độ của bạn' });
    expect(bar.getAttribute('aria-valuemax')).toBe(String(VI_QUIZ_STEPS.length + VALUE_TOUR_STEPS.length));
    expect(screen.getByText('Về bạn')).toBeTruthy();
    expect(screen.queryByText(/200\.000|App Store|★★/)).toBeNull();
  });

  it('keeps the English proof step off the chapter bar', () => {
    useQuizStore.getState().setLocale('en');
    render(
      <QuizShell step="proof">
        <p>proof</p>
      </QuizShell>,
    );
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.queryByText('Về bạn')).toBeNull();
    expect(useQuizStore.getState().currentStep).toBe('goal');
  });

  it('builds the plan without star ratings', () => {
    useQuizStore.getState().setData({
      measurement_unit: 'metric',
      fitness_goal: 'cut',
      gender: 'female',
      age: 32,
      birth_year: 1994,
      birth_month: 1,
      birth_day: 1,
      height_cm: 165,
      weight_kg: 70,
      target_weight_kg: 62,
      job_type: 'desk',
      training_days_per_week: 0,
      training_minutes_per_session: 0,
    });
    render(<CalculatingStep />);
    expect(screen.getByRole('heading', { name: 'Đang dựng kế hoạch từ những gì bạn vừa kể' })).toBeTruthy();
    expect(screen.queryByText(/200\.000|App Store|CH Play|★★★★★|9 trên 10/)).toBeNull();
  });

  it('renders the personalized plan summary', () => {
    useQuizStore.getState().setData({
      measurement_unit: 'metric',
      fitness_goal: 'cut',
      gender: 'female',
      height_cm: 165,
      weight_kg: 70,
      target_weight_kg: 62,
      job_type: 'desk',
    });
    useQuizStore.getState().setTdee({ bmr: 1400, tdee: 1800, calories: 1600, protein_g: 120, carbs_g: 150, fat_g: 50 }, 'fallback');
    useQuizStore.getState().setPlanAnswers({ answers: { obstacle: 'snacks' } });
    render(<TdeeTargetsStep />);
    expect(screen.getByRole('heading', { name: 'Kế hoạch ăn uống của bạn' })).toBeTruthy();
    expect(screen.getByText('Việc nên làm tuần đầu')).toBeTruthy();
    expect(screen.getByText(/Khi thèm, uống nước/)).toBeTruthy();
    expect(screen.getByText(/không thay thế bác sĩ/)).toBeTruthy();
  });
});
