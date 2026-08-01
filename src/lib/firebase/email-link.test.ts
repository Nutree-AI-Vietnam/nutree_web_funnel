import { describe, expect, it } from 'vitest';
import {
  readFirebaseEmailLinkConfig,
  sendFirebaseEmailLinkAfterPurchase,
} from './email-link';

const config = {
  NEXT_PUBLIC_FIREBASE_API_KEY: 'public-api-key',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'nutree-test.firebaseapp.com',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'nutree-test',
  NEXT_PUBLIC_FIREBASE_APP_ID: '1:123:web:abc',
  NEXT_PUBLIC_FIREBASE_EMAIL_LINK_CONTINUE_URL: 'https://start.nutree.ai/open-nutree',
};

describe('Firebase email-link configuration', () => {
  it('requires a token-free HTTPS open-nutree continuation', () => {
    expect(readFirebaseEmailLinkConfig(config).continueUrl).toBe('https://start.nutree.ai/open-nutree');
    expect(() => readFirebaseEmailLinkConfig({
      ...config,
      NEXT_PUBLIC_FIREBASE_EMAIL_LINK_CONTINUE_URL: 'https://start.nutree.ai/open-nutree?claim_token=not-allowed',
    })).toThrow('no query or fragment');
  });

  it('requires a browser before attempting to send', async () => {
    await expect(sendFirebaseEmailLinkAfterPurchase('person@example.com'))
      .rejects.toThrow('only be sent in a browser');
  });
});
