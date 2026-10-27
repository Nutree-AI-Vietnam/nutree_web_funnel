import { describe, expect, it } from 'vitest';
import { vi } from './vi';

describe('Vietnamese progress chart labels', () => {
  it('names the halfway column in weeks for a short path and months for a long one', () => {
    expect(vi.progress.midpointLabel(28)).toBe('Tuần 2');
    expect(vi.progress.midpointLabel(343)).toBe('Tháng 6');
  });

  it('gives the pace in days for a short path and weeks for a long one', () => {
    expect(vi.progress.pace(28)).toBe('Dự kiến khoảng 28 ngày với nhịp độ ổn định.');
    expect(vi.progress.pace(343)).toBe('Dự kiến khoảng 49 tuần với nhịp độ ổn định.');
  });
});
