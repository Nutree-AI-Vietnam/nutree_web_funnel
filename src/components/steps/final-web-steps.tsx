'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { OptionCard } from '@/components/option-card';
import { PrimaryButton } from '@/components/primary-button';
import { useCopy, useLocale } from '@/lib/copy/use-copy';

const HEALTHY_BMI_LOW = 18.5;
const HEALTHY_BMI_HIGH = 24.9;

/** Weight in kg at a BMI for this height. */
function weightAtBmi(value: number, heightCm: number): number {
  const meters = heightCm / 100;
  return value * meters * meters;
}

/** A starting target inside the healthy range: about 10% down for a loss goal, a little up for a gain goal. */
export function presetTargetWeight(goal: OnboardingPayload['fitness_goal'], currentKg: number | undefined, heightCm: number | undefined): number | undefined {
  if (currentKg == null) return undefined;
  if (!heightCm) return currentKg;
  const low = weightAtBmi(HEALTHY_BMI_LOW, heightCm);
  const high = weightAtBmi(HEALTHY_BMI_HIGH, heightCm);
  if (goal === 'bulk') return Math.round(currentKg + 3);
  if (goal === 'cut') {
    const target = currentKg > high ? Math.max(high, currentKg * 0.9) : Math.max(low, currentKg - 3);
    return Math.round(Math.min(target, currentKg));
  }
  return Math.round(currentKg);
}
import type { Copy } from '@/lib/copy';
import { goToNextQuizStep, goToQuizStep } from '@/lib/quiz/navigation';
import { useQuizStore } from '@/lib/quiz/store';
import type { OnboardingPayload } from '@/lib/quiz/types';
import { deriveAge, MIN_AGE } from '@/lib/quiz/dob';
import { goalAfterTargetWeight } from '@/lib/quiz/fitness-goal';
import type { QuizStep } from '@/lib/quiz/steps';
import { formatHeight, formatWeight } from '@/lib/quiz/units';
import { useUnits } from '@/lib/quiz/use-units';
import { bmi, bmiCategory } from '@/lib/tdee/insights';
import { cn } from '@/lib/utils';
import { isMetricValueValid, MetricInput, parseMetricDraft } from './metric-input';
import { QuizStepFrame } from './quiz-step-frame';
import { UnitFields } from './unit-fields';

function useDraftNumber(field: keyof OnboardingPayload) {
  const saved = useQuizStore((s) => s.data[field]);
  return useState(saved != null ? String(saved) : '');
}

function getGoalLabel(copy: Copy, goal?: OnboardingPayload['fitness_goal']) {
  return copy.goal.options.find((item) => item.key === goal)?.label ?? copy.body_review.goalFallback;
}

export function BodyBasicsStep() {
  const router = useRouter();
  const copy = useCopy();
  const data = useQuizStore((s) => s.data);
  const setData = useQuizStore((s) => s.setData);
  const [age, setAge] = useDraftNumber('birth_year');
  const ageValid = isMetricValueValid(age, 1900, new Date().getFullYear() - MIN_AGE);

  return (
    <QuizStepFrame title={copy.body_basics.question} hint={copy.body_basics.hint}>
      <div className="grid grid-cols-2 gap-3">
        {copy.sex.options.map((option) => (
          <OptionCard
            key={option.key}
            label={option.label}
            selected={data.gender === option.key}
            onClick={() => setData({ gender: option.key as OnboardingPayload['gender'] })}
          />
        ))}
      </div>
      <MetricInput
        id="body-basics-age"
        label={copy.age.label}
        unit={copy.age.unit}
        value={age}
        min={12}
        max={100}
        step={1}
        hint={copy.age.hint}
        error={age && !ageValid ? copy.metric.rangeError(copy.age.label, MIN_AGE, 100, copy.age.unit) : undefined}
        onChange={setAge}
        onBlur={() => null}
      />
      <div className="mt-auto pt-5">
        <PrimaryButton
          disabled={!data.gender || !ageValid}
          onClick={() => {
            const parsed = parseMetricDraft(age);
            if (!parsed) return;
            setData({ birth_year: parsed, birth_month: 1, birth_day: 1 });
            goToNextQuizStep(router, 'sex');
          }}
        >
          {copy.common.continue}
        </PrimaryButton>
      </div>
    </QuizStepFrame>
  );
}

