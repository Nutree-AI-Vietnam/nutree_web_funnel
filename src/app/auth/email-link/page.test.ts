import { describe, expect, it } from 'vitest';
import {
  firebaseEmailAppLink,
  firebaseActionLinkFromQuery,
} from './page';

describe('Firebase email-link app handoff', () => {
  it('extracts the nested Firebase action link from the fallback URL', () => {
    expect(
      firebaseActionLinkFromQuery(
        '?link=https%3A%2F%2Fnutree-ai-staging.firebaseapp.com%2F__%2Fauth%2Faction%3Fmode%3DsignIn%26oobCode%3Done-time-code',
      ),
    ).toBe(
      'https://nutree-ai-staging.firebaseapp.com/__/auth/action?mode=signIn&oobCode=one-time-code',
    );
  });

  it('keeps the action link when launching the app', () => {
    const actionLink =
      'https://nutree-ai-staging.firebaseapp.com/__/auth/action?mode=signIn&oobCode=one-time-code';

    expect(firebaseEmailAppLink(actionLink)).toBe(
      `nutree://open-nutree?link=${encodeURIComponent(actionLink)}`,
    );
  });
});
