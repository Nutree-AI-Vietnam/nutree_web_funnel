import { describe, expect, it } from 'vitest';
import { vi } from '@/lib/copy/vi';
import { VI_QUIZ_STEPS, VI_STEP_KINDS } from './steps';

const BANNED = [
  /#\s*1\b/,
  /số\s*1\b/i,
  /5\s*sao/i,
  /★★/,
  /95\s*%/,
  /9\s*trên\s*10/i,
  /200\.000/,
  /4\.[78]\s*\/\s*5/,
  /App Store/i,
  /CH Play/,
  /tiểu đường/i,
  /diabetes/i,
  /\bNoom\b/i,
  /chữa\s*(khỏi|bệnh)/i,
  /điều trị/i,
  /chẩn đoán/i,
];

function stringsIn(value: unknown, found: string[] = []): string[] {
  if (typeof value === 'string') found.push(value);
  else if (typeof value === 'function') found.push(value('Minh', '60 kg', '1 tháng', 3));
  else if (Array.isArray(value)) value.forEach((item) => stringsIn(item, found));
  else if (value && typeof value === 'object') Object.values(value).forEach((item) => stringsIn(item, found));
  return found;
}

/** Copy the Vietnamese quiz actually shows. Paywall ratings stay out of this list. */
function viQuizSurfaceCopy(): string[] {
  const storySteps = ['aim', 'occasion', 'tried', 'obstacle', 'diet_style', 'weekend', 'trigger', 'with_you'] as const;
  return [
    ...stringsIn(vi.goal),
    ...stringsIn(vi.sex),
    ...stringsIn(vi.ageGroup),
    ...stringsIn(vi.bodyCurrent),
    ...stringsIn(vi.bodyTarget),
    ...stringsIn(vi.zones),
    ...stringsIn(vi.height),
    ...stringsIn(vi.weight),
    ...stringsIn(vi.target_weight.question),
    ...stringsIn(vi.activity_level),
    ...stringsIn(vi.training_days),
    ...stringsIn(vi.training_duration),
    ...stringsIn(vi.quizChapters),
    ...stringsIn(vi.insights),
    ...stringsIn(vi.planSummary),
    ...stringsIn(vi.tdee_targets.headline),
    ...stringsIn(vi.tdee_targets.aha),
    ...stringsIn(vi.tdee_targets.eyebrow),
    ...stringsIn(vi.funnel.loader),
    ...stringsIn(vi.calculating.highlights.filter((item) => !('quote' in item))),
    ...storySteps.flatMap((step) => stringsIn(vi.story[step])),
  ];
}

describe('Vietnamese survey copy', () => {
  it('has a title for every screen and no banned claim', () => {
    const titles = {
      goal: vi.goal.question,
      sex: vi.sex.question,
      age_group: vi.ageGroup.question,
      insight_pace: vi.insights.insight_pace.title,
      height: vi.height.question,
      weight: vi.weight.question,
      target_weight: vi.target_weight.question,
      progress: vi.progress.question,
      body_current: vi.bodyCurrent.question,
      body_target: vi.bodyTarget.question,
      zones: vi.zones.question,
      insight_body: vi.insights.insight_body.title,
      aim: vi.story.aim.question,
      occasion: vi.story.occasion.question,
      insight_why: vi.insights.insight_why.title,
      activity_level: vi.activity_level.question,
      training_days: vi.training_days.question,
      training_duration: vi.training_duration.question,
      insight_movement: vi.insights.insight_movement.title,
      tried: vi.story.tried.question,
      obstacle: vi.story.obstacle.question,
      insight_obstacle: vi.insights.insight_obstacle.title,
      diet_style: vi.story.diet_style.question,
      weekend: vi.story.weekend.question,
      trigger: vi.story.trigger.question,
      insight_habits: vi.insights.insight_habits.title,
      with_you: vi.story.with_you.title,
      calculating: vi.funnel.loader.titleFallback,
      result: vi.tdee_targets.headline,
    };
    expect(Object.keys(titles)).toEqual([...VI_QUIZ_STEPS]);
    for (const title of Object.values(titles)) expect(title.trim().length).toBeGreaterThan(0);

    const surfaces = viQuizSurfaceCopy();
    for (const text of surfaces) {
      for (const pattern of BANNED) {
        expect(text, `${pattern} matched ${text}`).not.toMatch(pattern);
      }
    }
    expect(VI_STEP_KINDS.calculating).toBe('loader');
    expect(VI_STEP_KINDS.result).toBe('plan');
  });
});
