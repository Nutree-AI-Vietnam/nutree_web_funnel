'use client';

import { useEffect, useState } from 'react';
import { useCopy } from '@/lib/copy/use-copy';
import {
  boxesToMetric,
  boxesToStop,
  boxUnits,
  rangeLabels,
  stopToBoxes,
  toBoxes,
  wheelBounds,
  type Boxes,
  type Measure,
  type UnitSystem,
} from '@/lib/quiz/units';
import { useUnits } from '@/lib/quiz/use-units';
import { MetricInput, parseMetricDraft } from './metric-input';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { MetricWheelPicker, type WheelVariant } from './metric-wheel-picker';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** The text of each box. */
function draftsOf({ major, minor }: Boxes): string[] {
  return minor == null ? [String(major)] : [String(major), String(minor)];
}

/** The boxes of a system filled from a metric value, or left empty when there is none. */
function draftsFor(measure: Measure, system: UnitSystem, metric: number | undefined, min: number, max: number): string[] {
  if (metric == null) return boxUnits(measure, system).map(() => '');
  // The wheel moves in whole units, so a converted value snaps to one it can show.
  const boxes = toBoxes(measure, system, system === 'metric' ? Math.round(metric) : metric);
  if (system === 'metric') return draftsOf(boxes);
  // A value at the edge of the range can round to a stop just outside it; keep it on the wheel.
  const bounds = wheelBounds(measure, min, max);
  return draftsOf(stopToBoxes(measure, clamp(boxesToStop(measure, boxes.major, boxes.minor), bounds.min, bounds.max)));
}

/** The metric value of the typed boxes, or null when they are empty, bad or out of range. */
function metricOf(measure: Measure, system: UnitSystem, drafts: string[], min: number, max: number): number | null {
  return boxesToMetric(measure, system, parseMetricDraft(drafts[0]), parseMetricDraft(drafts[1] ?? ''), min, max);
}

/** The wheel stop the boxes stand for, or null while they are empty. */
function stopOf(measure: Measure, drafts: string[]): number | null {
  const major = parseMetricDraft(drafts[0]);
  return major == null ? null : boxesToStop(measure, major, parseMetricDraft(drafts[1] ?? '') ?? 0);
}

type UnitFieldsProps = {
  measure: Measure;
  id: string;
  label: string;
  /** The stored metric value, else the field's default; the field starts from it. */
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
 * One body measure in the visitor's units, with a switch when there is more than one system to
 * pick. Metric, feet and inches, and pounds are all picked on the wheel. Reports the metric value,
 * or null while nothing valid is picked or typed.
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
  const [entered, setEntered] = useState(() => ({ system, drafts: draftsFor(measure, system, initialValue, min, max) }));

  // The system can change without typing (the switch, or the country arriving late): the field
  // then converts what was entered, or starts again from the initial value when none of it is valid.
  const drafts =
    entered.system === system
      ? entered.drafts
      : draftsFor(measure, system, metricOf(measure, entered.system, entered.drafts, min, max) ?? initialValue, min, max);
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

  const units = boxUnits(measure, system);
  const bounds = wheelBounds(measure, min, max);

  return (
    <>
      {options.length > 1 && (
        <SegmentedControl
          label={label}
          className="mb-3 shrink-0 self-center"
          options={options.map((option) => ({ value: option, label: boxUnits(measure, option).join('·') }))}
          value={system}
          onChange={setSystem}
        />
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
          <MetricWheelPicker
            id={id}
            label={label}
            value={stopOf(measure, drafts)}
            // Feet and inches read as one value (5'5"), so only pounds name a unit.
            unit={measure === 'height' ? '' : units[0]}
            min={bounds.min}
            max={bounds.max}
            step={1}
            autoFocus={autoFocus}
            variant={variant}
            formatValue={(stop) => {
              const { major, minor } = stopToBoxes(measure, stop);
              return minor == null ? String(major) : `${major}'${minor}"`;
            }}
            onChange={(stop) => {
              setEntered({ system, drafts: draftsOf(stopToBoxes(measure, stop)) });
              onBlur();
            }}
          />
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
