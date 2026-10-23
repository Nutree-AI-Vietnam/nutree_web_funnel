'use client';

import { useEffect, useState } from 'react';
import { useCopy } from '@/lib/copy/use-copy';
import { boxesToMetric, boxUnits, rangeLabels, toBoxes, type Measure, type UnitSystem } from '@/lib/quiz/units';
import { useUnits } from '@/lib/quiz/use-units';
import { cn } from '@/lib/utils';
import { MetricInput, parseMetricDraft } from './metric-input';
import type { WheelVariant } from './metric-wheel-picker';

/** The boxes of a system filled from a metric value, or left empty when there is none. */
function draftsFor(measure: Measure, system: UnitSystem, metric: number | undefined): string[] {
  if (metric == null) return boxUnits(measure, system).map(() => '');
  // The wheel moves in whole units, so a converted value snaps to one it can show.
  const { major, minor } = toBoxes(measure, system, system === 'metric' ? Math.round(metric) : metric);
  return minor == null ? [String(major)] : [String(major), String(minor)];
}

/** The metric value of the typed boxes, or null when they are empty, bad or out of range. */
function metricOf(measure: Measure, system: UnitSystem, drafts: string[], min: number, max: number): number | null {
  return boxesToMetric(measure, system, parseMetricDraft(drafts[0]), parseMetricDraft(drafts[1] ?? ''), min, max);
}

type UnitFieldsProps = {
  measure: Measure;
  id: string;
  label: string;
  /** The stored metric value, else the field's default; the boxes start from it. */
  initialValue: number | undefined;
  /** The metric unit, named in the range error when the visitor reads metric. */
  unit: string;
  min: number;
  max: number;
  autoFocus?: boolean;
  variant?: WheelVariant;
  showError: boolean;
  onChange: (metric: number | null) => void;
  onBlur: () => void;
};

/**
 * One body measure in the visitor's units: the wheel in metric, text boxes otherwise (ft and in,
 * lb, or st and lb), with a switch when there is more than one system to pick. Reports the
 * metric value, or null while what is typed is empty, bad or out of range.
 */
export function UnitFields({
  measure,
  id,
  label,
  initialValue,
  unit,
  min,
  max,
  autoFocus,
  variant = 'default',
  showError,
  onChange,
  onBlur,
}: UnitFieldsProps) {
  const copy = useCopy();
  const { system, options, setSystem } = useUnits();
  const [entered, setEntered] = useState(() => ({ system, drafts: draftsFor(measure, system, initialValue) }));

  // The system can change without typing (the switch, or the country arriving late): the boxes
  // then convert what was typed, or start again from the initial value when none of it is valid.
  const drafts =
    entered.system === system
      ? entered.drafts
      : draftsFor(measure, system, metricOf(measure, entered.system, entered.drafts, min, max) ?? initialValue);
  const metric = metricOf(measure, system, drafts, min, max);

  useEffect(() => {
    onChange(metric);
  }, [metric, onChange]);

  let error: string | undefined;
  if (showError && metric == null) {
    const range = rangeLabels(measure, system, min, max);
    error =
      system === 'metric'
        ? copy.metric.rangeError(label, min, max, unit)
        : `${label} should be between ${range.min} and ${range.max}.`;
  }

  // Feet and inches serve the stone system too, so the height switch has no stone choice.
  const choices = measure === 'height' ? options.filter((option) => option !== 'stone') : options;
  const pressed = measure === 'height' && system === 'stone' ? 'imperial' : system;
  const units = boxUnits(measure, system);
  const hero = variant === 'hero';

  return (
    <>
      {choices.length > 1 && (
        <div
          role="group"
          aria-label={label}
          className="mb-3 inline-flex shrink-0 self-center rounded-full border border-white/80 bg-white/70 p-1 shadow-sm backdrop-blur"
        >
          {choices.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={option === pressed}
              className={cn(
                'min-h-11 min-w-11 rounded-full px-4 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-brand',
                option === pressed ? 'bg-forest text-white shadow-sm' : 'text-muted-brand hover:text-slate-brand',
              )}
              onClick={() => {
                if (option !== pressed) setSystem(option);
              }}
            >
              {boxUnits(measure, option).join('·')}
            </button>
          ))}
        </div>
      )}
      {system === 'metric' ? (
        <MetricInput
          id={id}
          label={label}
          unit={unit}
          value={drafts[0]}
          min={min}
          max={max}
          step={1}
          autoFocus={autoFocus}
          bare
          variant={variant}
          error={error}
          onChange={(text) => setEntered({ system, drafts: [text] })}
          onBlur={onBlur}
        />
      ) : (
        <div className="flex flex-1 flex-col">
          <div
            className="flex flex-1 items-center justify-center gap-4"
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) onBlur();
            }}
          >
            {units.map((boxUnit, index) => (
              <div key={boxUnit} className="flex items-baseline gap-1.5">
                <input
                  id={index === 0 ? id : `${id}-${boxUnit}`}
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={units.length > 1 ? 2 : 3}
                  aria-label={`${label} (${boxUnit})`}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? `${id}-error` : undefined}
                  value={drafts[index]}
                  onChange={(event) => {
                    const next = [...drafts];
                    next[index] = event.target.value.replace(/\D/g, '');
                    setEntered({ system, drafts: next });
                  }}
                  className={cn(
                    'ph-no-capture rounded-2xl border border-white/80 bg-white/90 text-center font-extrabold tabular-nums text-forest shadow-inner outline-none transition focus:border-teal-brand focus:ring-4 focus:ring-teal-brand/10',
                    hero ? 'h-20 text-[3.2rem]' : 'h-16 text-[2.5rem]',
                    units.length > 1 ? 'w-20' : 'w-28',
                  )}
                />
                <span className="text-lg font-bold text-muted-brand">{boxUnit}</span>
              </div>
            ))}
          </div>
          {error && (
            <p id={`${id}-error`} role="alert" className="mt-4 text-center text-sm font-medium text-error-brand">
              {error}
            </p>
          )}
        </div>
      )}
    </>
  );
}
