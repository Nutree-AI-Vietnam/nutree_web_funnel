import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Nhận ưu đãi button motion', () => {
  const css = readFileSync(new URL('./globals.css', import.meta.url), 'utf8');

  it('animates an inner pseudo-element so the button hit area stays still', () => {
    const glow = css.match(/@keyframes cta-attention \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(glow).not.toContain('transform');
    expect(css).toMatch(/\.cta-attention::before[\s\S]*?cta-attention-scale/);
    expect(css).toMatch(/@keyframes cta-attention-scale \{[\s\S]*?transform: scale\(1\.045\)/);
    const reduced = css.match(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.cta-attention::before[\s\S]*?\}/)?.[0] ?? '';
    expect(reduced).toContain('.cta-attention::before');
    expect(reduced).toContain('animation: none');
  });
});
