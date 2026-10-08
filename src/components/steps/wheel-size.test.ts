import { describe, expect, it } from 'vitest';
import { WHEEL_MIN_HEIGHT, wheelSize } from './wheel-size';

describe('wheelSize', () => {
  it('renders the full wheel before the container is measured', () => {
    expect(wheelSize(null, 'hero')).toEqual({ itemHeight: 68, height: 340, padding: 136 });
    expect(wheelSize(null, 'default')).toEqual({ itemHeight: 56, height: 280, padding: 112 });
  });

  it('keeps five rows when the container has room to spare', () => {
    expect(wheelSize(400, 'hero')).toEqual({ itemHeight: 68, height: 340, padding: 136 });
    expect(wheelSize(400, 'default')).toEqual({ itemHeight: 56, height: 280, padding: 112 });
  });

  it('keeps the large hero rows only while five of them fit', () => {
    expect(wheelSize(340, 'hero')).toMatchObject({ itemHeight: 68, height: 340 });
    expect(wheelSize(339, 'hero')).toMatchObject({ itemHeight: 56, height: 280 });
  });

  it('shrinks the wheel to the height the container leaves free', () => {
    expect(wheelSize(200, 'default')).toEqual({ itemHeight: 56, height: 200, padding: 72 });
    expect(wheelSize(250.7, 'default')).toEqual({ itemHeight: 56, height: 250, padding: 97 });
  });

  it('never shows fewer than three rows', () => {
    expect(WHEEL_MIN_HEIGHT).toBe(168);
    expect(wheelSize(100, 'default')).toEqual({ itemHeight: 56, height: 168, padding: 56 });
    expect(wheelSize(100, 'hero')).toEqual({ itemHeight: 56, height: 168, padding: 56 });
  });

  it('centers the middle row for every size', () => {
    for (const variant of ['default', 'hero'] as const) {
      for (let available = 0; available <= 500; available += 7) {
        const { itemHeight, height, padding } = wheelSize(available, variant);
        expect(padding + itemHeight / 2).toBe(height / 2);
      }
    }
  });
});
