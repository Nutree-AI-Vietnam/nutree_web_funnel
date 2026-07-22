'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { OptionCard } from '@/components/option-card';
import { PrimaryButton } from '@/components/primary-button';
import { vi } from '@/lib/copy/vi';
import { nextRoute } from '@/lib/quiz/steps';
import { useQuizStore } from '@/lib/quiz/store';
import type { OnboardingPayload } from '@/lib/quiz/types';
import { computeTdeeResult } from '@/lib/tdee/calculator';
import { isMetricValueValid, MetricInput, parseMetricDraft } from './metric-input';
import { QuizStepFrame } from './quiz-step-frame';

function useDraftNumber(field: keyof OnboardingPayload, fallback: number) {
  const saved = useQuizStore((s) => s.data[field]);
  return useState(saved != null ? String(saved) : String(fallback));
}

function getGoalLabel(goal?: OnboardingPayload['fitness_goal']) {
  return vi.goal.options.find((item) => item.key === goal)?.label ?? 'mục tiêu hiện tại';
}

export function BodyBasicsStep() {
  const router = useRouter();
  const data = useQuizStore((s) => s.data);
  const setData = useQuizStore((s) => s.setData);
  const [age, setAge] = useDraftNumber('age', 30);
  const ageValid = isMetricValueValid(age, 18, 100);

  return (
    <QuizStepFrame title={vi.body_basics.question} hint={vi.body_basics.hint}>
      <div className="grid grid-cols-2 gap-3">
        {vi.sex.options.map((option) => (
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
        label={vi.age.label}
        unit={vi.age.unit}
        value={age}
        min={18}
        max={100}
        step={1}
        hint={vi.age.hint}
        error={age && !ageValid ? vi.metric.rangeError(vi.age.label, 18, 100, vi.age.unit) : undefined}
        onChange={setAge}
        onBlur={() => null}
      />
      <div className="mt-auto pt-5">
        <PrimaryButton
          disabled={!data.gender || !ageValid}
          onClick={() => {
            const parsed = parseMetricDraft(age);
            if (!parsed) return;
            setData({ age: parsed });
            router.push(nextRoute('sex'));
          }}
        >
          {vi.common.continue}
        </PrimaryButton>
      </div>
    </QuizStepFrame>
  );
}

export function BodyMetricsStep() {
  const router = useRouter();
  const setData = useQuizStore((s) => s.setData);
  const [height, setHeight] = useDraftNumber('height_cm', 170);
  const [weight, setWeight] = useDraftNumber('weight_kg', 60);
  const heightValid = isMetricValueValid(height, 100, 230);
  const weightValid = isMetricValueValid(weight, 30, 250);

  return (
    <QuizStepFrame title={vi.body_metrics.question} hint={vi.body_metrics.hint} className="gap-3">
      <MetricInput
        id="body-metrics-height"
        label={vi.height.heightLabel}
        unit={vi.height.heightUnit}
        value={height}
        min={100}
        max={230}
        step={1}
        hint={vi.height.heightHint}
        error={height && !heightValid ? vi.metric.rangeError(vi.height.heightLabel, 100, 230, vi.height.heightUnit) : undefined}
        onChange={setHeight}
        onBlur={() => null}
      />
      <MetricInput
        id="body-metrics-weight"
        label={vi.weight.weightLabel}
        unit={vi.weight.weightUnit}
        value={weight}
        min={30}
        max={250}
        step={0.5}
        hint={vi.weight.weightHint}
        error={weight && !weightValid ? vi.metric.rangeError(vi.weight.weightLabel, 30, 250, vi.weight.weightUnit) : undefined}
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
            router.push(nextRoute('height'));
          }}
        >
          {vi.common.continue}
        </PrimaryButton>
      </div>
    </QuizStepFrame>
  );
}

export function TargetWeightStep() {
  const router = useRouter();
  const setData = useQuizStore((s) => s.setData);
  const data = useQuizStore((s) => s.data);
  const [target, setTarget] = useDraftNumber('target_weight_kg', Math.round(data.weight_kg ?? 60));
  const valid = isMetricValueValid(target, 30, 250);

  return (
    <QuizStepFrame title={vi.target_weight.question} hint={vi.target_weight.hint}>
      <MetricInput
        id="target-weight"
        label={vi.target_weight.label}
        unit={vi.target_weight.unit}
        value={target}
        min={30}
        max={250}
        step={1}
        onChange={setTarget}
        onBlur={() => null}
      />
      <button
        type="button"
        onClick={() => {
          setData({ target_weight_kg: undefined, target_weight_unsure: true });
          router.push(nextRoute('target_weight'));
        }}
        className="rounded-2xl border border-border-brand bg-white/78 px-4 py-3 text-left text-sm font-extrabold text-forest shadow-sm"
      >
        {vi.target_weight.unsure}
      </button>
      <div className="mt-auto pt-4">
        <PrimaryButton
          disabled={!valid}
          onClick={() => {
            const parsed = parseMetricDraft(target);
            if (!parsed) return;
            setData({ target_weight_kg: parsed, target_weight_unsure: false });
            router.push(nextRoute('target_weight'));
          }}
        >
          {vi.common.continue}
        </PrimaryButton>
      </div>
    </QuizStepFrame>
  );
}

export function BodyReviewStep() {
  const router = useRouter();
  const data = useQuizStore((s) => s.data);
  const setData = useQuizStore((s) => s.setData);
  const rows = [
    ['Mục tiêu', getGoalLabel(data.fitness_goal)],
    ['Tuổi', data.age ? `${data.age}` : 'Chưa có'],
    ['Chiều cao', data.height_cm ? `${data.height_cm} cm` : 'Chưa có'],
    ['Cân nặng', data.weight_kg ? `${data.weight_kg} kg` : 'Chưa có'],
    ['Mục tiêu cân nặng', data.target_weight_kg ? `${data.target_weight_kg} kg` : 'Sẽ chọn sau'],
  ];

  return (
    <QuizStepFrame title={vi.body_review.question} hint={vi.body_review.hint}>
      <div className="rounded-[1.5rem] bg-white/86 p-4 shadow-[0_18px_48px_rgb(26_71_57_/_0.10)]">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between border-b border-border-brand/60 py-3 last:border-0">
            <span className="text-sm font-bold text-muted-brand">{label}</span>
            <span className="text-right text-base font-extrabold text-forest">{value}</span>
          </div>
        ))}
      </div>
      <div className="mt-auto pt-5">
        <PrimaryButton
          onClick={() => {
            setData({ body_review_confirmed_at: new Date().toISOString() });
            router.push(nextRoute('body_review'));
          }}
        >
          {vi.body_review.cta}
        </PrimaryButton>
      </div>
    </QuizStepFrame>
  );
}

