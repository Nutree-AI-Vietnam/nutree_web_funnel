'use client';

import type { ComponentType } from 'react';
import { GoalEntryFooter } from '@/components/goal-entry-footer';
import { useCopy } from '@/lib/copy/use-copy';
import { SKIP_LANDING } from '@/lib/funnel/skip-landing';
import type { QuizStep } from '@/lib/quiz/steps';
import { CalculatingStep } from './calculating';
import { BirthDateStep } from './birth-date-step';
import {
  BodyReviewStep,
  TargetWeightStep,
} from './final-web-steps';
import { NotAloneStep, StepGoalStep, WelcomeStep } from './impression-steps';
import { MultiChoiceStep } from './multi-choice';
import { NumberInputStep } from './number-input-step';
import { ReflectionStep } from './reflection';
import { SingleChoiceStep } from './single-choice';
import { TdeeTargetsStep } from './tdee-targets';
import { NameAskStep } from './text-input-step';
import { TrainingDaysStep, TrainingDurationStep } from './training-days';
import { ProgressStep } from './progress';
import { AgeGroupStep } from './age-group-step';
import { ChallengeStep } from './challenge-step';
import { ConfidenceStep } from './confidence-step';
import { GoalChoice } from './goal-choice';
import { WeightStep } from './weight-step';

/**
 * slug -> screen component. Every QuizStep must have an entry (registry check in page.tsx).
 * Each entry is a component, so screens that need copy read it with `useCopy()` and
 * re-render live when the active locale changes.
 */
export const STEP_COMPONENTS: Record<QuizStep, ComponentType> = {
  goal: function GoalStep() {
    return (
      <>
        <GoalChoice />
        {SKIP_LANDING ? <GoalEntryFooter /> : null}
      </>
    );
  },
  age_group: () => <AgeGroupStep />,
  name_ask: () => <NameAskStep step="name_ask" />,
  welcome: () => <WelcomeStep />,
  not_alone: () => <NotAloneStep />,
  step_goal: () => <StepGoalStep />,
  challenges: () => <ChallengeStep />,
  motivation: function MotivationStep() {
    const c = useCopy();
    return (
      <SingleChoiceStep
        step="motivation"
        field="motivation"
        question={c.motivation.question}
        description={c.motivation.description}
        options={c.motivation.options}
      />
    );
  },
  reflection: () => <ReflectionStep />,
  sex: function SexStep() {
    const c = useCopy();
    return <SingleChoiceStep step="sex" field="gender" question={c.sex.question} description={c.sex.description} options={c.sex.options} />;
  },
  age: () => <BirthDateStep />,
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
  body_review: () => <BodyReviewStep />,
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
  training_duration: function TrainingDurationQuizStep() {
    const c = useCopy();
    return (
      <TrainingDurationStep
        question={c.training_duration.question}
        description={c.training_duration.description}
        options={c.training_duration.options}
      />
    );
  },
  eating_pattern: function EatingPatternStep() {
    const c = useCopy();
    return (
      <SingleChoiceStep
        step="eating_pattern"
        field="hardest_eating_moment"
        question={c.eating_pattern.question}
        description={c.eating_pattern.description}
        options={c.eating_pattern.options}
      />
    );
  },
  diet: function DietStep() {
    const c = useCopy();
    return (
      <MultiChoiceStep
        step="diet"
        field="dietary_preferences"
        question={c.diet.question}
        description={c.diet.description}
        hint={c.diet.hint}
        options={c.diet.options}
        ctaLabel={c.diet.cta}
      />
    );
  },
  calculating: () => <CalculatingStep />,
  result: () => <TdeeTargetsStep />,
  progress: () => <ProgressStep />,
  confidence: () => <ConfidenceStep />,
};
