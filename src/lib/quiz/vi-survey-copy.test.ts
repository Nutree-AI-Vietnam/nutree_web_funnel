import { describe, expect, it } from 'vitest';
import { vi } from '@/lib/copy/vi';
import { VI_QUIZ_STEPS, VI_SURVEY } from './steps';
import {
  ARCHETYPE_BRIDGE,
  FOOD_QUIZ_SUB,
  ILLUSTRATION_CAPTION,
  LIKERT_HINT,
  OCCASION_SUB,
  WEIGHT_THANKS,
  WITH_YOU_LINE,
  archetypeFromAnswers,
  flowScreen,
  likertEyebrow,
  viFlowStrings,
} from './vi-survey';

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
    const shown = viFlowStrings().join('\n');
    for (const line of [
      'Bạn ăn theo kiểu nào?',
      'Bắt đầu 10 câu',
      'Mười câu ngắn giúp chuyên gia dinh dưỡng AI của Nutree hiểu thói quen ăn của bạn.',
      'Kết quả là một kiểu ăn, và kế hoạch sẽ bám theo kiểu đó.',
      'Một nhịp bữa lặp lại mỗi ngày',
      'Ít lựa chọn, dễ giữ',
      'Nhắc nhẹ theo giờ quen',
      'Giải thích ngắn vì sao món này hợp',
      'Gợi ý món mới mỗi tuần',
      'Không cấm món nào',
      'Ưu tiên món mua sẵn được',
      'Bữa làm trong 10 phút',
      'Nhắc gọn khi bạn bận',
      'Chừa chỗ cho bữa chung',
      'Mẹo gắp phần khi ăn cùng nhà',
      'Nhắc nhẹ, không phán xét',
      LIKERT_HINT,
      likertEyebrow(1),
      likertEyebrow(10),
      'Đúng là tôi',
      'Đôi khi',
      'Không hẳn',
      '“Ăn cùng bạn bè, tôi hay ăn nhiều hơn mình định.”',
      'Gắn việc đọc vào một mốc có sẵn trong ngày thì không cần cố nhớ.',
      'Ai cũng từng có lúc được rồi lại mất, chuyện đó rất thường.',
      'Ăn kiêng quá chặt thường chỉ giữ được vài ngày. Khi bỏ, cơ thể và thói quen kéo bạn về chỗ cũ. Nutree giữ món bạn đang ăn và chỉ sửa một chỗ mỗi tuần.',
      'Đúng, đây là nhóm nhẹ',
      'Đúng, đây là nhóm vừa',
      'Đúng, đây là nhóm đậm',
      'Món này thuộc nhóm khác',
      'Chính xác!',
      'Gần đúng rồi',
      'Không có nhịp nào đúng cho mọi người. Bạn chọn, kế hoạch theo.',
      'Động lực lên xuống là chuyện thường. Biết trước thì kế hoạch nhắc đúng lúc.',
      'Mục tiêu nhỏ → thấy tiến bộ sớm',
      'Thấy tiến bộ → dễ giữ nhịp',
      FOOD_QUIZ_SUB,
      ARCHETYPE_BRIDGE,
      WITH_YOU_LINE,
      WEIGHT_THANKS,
      OCCASION_SUB,
      ILLUSTRATION_CAPTION,
      'Không giống tôi',
      'Khá giống tôi',
      'Rất giống tôi',
    ]) {
      expect(shown, line).toContain(line);
    }
  });

  it('keeps archetype scoring for the same 1–5 answers', () => {
    const all = (key: string) => Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => [`profile_${n}`, key]));
    expect(archetypeFromAnswers(undefined)).toBe('steady');
    expect(archetypeFromAnswers(all('5'))).toBe('curious');
    expect(archetypeFromAnswers(all('3'))).toBe('curious');
    expect(archetypeFromAnswers({ ...all('1'), profile_2: '5', profile_7: '5' })).toBe('steady');
    expect(archetypeFromAnswers({ ...all('1'), profile_3: '5', profile_6: '5' })).toBe('practical');
    expect(archetypeFromAnswers({ ...all('1'), profile_5: '5', profile_8: '5', profile_10: '5' })).toBe('curious');
    expect(archetypeFromAnswers({ ...all('1'), profile_1: '5', profile_4: '5', profile_9: '5' })).toBe('warm');
    const steady = { profile_2: '4', profile_7: '2' };
    expect(archetypeFromAnswers(steady)).toBe(archetypeFromAnswers({ ...steady, life_social: '1', life_fit: '5' }));
    expect(archetypeFromAnswers(all('5'))).toBe(archetypeFromAnswers(all('5')));
  });
});