export function RoutineStep() {
  const router = useRouter();
  const data = useQuizStore((s) => s.data);
  const setData = useQuizStore((s) => s.setData);
  const trainingDays = data.training_days_per_week;
  const durationRequired = trainingDays != null && trainingDays > 0;

  return (
    <QuizStepFrame title={vi.routine.question} hint={vi.routine.hint} titleClassName="text-[1.65rem]">
      <div className="grid gap-3">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-teal-brand">Hoạt động hằng ngày</p>
        {vi.activity_level.options.map((option) => (
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
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-teal-brand">Tập luyện</p>
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
              {minutes} phút
            </button>
          ))}
        </div>
      )}
      <div className="mt-auto pt-4">
        <PrimaryButton
          disabled={!data.job_type || trainingDays == null || (durationRequired && !data.training_minutes_per_session)}
          onClick={() => router.push(nextRoute('activity_level'))}
        >
          {vi.common.continue}
        </PrimaryButton>
      </div>
    </QuizStepFrame>
  );
}

export function PlanSummaryStep() {
  const router = useRouter();
  const data = useQuizStore((s) => s.data);
  const preview = useMemo(() => computeTdeeResult(data), [data]);
  const calories = preview ? Math.round(preview.calories) : null;

  return (
    <QuizStepFrame title={vi.plan_summary.question} hint={vi.plan_summary.hint}>
      <section className="rounded-[1.6rem] bg-forest p-5 text-white shadow-[0_22px_64px_rgb(10_34_27_/_0.22)]">
        <p className="text-sm font-bold text-teal-brand">{getGoalLabel(data.fitness_goal)}</p>
        <div className="mt-2 text-[3rem] font-black leading-none">{calories ?? '...'}</div>
        <p className="mt-1 text-sm font-bold text-white/70">calo/ngày tạm tính</p>
      </section>
      <div className="grid gap-2">
        {vi.plan_summary.items.map((item) => (
          <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/82 px-4 py-3 text-sm font-extrabold text-forest shadow-sm">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-mist text-teal-brand">✓</span>
            {item}
          </div>
        ))}
      </div>
      <div className="mt-auto pt-4">
        <PrimaryButton onClick={() => router.push(nextRoute('plan_summary'))}>
          {vi.plan_summary.cta}
        </PrimaryButton>
      </div>
    </QuizStepFrame>
  );
}
