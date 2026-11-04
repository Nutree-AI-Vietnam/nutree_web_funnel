/** @vitest-environment jsdom */

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useQuizStore } from '@/lib/quiz/store';
import { ExitIntentModal } from './exit-intent-modal';

describe('ExitIntentModal', () => {
  beforeEach(async () => {
    sessionStorage.clear();
    await useQuizStore.persist.rehydrate();
    useQuizStore.getState().setLocale('en');
    useQuizStore.getState().reset();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    useQuizStore.getState().setLocale('vi');
  });

  it('renders English when the funnel locale is English', async () => {
    render(<ExitIntentModal currentStepIndex={4} />);
    document.dispatchEvent(new MouseEvent('mouseleave', { clientY: 0 }));

    expect(await screen.findByRole('heading', { name: 'Your plan is taking shape' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Keep going' })).toBeTruthy();
    expect(screen.getByRole('button', { name: "I'll come back later" })).toBeTruthy();
    expect(screen.getByText('A calorie and macro plan made for you')).toBeTruthy();
    expect(screen.getByText(/You're \d+% of the way there/)).toBeTruthy();
    expect(screen.queryByText('Tiếp tục ngay')).toBeNull();
    expect(screen.queryByText('Bạn đang làm rất tốt!')).toBeNull();
  });

  it('does not open when the pointer leaves to switch tabs', async () => {
    render(<ExitIntentModal currentStepIndex={4} />);
    document.dispatchEvent(new MouseEvent('mouseleave', { clientY: -1 }));
    window.dispatchEvent(new Event('blur'));

    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(screen.queryByRole('heading', { name: 'Your plan is taking shape' })).toBeNull();
    expect(sessionStorage.getItem('nutree_exit_intent_shown')).toBeNull();
  });

  it('still opens after a cancelled tab switch, once the pointer actually leaves', async () => {
    render(<ExitIntentModal currentStepIndex={4} />);
    document.dispatchEvent(new MouseEvent('mouseleave', { clientY: -1 }));
    window.dispatchEvent(new Event('blur'));
    await new Promise((resolve) => setTimeout(resolve, 500));

    document.dispatchEvent(new MouseEvent('mouseleave', { clientY: 0 }));

    expect(await screen.findByRole('heading', { name: 'Your plan is taking shape' })).toBeTruthy();
  });

  it('drops the sheet when the tab hides so it is not covering the quiz on return', async () => {
    render(<ExitIntentModal currentStepIndex={4} />);
    document.dispatchEvent(new MouseEvent('mouseleave', { clientY: 0 }));
    expect(await screen.findByRole('heading', { name: 'Your plan is taking shape' })).toBeTruthy();

    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));

    // The hide handler clears the one-shot flag and closes the sheet. jsdom never
    // finishes the exit animation, so the heading can still be in the document.
    expect(sessionStorage.getItem('nutree_exit_intent_shown')).toBeNull();
  });
});
