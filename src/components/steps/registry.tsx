'use client';

import type { ComponentType } from 'react';
import { vi } from '@/lib/copy/vi';
import type { QuizStep } from '@/lib/quiz/steps';
import { CalculatingStep } from './calculating';
import {
  BodyReviewStep,
  PlanSummaryStep,
  TargetWeightStep,
} from './final-web-steps';
import { MultiChoiceStep } from './multi-choice';
import { NumberInputStep } from './number-input-step';
import { ReflectionStep } from './reflection';
import { SingleChoiceStep } from './single-choice';
import { TdeeTargetsStep } from './tdee-targets';
import { NameAskStep } from './text-input-step';
import { TrainingDaysStep, TrainingDurationStep } from './training-days';

/** slug -> screen component. Every QuizStep must have an entry (registry check in page.tsx). */
export const STEP_COMPONENTS: Record<QuizStep, ComponentType> = {
  goal: () => (
    <SingleChoiceStep
      step="goal"
      field="fitness_goal"
      question={vi.goal.question}
      options={vi.goal.options}
    />
  ),
  name_ask: () => <NameAskStep step="name_ask" />,
  challenges: () => (
    <MultiChoiceStep
      step="challenges"
      field="pain_points"
      question={vi.challenges.question}
      hint={vi.challenges.hint}
      options={vi.challenges.options}
    />
  ),
  duration: () => (
    <SingleChoiceStep
      step="duration"
      field="challenge_duration"
      question={vi.duration.question}
      options={vi.duration.options}
    />
  ),
  motivation: () => (
    <SingleChoiceStep
      step="motivation"
      field="motivation"
      question={vi.motivation.question}
      options={vi.motivation.options}
    />
  ),
  reflection: () => <ReflectionStep />,
  sex: () => (
    <SingleChoiceStep step="sex" field="gender" question={vi.sex.question} options={vi.sex.options} />
  ),
  age: () => (
    <NumberInputStep
      step="age"
      field="age"
      question={vi.age.question}
      unit={vi.age.unit}
      min={18}
      max={100}
    />
  ),
  height: () => (
    <NumberInputStep
      step="height"
      field="height_cm"
      question={vi.height.question}
      unit={vi.height.heightUnit}
      min={100}
      max={230}
    />
  ),
  weight: () => (
    <NumberInputStep
      step="weight"
      field="weight_kg"
      question={vi.weight.question}
      unit={vi.weight.weightUnit}
      min={30}
      max={250}
    />
  ),
  target_weight: () => <TargetWeightStep />,
  body_review: () => <BodyReviewStep />,
  activity_level: () => (
    <SingleChoiceStep
      step="activity_level"
      field="job_type"
      question={vi.activity_level.question}
      options={vi.activity_level.options}
    />
  ),
  training_days: () => <TrainingDaysStep />,
  training_duration: () => (
    <TrainingDurationStep
      question={vi.training_duration.question}
      options={vi.training_duration.options}
    />
  ),
  eating_pattern: () => (
    <SingleChoiceStep
      step="eating_pattern"
      field="hardest_eating_moment"
      question={vi.eating_pattern.question}
      options={vi.eating_pattern.options}
    />
  ),
  diet: () => (
    <MultiChoiceStep
      step="diet"
      field="dietary_preferences"
      question={vi.diet.question}
      hint={vi.diet.hint}
      options={vi.diet.options}
    />
  ),
  support_style: () => (
    <SingleChoiceStep
      step="support_style"
      field="support_style"
      question={vi.support_style.question}
      options={vi.support_style.options}
    />
  ),
  plan_summary: () => <PlanSummaryStep />,
  calculating: () => <CalculatingStep />,
  result: () => <TdeeTargetsStep />,
};