export function BodyMetricsStep() {
  const router = useRouter();
  const copy = useCopy();
  const setData = useQuizStore((s) => s.setData);
  const [height, setHeight] = useDraftNumber('height_cm');
  const [weight, setWeight] = useDraftNumber('weight_kg');
  const heightValid = isMetricValueValid(height, 100, 230);
  const weightValid = isMetricValueValid(weight, 30, 250);

  return (
    <QuizStepFrame title={copy.body_metrics.question} hint={copy.body_metrics.hint} className="gap-3">
      <MetricInput
        id="body-metrics-height"
        label={copy.height.heightLabel}
        unit={copy.height.heightUnit}
        value={height}
        min={100}
        max={230}
        step={1}
        hint={copy.height.heightHint}
        error={height && !heightValid ? copy.metric.rangeError(copy.height.heightLabel, 100, 230, copy.height.heightUnit) : undefined}
        onChange={setHeight}
        onBlur={() => null}
      />
      <MetricInput
        id="body-metrics-weight"
        label={copy.weight.weightLabel}
        unit={copy.weight.weightUnit}
        value={weight}
        min={30}
        max={250}
        step={0.5}
        hint={copy.weight.weightHint}
        error={weight && !weightValid ? copy.metric.rangeError(copy.weight.weightLabel, 30, 250, copy.weight.weightUnit) : undefined}
        onChange={setWeight}
        onBlur={() => null}
      />
      <div className="mt-auto pt-3">
        <PrimaryButton
          disabled={!heightValid || !weightValid}
          onClick={() => {
            const heightCm = parseMetricDraft(height);
            const weightKg = parseMetricDraft(weight);
            if (!heightCm || !weightKg) return;
            setData({ height_cm: heightCm, weight_kg: weightKg });
            goToNextQuizStep(router, 'height');
          }}
        >
          {copy.common.continue}
        </PrimaryButton>
      </div>
    </QuizStepFrame>
  );
}

