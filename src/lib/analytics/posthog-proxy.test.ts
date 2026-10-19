import { describe, expect, it } from 'vitest';
import { posthogProxyTarget } from './posthog-proxy';

describe('posthogProxyTarget', () => {
  it('sends capture traffic to the US API host', () => {
    expect(posthogProxyTarget('/nt-relay/e/')).toEqual({
      hostname: 'us.i.posthog.com',
      pathname: '/e/',
    });
  });

  it('sends recorder assets and remote config to the asset host', () => {
    expect(posthogProxyTarget('/nt-relay/static/posthog-recorder.js')?.hostname).toBe('us-assets.i.posthog.com');
    expect(posthogProxyTarget('/nt-relay/array/token/config.js')?.hostname).toBe('us-assets.i.posthog.com');
  });

  it('ignores unrelated paths', () => {
    expect(posthogProxyTarget('/survey/vi')).toBeNull();
    expect(posthogProxyTarget('/nt-relay-other')).toBeNull();
  });
});
