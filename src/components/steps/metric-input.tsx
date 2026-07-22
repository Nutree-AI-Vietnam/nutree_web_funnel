'use client';

import { MetricWheelPicker } from './metric-wheel-picker';

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
  autoFocus?: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  const parsed = parseMetricDraft(value);
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(' ');
  const current = clamp(parsed ?? min, min, max);

  return (
    <div className="surface-grain overflow-hidden rounded-[1.7rem] bg-white/82 p-4 shadow-[0_16px_46px_rgb(26_71_57_/_0.10),inset_0_1px_0_rgb(255_255_255_/_0.82)] backdrop-blur">
      <div className="mb-3">
        <div>
          <div className="block text-base font-extrabold text-forest">
            {label}
          </div>
          {hint && (
            <p id={`${id}-hint`} className="mt-1 text-sm leading-5 text-muted-brand">
              {hint}
            </p>
          )}
        </div>
      </div>

      <div className="mb-3 flex items-center rounded-2xl border border-border-brand bg-white px-4 py-2 shadow-inner">
        <input
          id={`${id}-manual`}
          inputMode="decimal"
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          className="min-w-0 flex-1 bg-transparent text-2xl font-extrabold text-forest outline-none"
        />
        <span className="ml-3 text-base font-extrabold text-muted-brand">{unit}</span>
      </div>
      <MetricWheelPicker
        id={id}
        label={label}
        value={current}
        unit={unit}
        min={min}
        max={max}
        step={step}
        onChange={(next) => {
          onChange(formatMetric(next, step));
          onBlur();
        }}
        formatValue={(next) => formatMetric(next, step)}
        autoFocus={autoFocus}
      />

      {error && (
        <p id={`${id}-error`} className="mt-3 text-sm font-medium leading-5 text-error-brand">
          {error}
        </p>
      )}
    </div>
  );
}