export function TargetWeightStep() {
  const router = useRouter();
  const copy = useCopy();
  const setData = useQuizStore((s) => s.setData);
  const data = useQuizStore((s) => s.data);
  const { system } = useUnits();
  const locale = useLocale();
  const [touched, setTouched] = useState(false);
  // What the unit field reports: the target in kg, or null while what is typed is not valid.
  const [targetValue, setTargetValue] = useState<number | null>(null);
  const valid = targetValue != null;
  const currentValue = data.weight_kg;
  const currentAge = data.age ?? deriveAge(data);
  const hasValidBmiContext = currentAge != null
    && typeof data.height_cm === 'number' && Number.isFinite(data.height_cm) && data.height_cm > 0;
  const targetBmi = targetValue != null && hasValidBmiContext
    ? bmi(targetValue, data.height_cm!)
    : null;
  const targetBmiCategory = targetBmi != null && currentAge != null && currentAge >= 18
    ? bmiCategory(targetBmi)
    : null;
  // BMI cut-offs are for adults; teens keep the plain picker.
  const adultHeight = hasValidBmiContext && currentAge != null && currentAge >= 18 ? data.height_cm! : null;
  const healthyLowKg = adultHeight ? weightAtBmi(HEALTHY_BMI_LOW, adultHeight) : null;
  const healthyHighKg = adultHeight ? weightAtBmi(HEALTHY_BMI_HIGH, adultHeight) : null;
  const floorKg = healthyLowKg != null ? Math.ceil(healthyLowKg) : null;
  const tooLow = targetValue != null && floorKg != null && targetValue < floorKg && targetValue < (currentValue ?? Infinity);
  const goalBadge = (() => {
    const goal = data.fitness_goal;
    if (!goal || currentValue == null || targetValue == null || data.target_weight_unsure) return null;

    // Shows the goal that Continue will save, so a target that points the other way is visible here.
    const nextGoal = goalAfterTargetWeight(goal, currentValue, targetValue) ?? goal;
    const goalChanged = nextGoal !== goal;
    const bmiAligned = targetBmiCategory == null || targetBmiCategory === 'normal';
    const directionStatus = goalChanged
      ? copy.target_weight.goalBadge.changed
      : copy.target_weight.goalBadge.aligned;
    const bmiInsight = targetBmi == null
      ? null
      : targetBmiCategory != null
        ? `${copy.target_weight.bmiTargetLabel} ${targetBmi.toFixed(1)} · ${copy.target_weight.bmiCategory[targetBmiCategory]}`
        : `${copy.target_weight.bmiTargetLabel} ${targetBmi.toFixed(1)} · ${copy.target_weight.bmiAgeHint}`;

    return {
      label: copy.target_weight.goalBadge[nextGoal],
      status: bmiAligned
        ? directionStatus
        : `${directionStatus} · ${copy.target_weight.goalBadge.bmiAdjust}`,
      recommendation: goalChanged
        ? copy.target_weight.goalBadge.changedBody
        : copy.target_weight.goalBadge.alignedBody,
      bmiInsight,
      healthy: targetBmiCategory === 'normal' || (targetBmiCategory == null && !goalChanged),
      changed: goalChanged,
    };
  })();

  return (
    <QuizStepFrame title={copy.target_weight.question} description={copy.funnel.targetHint} className="gap-2">
      <div className="relative flex flex-1 flex-col items-center">
        {/* Where they start, beside the wheel's selected row, so the target reads as a move from it. */}
        <div className="pointer-events-none absolute left-0 top-[calc(50%+1.6rem)] -translate-y-1/2 whitespace-nowrap">
          <span className="block text-[0.68rem] font-bold text-muted-brand">{copy.target_weight.currentLabel}</span>
          <span className="text-[0.95rem] font-extrabold leading-none tracking-tight text-slate-brand">
            {data.weight_kg != null ? formatWeight(data.weight_kg, system, locale) : '—'}
          </span>
        </div>
        <div className="relative flex w-56 max-w-[58vw] flex-1 flex-col">
          <UnitFields
            measure="weight"
            id="target-weight"
            label={copy.target_weight.label}
            initialValue={data.target_weight_kg ?? presetTargetWeight(data.fitness_goal, data.weight_kg, data.height_cm)}
            unit={copy.target_weight.unit}
            min={30}
            max={250}
            variant="hero"
            showError={touched && system !== 'metric'}
            onChange={setTargetValue}
            onBlur={() => setTouched(true)}
          />
        </div>
      </div>
      {tooLow && floorKg != null ? (
        <p role="alert" className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-extrabold leading-snug text-amber-900">
          {copy.funnel.targetTooLow(formatWeight(floorKg, system, locale))}
        </p>
      ) : null}
      {healthyLowKg != null && healthyHighKg != null && (
        <p className="text-center text-xs font-bold text-muted-brand">
          {copy.funnel.healthyRange(formatWeight(healthyLowKg, system, locale), formatWeight(healthyHighKg, system, locale))}
        </p>
      )}
      {/* With the healthy range shown, the badge only needs to appear when the target flips the goal. */}
      {goalBadge && !tooLow && (goalBadge.changed || healthyLowKg == null) && (
        <section
          role="group"
          aria-label={`${goalBadge.label} ${goalBadge.status}`}
          className={cn(
            'quiz-goal-badge flex items-start gap-3 rounded-2xl px-4 py-3 shadow-sm',
            goalBadge.healthy ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900',
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              'mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-sm font-black text-white',
              goalBadge.healthy ? 'bg-emerald-500' : 'bg-amber-500',
            )}
          >
            {goalBadge.healthy ? '✓' : '!'}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-extrabold leading-snug">
              {goalBadge.label} · {goalBadge.status}
            </p>
            <p className="mt-1 text-xs font-semibold leading-relaxed opacity-75">
              {goalBadge.bmiInsight ?? goalBadge.recommendation}
            </p>
            {goalBadge.bmiInsight && (
              <p className="quiz-goal-badge-note mt-1 text-xs font-semibold leading-relaxed opacity-75">{goalBadge.recommendation}</p>
            )}
          </div>
        </section>
      )}
      <div className="quiz-number-actions mt-auto flex flex-col gap-2 pt-3">
        <button
          type="button"
          onClick={() => {
            setData({ target_weight_kg: undefined, target_weight_unsure: true });
            goToNextQuizStep(router, 'target_weight');
          }}
          className="min-h-11 rounded-xl px-4 text-[15px] font-semibold text-teal-brand active:opacity-60"
        >
          {copy.target_weight.unsure}
        </button>
        <PrimaryButton
          disabled={!valid || tooLow}
          onClick={() => {
            if (targetValue == null || tooLow) return;
            setData({
              target_weight_kg: targetValue,
              target_weight_unsure: false,
              fitness_goal: goalAfterTargetWeight(data.fitness_goal, data.weight_kg, targetValue),
            });
            goToNextQuizStep(router, 'target_weight');
          }}
        >
          {copy.common.continue}
        </PrimaryButton>
      </div>
    </QuizStepFrame>
  );
}

