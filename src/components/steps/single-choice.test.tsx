/** @vitest-environment jsdom */

import { useLayoutEffect } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { vi as viCopy } from '@/lib/copy';
import { startQuizFromLanding } from '@/lib/quiz/navigation';
import { useHydrated, useQuizStore } from '@/lib/quiz/store';
import { clearPreHydrationChoices, SingleChoiceStep } from './single-choice';

const { capture } = vi.hoisted(() => ({ capture: vi.fn() }));

vi.mock('posthog-js', () => ({
  default: {
    capture,
    identify: vi.fn(),
    register: vi.fn(),
    get_property: vi.fn(),
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
}));

const goalOptions = viCopy.goal.options;

function GoalStep() {
  const hydrated = useHydrated();
  const funnelScreen = useQuizStore((state) => state.funnelScreen);
  const step = useQuizStore((state) => state.currentStep);
  // Same order as the survey page: reset the fresh landing session before the goal tap is applied.
  useLayoutEffect(() => {
    if (!hydrated || funnelScreen !== 'landing') return;
    startQuizFromLanding();
  }, [hydrated, funnelScreen]);
  if (step === 'name_ask') return <h1>{viCopy.name_ask.question}</h1>;
  return (
    <SingleChoiceStep
      step="goal"
      field="fitness_goal"
      question={viCopy.goal.question}
      description={viCopy.goal.description}
      options={goalOptions}
    />
  );
}

describe('SingleChoiceStep', () => {
  beforeEach(async () => {
    if (!('ResizeObserver' in globalThis)) {
      class ResizeObserverStub {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
      vi.stubGlobal('ResizeObserver', ResizeObserverStub);
    }
    capture.mockClear();
    clearPreHydrationChoices();
    sessionStorage.clear();
    localStorage.clear();
    window.history.replaceState(null, '', '/');
    document.body.replaceChildren();
    await useQuizStore.persist.rehydrate();
    useQuizStore.getState().reset();
  });

  afterEach(() => {
    cleanup();
    clearPreHydrationChoices();
    vi.unstubAllGlobals();
  });

  it('advances to name_ask when a goal option is tapped before hydration', async () => {
    const html = renderToString(<GoalStep />);
    const container = document.createElement('div');
    document.body.appendChild(container);
    container.innerHTML = html;

    const cut = container.querySelector<HTMLInputElement>('input[type="radio"][value="cut"]');
    expect(cut).toBeTruthy();
    cut!.click();
    expect(cut!.checked).toBe(true);

    let root: ReturnType<typeof hydrateRoot> | undefined;
    await act(async () => {
      root = hydrateRoot(container, <GoalStep />);
    });

    expect(useQuizStore.getState().currentStep).toBe('goal');
    expect(useQuizStore.getState().data.fitness_goal).toBe('cut');
    expect(capture).toHaveBeenCalledTimes(1);
    expect(capture).toHaveBeenCalledWith('goal_option_selected', expect.objectContaining({
      option: 'cut',
      locale: 'vi',
      step: 'goal',
      funnel_locale: 'vi',
      funnel: 'web_funnel_vi',
      source: 'web_funnel',
    }));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 260));
    });

    expect(useQuizStore.getState().currentStep).toBe('name_ask');
    expect(container.textContent).toContain(viCopy.name_ask.question);

    await act(async () => {
      root?.unmount();
    });
    container.remove();
  });

  it('fires goal_option_selected with the option, locale, step, and funnel attribution', () => {
    window.history.replaceState(null, '', '/survey/en?utm_source=meta&utm_medium=paid&utm_campaign=spring');
    sessionStorage.setItem('nutree_attribution_v1', JSON.stringify({
      utm_source: 'meta',
      utm_medium: 'paid',
      utm_campaign: 'spring',
    }));
    useQuizStore.getState().setLocale('en');

    render(
      <SingleChoiceStep
        step="goal"
        field="fitness_goal"
        question="What’s your main goal?"
        description="This sets your calories and how meals are split."
        options={[
          { key: 'cut', label: 'Lose fat' },
          { key: 'bulk', label: 'Build muscle' },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Lose fat' }));

    expect(capture).toHaveBeenCalledTimes(1);
    expect(capture).toHaveBeenCalledWith('goal_option_selected', {
      utm_source: 'meta',
      utm_medium: 'paid',
      utm_campaign: 'spring',
      option: 'cut',
      locale: 'en',
      step: 'goal',
      funnel_locale: 'en',
      funnel: 'web_funnel_en',
      source: 'web_funnel',
    });
    expect(useQuizStore.getState().data.fitness_goal).toBe('cut');
  });

  it('does not fire goal_option_selected for other single-choice steps', () => {
    render(
      <SingleChoiceStep
        step="duration"
        field="challenge_duration"
        question="How long?"
        options={[{ key: '14', label: '14 ngày' }]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '14 ngày' }));

    expect(capture).not.toHaveBeenCalled();
    expect(useQuizStore.getState().data.challenge_duration).toBe('14');
  });
});
