/** @vitest-environment jsdom */

import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FunnelLocale } from '@/lib/analytics/funnel-locale';
import { MetaPixel } from '@/app/meta-pixel';

vi.mock('next/script', () => ({
  default: ({ id, children }: { id?: string; children?: string }) => <script id={id}>{children}</script>,
}));

const DEFAULT_ID = '1111111111';
const ENGLISH_ID = '2222222222';

function snippet(): string {
  return document.getElementById('meta-pixel')?.textContent ?? '';
}

describe('Meta pixel', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID', DEFAULT_ID);
    vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID_EN', ENGLISH_ID);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  function renderPixel(locale: FunnelLocale) {
    render(<MetaPixel locale={locale} />);
    return snippet();
  }

  it('inits only the english pixel on an english page', () => {
    const script = renderPixel('en');
    expect(document.querySelectorAll('#meta-pixel')).toHaveLength(1);
    expect(script).toContain(`fbq('init','${ENGLISH_ID}'`);
    expect(script).toContain("fbq('track','PageView')");
    expect(script.match(/fbq\('init'/g)).toHaveLength(1);
    expect(script.match(/fbq\('track','PageView'\)/g)).toHaveLength(1);
    expect(script).not.toContain(DEFAULT_ID);
  });

  it('inits only the default pixel on a vietnamese page', () => {
    const script = renderPixel('vi');
    expect(document.querySelectorAll('#meta-pixel')).toHaveLength(1);
    expect(script).toContain(`fbq('init','${DEFAULT_ID}'`);
    expect(script).not.toContain(ENGLISH_ID);
    expect(script.match(/fbq\('track','PageView'\)/g)).toHaveLength(1);
  });

  it('falls back to the default pixel when the english id is unset', () => {
    vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID_EN', '');
    const script = renderPixel('en');
    expect(script).toContain(`fbq('init','${DEFAULT_ID}'`);
    expect(script).not.toContain(ENGLISH_ID);
    expect(document.querySelectorAll('#meta-pixel')).toHaveLength(1);
  });
});