export function BodyReviewStep() {
  const router = useRouter();
  const copy = useCopy();
  const locale = useLocale();
  const data = useQuizStore((s) => s.data);
  const setData = useQuizStore((s) => s.setData);
  const { system } = useUnits();
  const review = copy.body_review;
  const age = deriveAge(data);
  type ReviewRow = { label: string; value: string; step: QuizStep };
  const candidates: Array<ReviewRow | null> = [
    data.fitness_goal ? { label: review.goalLabel, value: getGoalLabel(copy, data.fitness_goal), step: 'goal' as const } : null,
    age ? { label: review.ageLabel, value: String(age), step: 'age' as const } : null,
    data.height_cm ? { label: review.heightLabel, value: formatHeight(data.height_cm, system), step: 'height' as const } : null,
    data.weight_kg ? { label: review.weightLabel, value: formatWeight(data.weight_kg, system, locale), step: 'weight' as const } : null,
    data.target_weight_kg
      ? { label: review.targetWeightLabel, value: formatWeight(data.target_weight_kg, system, locale), step: 'target_weight' as const }
      : data.target_weight_unsure ? { label: review.targetWeightLabel, value: review.targetWeightPending, step: 'target_weight' as const } : null,
  ];
  const rows = candidates.filter((row): row is ReviewRow => row != null);

  return (
    <QuizStepFrame title={copy.funnel.reviewTitle} hint={copy.funnel.reviewHint} titleClassName="max-w-[22rem]">
      <div className="rounded-[1.5rem] bg-white/86 p-2 shadow-[0_18px_48px_rgb(26_71_57_/_0.10)]">
        {rows.map((row) => (
          <button
            key={row.label}
            type="button"
            onClick={() => goToQuizStep(router, row.step)}
            className="flex w-full items-center justify-between gap-3 rounded-xl border-b border-border-brand/60 px-2 py-3 text-left transition last:border-0 hover:bg-mist/60 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-brand/20"
          >
            <span className="text-sm font-bold text-muted-brand">{row.label}</span>
            <span className="flex items-center gap-2 text-right text-base font-extrabold text-forest">
              {row.value}
              <span className="text-xs font-extrabold text-teal-brand underline underline-offset-2">{copy.funnel.reviewEdit}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="mt-auto pt-5">
        <PrimaryButton
          onClick={() => {
            setData({ body_review_confirmed_at: new Date().toISOString() });
          goToNextQuizStep(router, 'body_review');
          }}
        >
          {copy.body_review.cta}
        </PrimaryButton>
      </div>
    </QuizStepFrame>
  );
}

export function RoutineStep() {
  const router = useRouter();
  const copy = useCopy();
  const data = useQuizStore((s) => s.data);
  const setData = useQuizStore((s) => s.setData);
  const trainingDays = data.training_days_per_week;
  const durationRequired = trainingDays != null && trainingDays > 0;

  return (
    <QuizStepFrame title={copy.routine.question} hint={copy.routine.hint} titleClassName="text-[1.65rem]">
      <div className="grid gap-3">
        <p className="text-xs font-extrabold tracking-[0.02em] text-teal-brand">{copy.routine.dailyActivityLabel}</p>
        {copy.activity_level.options.map((option) => (
          <OptionCard
            key={option.key}
            compact
            label={option.label}
            selected={data.job_type === option.key}
            onClick={() => setData({ job_type: option.key as OnboardingPayload['job_type'] })}
          />
        ))}
      </div>
      <div className="grid gap-3">
        <p className="text-xs font-extrabold tracking-[0.02em] text-teal-brand">{copy.routine.trainingLabel}</p>
        <div className="grid grid-cols-6 gap-2">
          {[0, 1, 2, 3, 4, 5].map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => setData({ training_days_per_week: days, training_minutes_per_session: days === 0 ? 0 : data.training_minutes_per_session })}
              className={`h-12 rounded-2xl text-sm font-extrabold shadow-sm transition ${
                trainingDays === days ? 'bg-forest text-white' : 'bg-white/82 text-forest'
              }`}
            >
              {days === 5 ? '5+' : days}
            </button>
          ))}
        </div>
      </div>
      {durationRequired && (
        <div className="grid grid-cols-4 gap-2">
          {[30, 45, 60, 90].map((minutes) => (
            <button
              key={minutes}
              type="button"
              onClick={() => setData({ training_minutes_per_session: minutes })}
              className={`rounded-2xl px-2 py-3 text-xs font-extrabold shadow-sm transition ${
                data.training_minutes_per_session === minutes ? 'bg-teal-brand text-white' : 'bg-white/82 text-forest'
              }`}
            >
              {minutes} {copy.routine.minuteUnit}
            </button>
          ))}
        </div>
      )}
      <div className="mt-auto pt-4">
        <PrimaryButton
          disabled={!data.job_type || trainingDays == null || (durationRequired && !data.training_minutes_per_session)}
          onClick={() => goToNextQuizStep(router, 'activity_level')}
        >
          {copy.common.continue}
        </PrimaryButton>
      </div>
    </QuizStepFrame>
  );
}
