import { describe, expect, it } from 'vitest';
import { siteUrlForVercelEnvironment } from './site-url';

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
});
