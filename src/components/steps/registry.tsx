'use client';

import type { ComponentType } from 'react';
import { useCopy } from '@/lib/copy/use-copy';
import type { QuizStep } from '@/lib/quiz/steps';
import { CalculatingStep } from './calculating';
import {
  BodyReviewStep,
  TargetWeightStep,
} from './final-web-steps';
import { MultiChoiceStep } from './multi-choice';
import { NumberInputStep } from './number-input-step';
import { ReflectionStep } from './reflection';
import { SingleChoiceStep } from './single-choice';
import { TdeeTargetsStep } from './tdee-targets';
import { NameAskStep } from './text-input-step';
import { TrainingDaysStep, TrainingDurationStep } from './training-days';

/**
 * slug -> screen component. Every QuizStep must have an entry (registry check in page.tsx).
 * Each entry is a component, so screens that need copy read it with `useCopy()` and
 * re-render live when the active locale changes.
 */
export const STEP_COMPONENTS: Record<QuizStep, ComponentType> = {
  goal: () => {
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
  challenges: () => {
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
  duration: () => {
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
  motivation: () => {
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
  sex: () => {
    const c = useCopy();
    return <SingleChoiceStep step="sex" field="gender" question={c.sex.question} options={c.sex.options} />;
  },
  age: () => {
    const c = useCopy();
    return (
      <NumberInputStep
        step="age"
        field="age"
        question={c.age.question}
        unit={c.age.unit}
        min={18}
        max={100}
      />
    );
  },
  height: () => {
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
  weight: () => {
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
  activity_level: () => {
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
  training_duration: () => {
    const c = useCopy();
    return (
      <TrainingDurationStep
        question={c.training_duration.question}
        options={c.training_duration.options}
      />
    );
  },
  eating_pattern: () => {
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
  diet: () => {
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
  support_style: () => {
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
  calculating: () => <CalculatingStep />,
  result: () => <TdeeTargetsStep />,
};
