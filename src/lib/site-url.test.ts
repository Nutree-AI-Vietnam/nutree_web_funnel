import { describe, expect, it } from 'vitest';
import { isNutreeClaimSiteUrl, siteUrlForBrowserOrigin, siteUrlForVercelEnvironment } from './site-url';

describe('siteUrlForVercelEnvironment', () => {
  it('uses the production quiz host only for production deployments', () => {
    expect(siteUrlForVercelEnvironment('production')).toBe(
      'https://quiz.nutreeai.com',
    );
  });

  it('uses the preview quiz host for preview and local deployments', () => {
    expect(siteUrlForVercelEnvironment('preview')).toBe(
      'https://quiz.preview.nutreeai.com',
    );
    expect(siteUrlForVercelEnvironment()).toBe(
      'https://quiz.preview.nutreeai.com',
    );
  });

  it('keeps browser handoffs on known mobile-associated claim hosts', () => {
    expect(isNutreeClaimSiteUrl('https://quiz.preview.nutreeai.com')).toBe(true);
    expect(isNutreeClaimSiteUrl('https://attacker.test')).toBe(false);
    expect(siteUrlForBrowserOrigin('https://quiz.nutreeai.com')).toBe('https://quiz.nutreeai.com');
    expect(siteUrlForBrowserOrigin('https://attacker.test')).toBe(siteUrlForVercelEnvironment(process.env.VERCEL_ENV));
  });
});
