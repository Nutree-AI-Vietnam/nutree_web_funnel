'use client';

import type { ComponentType } from 'react';
import { vi } from '@/lib/copy/vi';
import type { QuizStep } from '@/lib/quiz/steps';
import { MultiChoiceStep } from './multi-choice';
import { SingleChoiceStep } from './single-choice';

/** slug -> screen component. Every QuizStep must have an entry (registry check in page.tsx). */
export const STEP_COMPONENTS: Partial<Record<QuizStep, ComponentType>> = {
  goal: () => (
    <SingleChoiceStep
      step="goal"
      field="fitness_goal"
      question={vi.goal.question}
      options={vi.goal.options}
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
  sex: () => (
    <SingleChoiceStep step="sex" field="gender" question={vi.sex.question} options={vi.sex.options} />
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
};
