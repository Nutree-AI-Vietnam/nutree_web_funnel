/** @vitest-environment jsdom */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cn } from '@/lib/utils';

/** The real rule from globals.css. Tailwind's @theme block is not valid in jsdom, so only this slice is applied. */
function attentionCss(): string {
  const css = readFileSync(path.join(process.cwd(), 'src/app/globals.css'), 'utf8');
  const start = css.indexOf('.cta-attention {');
  const end = css.indexOf('.cta-premium', start);
  if (start < 0 || end < 0) throw new Error('cta-attention rules missing from globals.css');
  return css.slice(start, end);
}

/** Exit-offer classes from paywall-page-client. The orange buttons use cta-attention without cta-premium. */
const headerCta = cn(
  'min-h-12 shrink-0 rounded-[1rem] px-4 text-[0.86rem] font-extrabold text-white',
  'bg-[#C2410C] shadow-[0_10px_24px_rgb(194_65_12_/_0.25)] hover:bg-[#9A3412]',
  'cta-attention',
);
const checkoutCta = cn(
  'min-h-14 w-full rounded-2xl px-5 text-base font-extrabold text-white shadow-[0_14px_28px_rgb(23_69_58_/_0.22)]',
  'bg-[#C2410C] hover:bg-[#9A3412]',
  'cta-attention',
);

/** jsdom does not implement getComputedStyle for pseudo-elements, so the pulse box is read from the parsed rule that matches this button. */
function pulseRule(button: HTMLElement): CSSStyleDeclaration {
  const matches: CSSStyleDeclaration[] = [];
  const visit = (rules: CSSRuleList) => {
    for (const rule of rules) {
      if (rule instanceof CSSMediaRule) {
        visit(rule.cssRules);
        continue;
      }
      if (!(rule instanceof CSSStyleRule) || !rule.selectorText.includes('::before')) continue;
      const host = rule.selectorText.replaceAll('::before', '');
      const applies = host.split(',').some((part) => {
        try {
          return button.matches(part.trim());
        } catch {
          return false;
        }
      });
      if (applies && rule.style.position === 'absolute') matches.push(rule.style);
    }
  };
  for (const sheet of document.styleSheets) visit(sheet.cssRules);
  expect(matches, 'an absolute ::before rule must match this button, not only .cta-premium').toHaveLength(1);
  return matches[0];
}

function expectPulseStaysOnButton(button: HTMLElement) {
  const box = getComputedStyle(button);
  expect(box.position).toBe('relative');
  expect(box.isolation).toBe('isolate');
  const pulse = pulseRule(button);
  expect(pulse.getPropertyValue('inset')).toBe('0px');
  expect(pulse.content).not.toBe('none');
  expect(Number(pulse.zIndex)).toBeLessThan(1);
  const label = button.firstElementChild;
  expect(label).toBeTruthy();
  expect(getComputedStyle(label as HTMLElement).position).toBe('relative');
  expect(Number(getComputedStyle(label as HTMLElement).zIndex)).toBeGreaterThanOrEqual(1);
}

describe('offer button pulse', () => {
  beforeEach(() => {
    const style = document.createElement('style');
    style.textContent = attentionCss();
    document.head.appendChild(style);
  });

  afterEach(() => {
    cleanup();
    document.head.querySelectorAll('style').forEach((node) => node.remove());
  });

  it('keeps the exit-offer pulse inside both paywall buttons, even under a positioned ancestor', () => {
    const { getByRole } = render(
      <div style={{ position: 'relative', width: 800, height: 800 }}>
        <button type="button" className={headerCta}><span>Nhận ưu đãi 50%</span></button>
        <button type="button" className={checkoutCta}><span>Nhận ưu đãi 75%</span></button>
      </div>,
    );
    expectPulseStaysOnButton(getByRole('button', { name: 'Nhận ưu đãi 50%' }));
    expectPulseStaysOnButton(getByRole('button', { name: 'Nhận ưu đãi 75%' }));
  });
});
