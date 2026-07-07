'use client';

import type { ComponentType } from 'react';
import { vi } from '@/lib/copy/vi';
import type { QuizStep } from '@/lib/quiz/steps';
import { CalculatingStep } from './calculating';
import { HeightWeightStep } from './height-weight';
import { MultiChoiceStep } from './multi-choice';
import { NumberInputStep } from './number-input-step';
import { PromoStep } from './promo';
import { ReflectionStep } from './reflection';
import { ResultPromisingStep } from './result-promising';
import { SingleChoiceStep } from './single-choice';
import { TdeeTargetsStep } from './tdee-targets';
import { NameAskStep } from './text-input-step';
import { TrainingDaysStep, TrainingDurationStep } from './training-days';

/** slug -> screen component. Every QuizStep must have an entry (registry check in page.tsx). */
export const STEP_COMPONENTS: Record<QuizStep, ComponentType> = {
  name_ask: () => <NameAskStep step="name_ask" />,
  goal: () => (
    <SingleChoiceStep
      step="goal"
      field="fitness_goal"
      question={vi.goal.question}
      options={vi.goal.options}
    />
  ),
  target_weight: () => (
    <NumberInputStep
      step="target_weight"
      field="target_weight_kg"
      question={vi.target_weight.question}
      unit={vi.target_weight.unit}
      min={30}
      max={250}
    />
  ),
  challenges: () => (
    <MultiChoiceStep
      step="challenges"
      field="pain_points"
      question={vi.challenges.question}
      hint={vi.challenges.hint}
      options={vi.challenges.options}
    />
  ),
  referral_source: () => (
    <MultiChoiceStep
      step="referral_source"
      field="referral_sources"
      question={vi.referral_source.question}
      options={vi.referral_source.options}
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
      min={13}
      max={100}
    />
  ),
  height_weight: () => <HeightWeightStep />,
  body_fat: () => (
    <NumberInputStep
      step="body_fat"
      field="body_fat_percentage"
      question={vi.body_fat.question}
      unit={vi.body_fat.unit}
      min={3}
      max={60}
      hint={vi.body_fat.hint}
      optional
    />
  ),
  training_days: () => <TrainingDaysStep />,
  training_duration: () => (
    <TrainingDurationStep
      question={vi.training_duration.question}
      options={vi.training_duration.options}
    />
  ),
  experience: () => (
    <SingleChoiceStep
      step="experience"
      field="experience_level"
      question={vi.experience.question}
      options={vi.experience.options}
    />
  ),
  training_type: () => (
    <MultiChoiceStep
      step="training_type"
      field="training_types"
      question={vi.training_type.question}
      hint={vi.training_type.hint}
      options={vi.training_type.options}
    />
  ),
  activity_level: () => (
    <SingleChoiceStep
      step="activity_level"
      field="job_type"
      question={vi.activity_level.question}
      options={vi.activity_level.options}
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
  tdee_science_promo: () => (
    <PromoStep
      step="tdee_science_promo"
      emoji="🔬"
      headline={vi.tdee_science_promo.headline}
      body={vi.tdee_science_promo.body}
    />
  ),
  smart_macro_promo: () => (
    <PromoStep
      step="smart_macro_promo"
      emoji="🥗"
      headline={vi.smart_macro_promo.headline}
      body={vi.smart_macro_promo.body}
    />
  ),
  smart_meals_promo: () => (
    <PromoStep
      step="smart_meals_promo"
      emoji="🤖"
      headline={vi.smart_meals_promo.headline}
      body={vi.smart_meals_promo.body}
    />
  ),
  calculating: () => <CalculatingStep />,
  tdee_targets: () => <TdeeTargetsStep />,
  result_promising: () => <ResultPromisingStep />,
};
