/** @vitest-environment jsdom */

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { copyFor } from '@/lib/copy';
import { useQuizStore } from '@/lib/quiz/store';
import { rememberCheckoutMethod } from '@/lib/revenuecat/checkout-email';
import { PostcheckoutPageClient } from './postcheckout-page-client';

const momoHeadline = copyFor('en').momoCheckout.paidHeadline;
const cardHeadline = copyFor('en').funnel.postcheckout.title;

describe('post-checkout hand-off', () => {
  beforeEach(async () => {
    sessionStorage.clear();
    window.history.replaceState(null, '', '/postcheckout');
    await useQuizStore.persist.rehydrate();
    useQuizStore.getState().reset();
    useQuizStore.getState().setLocale('en');
  });

  afterEach(() => {
    cleanup();
    useQuizStore.getState().setLocale('vi');
  });

  it('tells a MoMo buyer to sign in when the return page links here, even without the tab flag', async () => {
    window.history.replaceState(null, '', '/postcheckout?method=momo');
    render(<PostcheckoutPageClient />);

    expect(await screen.findByRole('heading', { name: momoHeadline })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: cardHeadline })).toBeNull();
  });

  it('keeps MoMo copy for a confirmed MoMo order in this tab', async () => {
    rememberCheckoutMethod('momo');
    render(<PostcheckoutPageClient />);

    expect(await screen.findByRole('heading', { name: momoHeadline })).toBeTruthy();
  });

  it('shows the card redemption-email guidance after a card checkout', async () => {
    rememberCheckoutMethod('paddle');
    render(<PostcheckoutPageClient />);

    expect(await screen.findByRole('heading', { name: cardHeadline })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: momoHeadline })).toBeNull();
  });
});
