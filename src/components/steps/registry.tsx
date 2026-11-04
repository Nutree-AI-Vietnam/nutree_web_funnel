'use client';

import type { ComponentType } from 'react';
import { GoalEntryFooter } from '@/components/goal-entry-footer';
import { useCopy } from '@/lib/copy/use-copy';
import { SKIP_LANDING } from '@/lib/funnel/skip-landing';
import type { QuizStep } from '@/lib/quiz/steps';
import { VI_FLOW_STEPS, type ViQuizStep } from '@/lib/quiz/vi-survey';
import { AgeGroupStep } from './age-group-step';
import { BodyShapeStep } from './body-shape-step';
import { CalculatingStep } from './calculating';
import { DayPlanStep } from './day-plan-step';
import { ProgressStep } from './progress';
import { TargetWeightStep } from './final-web-steps';
import { GoalChoice } from './goal-choice';
import { NumberInputStep } from './number-input-step';
import { InsightStep } from './insight-step';
import { NameAskStep } from './text-input-step';
import { MultiChoiceStep } from './multi-choice';
import { ProofStep } from './proof-step';
import { SexStep } from './sex-step';
import { BeatStep, StoryStep } from './story-step';
import { SingleChoiceStep } from './single-choice';
import { TdeeTargetsStep } from './tdee-targets';
import { TrainingDaysStep, TrainingDurationStep } from './training-days';
import { ViFlowStep } from './vi-flow-step';
import { WeightStep } from './weight-step';
import { ZonesStep } from './zones-step';

/**
 * slug -> screen component. Every QuizStep must have an entry (registry check in page.tsx).
 * Each entry is a component, so screens that need copy read it with `useCopy()` and
 * re-render live when the active locale changes.
 */
const flowComponents = Object.fromEntries(
  VI_FLOW_STEPS.map((step) => [step, function FlowScreen() {
    return <ViFlowStep step={step as ViQuizStep} />;
  }]),
) as Partial<Record<QuizStep, ComponentType>>;

export const STEP_COMPONENTS = {
  goal: function GoalStep() {
    return (
      <>
        <GoalChoice />
        {SKIP_LANDING ? <GoalEntryFooter /> : null}
      </>
    );
  },
  sex: () => <SexStep />,
  age_group: () => <AgeGroupStep />,
  proof: () => <ProofStep step="proof" />,
  insight_pace: () => <InsightStep step="insight_pace" />,
  first_name: () => <NameAskStep step="first_name" />,
  restrictions: function RestrictionsStep() {
    const c = useCopy();
    return (
      <MultiChoiceStep
        step="restrictions"
        field="dietary_preferences"
        question={c.diet.question}
        description={c.diet.description}
        hint={c.diet.hint}
        options={c.diet.options}
        ctaLabel={c.common.continue}
      />
    );
  },
  aim: () => <StoryStep step="aim" />,
  body_current: () => <BodyShapeStep kind="current" />,
  body_target: () => <BodyShapeStep kind="target" />,
  zones: () => <ZonesStep />,
  occasion: () => <StoryStep step="occasion" />,
  height: function HeightStep() {
    const c = useCopy();
    return (
      <NumberInputStep
        step="height"
        field="height_cm"
        question={c.height.question}
        hint={c.height.description}
        unit={c.height.heightUnit}
        min={100}
        max={230}
      />
    );
  },
  weight: () => <WeightStep />,
  target_weight: () => <TargetWeightStep />,
  progress: () => <ProgressStep step="progress" />,
  progress_habits: () => <ProgressStep step="progress_habits" />,
  progress_pace: () => <ProgressStep step="progress_pace" />,
  progress_final: () => <ProgressStep step="progress_final" />,
  tried: () => <StoryStep step="tried" />,
  obstacle: () => <StoryStep step="obstacle" />,
  diet_style: () => <StoryStep step="diet_style" />,
  weekend: () => <StoryStep step="weekend" />,
  trigger: () => <StoryStep step="trigger" />,
  with_you: () => <BeatStep step="with_you" />,
  activity_level: function ActivityLevelStep() {
    const c = useCopy();
    return (
      <SingleChoiceStep
        step="activity_level"
        field="job_type"
        question={c.activity_level.question}
        description={c.activity_level.description}
        options={c.activity_level.options}
      />
    );
  },
  training_days: () => <TrainingDaysStep />,
  training_duration: function TrainingDuration() {
    const c = useCopy();
    return (
      <TrainingDurationStep
        question={c.training_duration.question}
        description={c.training_duration.description}
        options={c.training_duration.options}
      />
    );
  },
  calculating: () => <CalculatingStep />,
  day_plan: () => <DayPlanStep />,
  result: () => <TdeeTargetsStep />,
  ...flowComponents,
} as Record<QuizStep, ComponentType>;
