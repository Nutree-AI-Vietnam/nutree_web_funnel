import { describe, expect, it } from 'vitest';

import { nutreeEmailLinkHandoffHref } from './email-link-fallback';
import { emailLinkHeaders, emailLinkMetadata } from './security';

describe('email link fallback security', () => {
  it('is noindex and does not cache the Firebase link', () => {
    expect(emailLinkMetadata.robots).toEqual({ index: false, follow: false });
    expect(emailLinkHeaders).toMatchObject({
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
    });
  });

  it('forwards only a real Firebase action link to the native app', () => {
    expect(
      nutreeEmailLinkHandoffHref(
        'https://quiz.preview.nutreeai.com/auth/email-link?mode=signIn&oobCode=opaque',
      ),
    ).toContain('email_link=https%3A%2F%2Fquiz.preview.nutreeai.com%2Fauth%2Femail-link');
    expect(
      nutreeEmailLinkHandoffHref('https://quiz.preview.nutreeai.com/auth/email-link'),
    ).toBe('nutree://open-nutree');
  });
});
