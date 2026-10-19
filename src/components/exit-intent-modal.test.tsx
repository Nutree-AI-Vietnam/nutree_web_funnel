/** @vitest-environment jsdom */

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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
    useQuizStore.getState().setLocale('vi');
  });

  it('renders English when the funnel locale is English', async () => {
    render(<ExitIntentModal currentStepIndex={4} />);
    document.dispatchEvent(new MouseEvent('mouseleave', { clientY: 0 }));

    expect(await screen.findByRole('heading', { name: "You're doing great!" })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Keep going' })).toBeTruthy();
    expect(screen.getByRole('button', { name: "I'll come back later" })).toBeTruthy();
    expect(screen.getByText('A calorie and macro plan made for you')).toBeTruthy();
    expect(screen.getByText(/You're \d+% of the way there/)).toBeTruthy();
    expect(screen.queryByText('Tiếp tục ngay')).toBeNull();
    expect(screen.queryByText('Bạn đang làm rất tốt!')).toBeNull();
  });
});
