import { describe, expect, it } from 'vitest';
import {
  disabledPaddleEmailLinkState,
  maySendFirebaseEmailLink,
  readFirebaseEmailLinkConfig,
  sendVerifiedPaymentEmailLink,
} from './email-link';

const config = {
  NEXT_PUBLIC_FIREBASE_API_KEY: 'public-api-key',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'nutree-test.firebaseapp.com',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'nutree-test',
  NEXT_PUBLIC_FIREBASE_APP_ID: '1:123:web:abc',
  NEXT_PUBLIC_FIREBASE_EMAIL_LINK_CONTINUE_URL: 'https://start.nutree.ai/open-nutree',
};

describe('Firebase verified-payment email link gate', () => {
  it('keeps the Paddle flow disabled until it has a server payment projection', () => {
    expect(disabledPaddleEmailLinkState).toEqual({
      kind: 'source_unavailable',
      reason: 'paddle_server_projection_not_available',
    });
    expect(maySendFirebaseEmailLink(disabledPaddleEmailLinkState)).toBe(false);
    expect(maySendFirebaseEmailLink({ kind: 'payment_pending' })).toBe(false);
    expect(maySendFirebaseEmailLink({ kind: 'payment_verified' })).toBe(true);
  });

  it('rejects link sending before payment verification without loading Firebase', async () => {
    await expect(sendVerifiedPaymentEmailLink('person@example.com', { kind: 'payment_pending' }))
      .rejects.toThrow('server-verified payment status');
  });

  it('requires a token-free HTTPS open-nutree continuation', () => {
    expect(readFirebaseEmailLinkConfig(config).continueUrl).toBe('https://start.nutree.ai/open-nutree');
    expect(() => readFirebaseEmailLinkConfig({
      ...config,
      NEXT_PUBLIC_FIREBASE_EMAIL_LINK_CONTINUE_URL: 'https://start.nutree.ai/open-nutree?claim_token=not-allowed',
    })).toThrow('no query or fragment');
  });
});
