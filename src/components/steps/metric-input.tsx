'use client';

import { MetricWheelPicker } from './metric-wheel-picker';
import type { WheelVariant } from './metric-wheel-picker';

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
  bare,
  onChange,
  onBlur,
  variant = 'default',
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
  /** Chromeless full-height picker for single-metric screens (no card/label). */
  bare?: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
  variant?: WheelVariant;
}) {
  const parsed = parseMetricDraft(value);
  const current = parsed == null ? null : clamp(parsed, min, max);

  const picker = (
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
      variant={variant}
    />
  );

  if (bare) {
    return (
      <div className="flex flex-1 flex-col justify-center">
        {picker}
        {error && (
          <p id={`${id}-error`} role="alert" className="mt-4 text-center text-sm font-medium text-error-brand">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="surface-grain overflow-hidden rounded-[1.7rem] bg-white/82 p-4 shadow-[0_16px_46px_rgb(26_71_57_/_0.10),inset_0_1px_0_rgb(255_255_255_/_0.82)] backdrop-blur">
      {(label || hint) && (
        <div className="mb-3">
          <div className="text-base font-extrabold text-forest">{label}</div>
          {hint && (
            <p id={`${id}-hint`} className="mt-1 text-sm leading-5 text-muted-brand">
              {hint}
            </p>
          )}
        </div>
      )}

      {picker}

      {error && (
        <p id={`${id}-error`} role="alert" className="mt-3 text-sm font-medium leading-5 text-error-brand">
          {error}
        </p>
      )}
    </div>
  );
}
