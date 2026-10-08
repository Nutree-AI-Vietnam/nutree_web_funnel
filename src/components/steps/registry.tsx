'use client';

import type { ComponentType } from 'react';
import { useCopy } from '@/lib/copy/use-copy';
import type { QuizStep } from '@/lib/quiz/steps';
import { CalculatingStep } from './calculating';
import { BirthDateStep } from './birth-date-step';
import {
  BodyReviewStep,
  TargetWeightStep,
} from './final-web-steps';
import { CarePauseStep, WelcomeStep, ScienceStep, ScienceSourcesStep, PreviewStep } from './impression-steps';
import { MultiChoiceStep } from './multi-choice';
import { NumberInputStep } from './number-input-step';
import { ReflectionStep } from './reflection';
import { SingleChoiceStep } from './single-choice';
import { TdeeTargetsStep } from './tdee-targets';
import { NameAskStep } from './text-input-step';
import { TrainingDaysStep, TrainingDurationStep } from './training-days';
import { ProgressStep } from './progress';

/**
 * slug -> screen component. Every QuizStep must have an entry (registry check in page.tsx).
 * Each entry is a component, so screens that need copy read it with `useCopy()` and
 * re-render live when the active locale changes.
 */
export const STEP_COMPONENTS: Record<QuizStep, ComponentType> = {
  goal: function GoalStep() {
    const c = useCopy();
    return (
      <SingleChoiceStep
        step="goal"
        field="fitness_goal"
        question={c.goal.question}
        options={c.goal.options}
      />
    );
  },
  name_ask: () => <NameAskStep step="name_ask" />,
  welcome: () => <WelcomeStep />,
  challenges: function ChallengesStep() {
    const c = useCopy();
    return (
      <MultiChoiceStep
        step="challenges"
        field="pain_points"
        question={c.challenges.question}
        hint={c.challenges.hint}
        options={c.challenges.options}
      />
    );
  },
  duration: function DurationStep() {
    const c = useCopy();
    return (
      <SingleChoiceStep
        step="duration"
        field="challenge_duration"
        question={c.duration.question}
        options={c.duration.options}
      />
    );
  },
  motivation: function MotivationStep() {
    const c = useCopy();
    return (
      <SingleChoiceStep
        step="motivation"
        field="motivation"
        question={c.motivation.question}
        options={c.motivation.options}
      />
    );
  },
  reflection: () => <ReflectionStep />,
  sex: function SexStep() {
    const c = useCopy();
    return <SingleChoiceStep step="sex" field="gender" question={c.sex.question} options={c.sex.options} />;
  },
  age: () => <BirthDateStep />,
  height: function HeightStep() {
    const c = useCopy();
    return (
      <NumberInputStep
        step="height"
        field="height_cm"
        question={c.height.question}
        unit={c.height.heightUnit}
        min={100}
        max={230}
      />
    );
  },
  weight: function WeightStep() {
    const c = useCopy();
    return (
      <NumberInputStep
        step="weight"
        field="weight_kg"
        question={c.weight.question}
        unit={c.weight.weightUnit}
        min={30}
        max={250}
      />
    );
  },
  target_weight: () => <TargetWeightStep />,
  body_review: () => <BodyReviewStep />,
  science: () => <ScienceStep />,
  science_sources: () => <ScienceSourcesStep />,
  activity_level: function ActivityLevelStep() {
    const c = useCopy();
    return (
      <SingleChoiceStep
        step="activity_level"
        field="job_type"
        question={c.activity_level.question}
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
        hint={c.diet.hint}
        options={c.diet.options}
      />
    );
  },
  support_style: function SupportStyleStep() {
    const c = useCopy();
    return (
      <SingleChoiceStep
        step="support_style"
        field="support_style"
        question={c.support_style.question}
        options={c.support_style.options}
      />
    );
  },
  preview: () => <PreviewStep />,
  care_pause: () => <CarePauseStep />,
  calculating: () => <CalculatingStep />,
  result: () => <TdeeTargetsStep />,
  progress: () => <ProgressStep />,
};
