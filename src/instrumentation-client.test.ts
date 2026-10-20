/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { init, register } = vi.hoisted(() => ({
  init: vi.fn(),
  register: vi.fn(),
}));

vi.mock('posthog-js', () => ({
  default: {
    init,
    register,
    capture: vi.fn(),
    get_property: vi.fn(),
  },
}));

describe('posthog client init', () => {
  beforeEach(() => {
    init.mockClear();
    register.mockClear();
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN', 'ph_test');
    window.history.replaceState(null, '', '/survey/vi');
  });

  it('enables exception capture when the project token is present', async () => {
    await import('./instrumentation-client');
    expect(init).toHaveBeenCalledWith('ph_test', expect.objectContaining({
      capture_exceptions: true,
      autocapture: true,
    }));
  });
});
