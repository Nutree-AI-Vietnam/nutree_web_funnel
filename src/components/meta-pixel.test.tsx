/** @vitest-environment jsdom */

import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
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
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it('inits only the pixel id the layout chose', () => {
    render(<MetaPixel pixelId={ENGLISH_ID} />);
    const script = snippet();
    expect(document.querySelectorAll('#meta-pixel')).toHaveLength(1);
    expect(script).toContain(`fbq('init','${ENGLISH_ID}'`);
    expect(script).toContain("fbq('track','PageView')");
    expect(script.match(/fbq\('init'/g)).toHaveLength(1);
    expect(script.match(/fbq\('track','PageView'\)/g)).toHaveLength(1);
    expect(script).not.toContain(DEFAULT_ID);
  });

  it('renders nothing when the layout has no pixel', () => {
    const { container } = render(<MetaPixel pixelId="" />);
    expect(container.innerHTML).toBe('');
    expect(document.getElementById('meta-pixel')).toBeNull();
  });

  it('ships no no-script image, which could not check the host', () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    const { container } = render(<MetaPixel pixelId={ENGLISH_ID} />);
    expect(container.querySelector('noscript')).toBeNull();
  });
});
