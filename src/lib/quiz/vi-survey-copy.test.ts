import { describe, expect, it } from 'vitest';
import { vi } from '@/lib/copy/vi';
import { VI_QUIZ_STEPS, VI_SURVEY } from './steps';
import { flowScreen, viFlowStrings } from './vi-survey';

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
  /huấn luyện viên/i,
  /coach người/i,
];

function titleFor(id: (typeof VI_QUIZ_STEPS)[number]): string {
  const screen = flowScreen(id);
  if (!screen) {
    const specialized: Record<string, string> = {
      goal: vi.goal.question,
      sex: vi.sex.question,
      age_group: vi.ageGroup.question,
      height: vi.height.question,
      weight: vi.weight.question,
      target_weight: vi.target_weight.question,
      zones: vi.zones.question,
      occasion: vi.story.occasion.question,
      with_you: vi.story.with_you.title,
      insight_pace: vi.insights.insight_pace.title,
      progress: vi.progress.question,
      progress_habits: vi.progress.question,
      progress_pace: vi.progress.question,
      progress_final: vi.progress.question,
      first_name: vi.name_ask.question,
      restrictions: vi.diet.question,
      activity_level: vi.activity_level.question,
      training_days: vi.training_days.question,
      training_duration: vi.training_duration.question,
      obstacle: vi.story.obstacle.question,
      diet_style: vi.story.diet_style.question,
      aim: vi.story.aim.question,
      calculating: vi.funnel.loader.titleFallback,
      day_plan: vi.funnel.plan.eyebrowFallback,
      result: vi.tdee_targets.headline,
    };
    return specialized[id] ?? '';
  }
  if (screen.type === 'explain') return screen.yes;
  if (screen.type === 'cheer') return screen.title('bạn');
  if (screen.type === 'archetype') return 'Kiểu ăn của bạn';
  if (screen.type === 'loader' || screen.type === 'insight' || screen.type === 'choice' || screen.type === 'scale' || screen.type === 'quiz' || screen.type === 'multi') {
    return screen.title;
  }
  return '';
}

describe('Vietnamese survey copy', () => {
  it('names every screen and skips unsourced or medical claims', () => {
    expect(VI_SURVEY).toHaveLength(VI_QUIZ_STEPS.length);
    const quizzes = VI_SURVEY.flatMap((entry) => {
      const screen = flowScreen(entry.id);
      return screen?.type === 'quiz' ? [screen] : [];
    });
    expect(quizzes).toHaveLength(6);
    const positions = quizzes.map((screen) => screen.options.findIndex((option) => option.key === screen.correct));
    expect(new Set(positions).size).toBeGreaterThan(1);
    expect(positions.includes(0)).toBe(false);
    for (const screen of quizzes) {
      expect(screen.options.some((option) => option.key === screen.correct)).toBe(true);
    }
    for (const step of VI_QUIZ_STEPS) {
      expect(titleFor(step).trim().length, step).toBeGreaterThan(0);
    }
    const surfaces = [
      ...viFlowStrings(),
      vi.story.with_you.title,
      vi.story.with_you.body,
      vi.insights.insight_pace.title,
      vi.insights.insight_pace.body,
      vi.tdee_targets.headline,
      vi.funnel.loader.titleFallback,
    ];
    for (const text of surfaces) {
      for (const pattern of BANNED) {
        expect(text, `${pattern} matched ${text}`).not.toMatch(pattern);
      }
    }
  });
});
