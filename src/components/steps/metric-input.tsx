'use client';

import { vi } from '@/lib/copy/vi';

export type QuickAdjustment = {
  label: string;
  amount: number;
};

export function normalizeMetricDraft(value: string): string {
  return value.trim().replace(',', '.');
}

export function parseMetricDraft(value: string): number | null {
  const normalized = normalizeMetricDraft(value);
  if (normalized === '') return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isMetricValueValid(value: string, min: number, max: number): boolean {
  const parsed = parseMetricDraft(value);
  return parsed != null && parsed >= min && parsed <= max;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function formatMetric(value: number, step: number): string {
  const decimals = step % 1 === 0 ? 0 : 1;
  return value.toFixed(decimals).replace(/\.0$/, '');
}

export function MetricInput({
  id,
  label,
  value,
  unit,
  min,
  max,
  step,
  hint,
  error,
  quickAdjustments,
  autoFocus,
  onChange,
  onBlur,
}: {
  id: string;
  label: string;
  value: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  hint?: string;
  error?: string;
  quickAdjustments?: ReadonlyArray<QuickAdjustment>;
  autoFocus?: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  const parsed = parseMetricDraft(value);
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(' ');
  const current = parsed ?? min;
  const atMin = parsed != null && current <= min;
  const atMax = parsed != null && current >= max;

  const adjust = (amount: number) => {
    onChange(formatMetric(clamp(current + amount, min, max), step));
  };

  return (
    <div className="rounded-2xl border border-border-brand/80 bg-white/90 p-4 shadow-[0_12px_30px_rgb(26_71_57_/_0.07)]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <label htmlFor={id} className="block text-sm font-semibold text-slate-brand">
            {label}
          </label>
          {hint && (
            <p id={`${id}-hint`} className="mt-1 text-sm leading-5 text-muted-brand">
              {hint}
            </p>
          )}
        </div>
        <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold text-emerald-deep">
          {unit}
        </span>
      </div>

      <div className="grid grid-cols-[48px_minmax(0,1fr)_48px] items-center gap-2">
        <button
          type="button"
          onClick={() => adjust(-step)}
          disabled={atMin}
          aria-label={vi.metric.decrement(label)}
          className="metric-stepper"
        >
          -
        </button>
        <div className="relative">
          <input
            id={id}
            type="number"
            inputMode={step % 1 === 0 ? 'numeric' : 'decimal'}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onBlur={onBlur}
            min={min}
            max={max}
            step={step}
            autoFocus={autoFocus}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy || undefined}
            className="min-h-12 w-full rounded-xl border-2 border-border-brand bg-bg-brand px-4 py-3 pr-14 text-center text-[1.35rem] font-extrabold text-forest outline-none transition focus:border-teal-brand focus:ring-4 focus:ring-teal-brand/15"
          />
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-brand">
            {unit}
          </span>
        </div>
        <button
          type="button"
          onClick={() => adjust(step)}
          disabled={atMax}
          aria-label={vi.metric.increment(label)}
          className="metric-stepper"
        >
          +
        </button>
      </div>

      {quickAdjustments && quickAdjustments.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {quickAdjustments.map((item) => (
            <button
              key={`${item.label}-${item.amount}`}
              type="button"
              onClick={() => adjust(item.amount)}
              className="min-h-11 rounded-full border border-border-brand bg-mist/60 px-4 text-sm font-semibold text-slate-brand transition hover:border-teal-brand/60 hover:bg-mist focus:outline-none focus:ring-4 focus:ring-teal-brand/15"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p id={`${id}-error`} className="mt-3 text-sm font-medium leading-5 text-error-brand">
          {error}
        </p>
      )}
    </div>
  );
}
