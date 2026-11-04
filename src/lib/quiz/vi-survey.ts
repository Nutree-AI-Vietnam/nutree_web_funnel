/**
 * Vietnamese survey screen catalog.
 *
 * Order follows the recorded coaching-survey shape (N1–N75). N3 (gender
 * identity) is skipped. N20 (email gate) is not built. N76 is the existing
 * paywall, outside this list.
 *
 * Safety screens (pregnancy, blood-sugar follow-up, eating distress) are
 * yes/no questions with a footnote. They do not diagnose, name a disease, or
 * stop the survey. Nutree stays a meal-habit coach.
 *
 * Food groups are Nutree's own names, not a borrowed colour system:
 * nhóm nhẹ (broth, vegetables, fruit), nhóm vừa (rice, noodles, lean protein),
 * nhóm đậm (fried food, sweets, sugary drinks). Nothing is forbidden.
 */
export type ViChapter = 'you' | 'body' | 'habits' | 'plan';
export type StepKind = 'question' | 'insight' | 'projection' | 'coaching' | 'loader' | 'plan' | 'explain' | 'archetype';

export type ArtId =
  | 'traits'
  | 'steady'
  | 'curious'
  | 'practical'
  | 'warm'
  | 'table'
  | 'takeaway'
  | 'calendar'
  | 'phoneBowl'
  | 'plate'
  | 'zigzag'
  | 'bell'
  | 'twoLines'
  | 'plate3'
  | 'hands'
  | 'bulb'
  | 'target'
  | 'check'
  | 'trophy'
  | 'path'
  | 'clock';

export type FlowChoice = {
  type: 'choice';
  title: string;
  note?: string;
  options: readonly { key: string; label: string }[];
  art?: ArtId;
  /** Quote-card relate framing. The options keep their own keys. */
  quote?: boolean;
};
export type FlowScale = {
  type: 'scale';
  title: string;
  trait?: 'steady' | 'curious' | 'practical' | 'warm';
  art?: ArtId;
  variant?: 'likert' | 'relate';
  quote?: boolean;
};
export type FlowInsight = {
  type: 'insight';
  eyebrow: string;
  title: string;
  body: string;
  points?: readonly string[];
  cta: string;
  art?: ArtId;
  tone?: 'tinted';
};
export type FlowLoader = { type: 'loader'; title: string; lines: readonly string[]; art?: ArtId };
export type FlowQuiz = {
  type: 'quiz';
  title: string;
  note?: string;
  dot?: 'green' | 'amber' | 'coral';
  options: readonly { key: string; label: string }[];
  correct: string;
};
export type FlowExplain = {
  type: 'explain';
  quiz: string;
  yes: string;
  retry: string;
  body: string;
  cta: string;
  art?: ArtId;
  tone?: 'tinted';
  titleRight?: string;
  titleRetry?: string;
  /** Which third of plate3 to mark. */
  emphasis?: 'green' | 'amber' | 'coral';
};
export type FlowMulti = { type: 'multi'; title: string; note?: string; options: readonly { key: string; label: string }[] };
export type FlowArchetype = { type: 'archetype' };
export type FlowCheer = {
  type: 'cheer';
  title: (name: string) => string;
  body: string;
  cta: string;
  art?: ArtId;
  tone?: 'tinted';
};
export type FlowScreen = FlowChoice | FlowScale | FlowInsight | FlowLoader | FlowQuiz | FlowExplain | FlowMulti | FlowArchetype | FlowCheer;

export type ViEntry = {
  id: string;
  kind: StepKind;
  /** Recorded survey number. Null when the screen exists so Nutree can still compute the plan. */
  noom: number | null;
  chapter: ViChapter;
  screen?: FlowScreen;
};

const scale = (title: string, trait: NonNullable<FlowScale['trait']>): FlowScale => ({
  type: 'scale', title, trait, variant: 'likert', art: trait,
});

const relateScale = (title: string, art: ArtId): FlowScale => ({
  type: 'scale', title, variant: 'relate', art, quote: true,
});

const choice = (
  title: string,
  options: readonly { key: string; label: string }[],
  note?: string,
  extra?: Pick<FlowChoice, 'art' | 'quote'>,
): FlowChoice => ({
  type: 'choice', title, options, note, ...extra,
});

export const AGREE_OPTIONS = [
  { key: '1', label: 'Không giống tôi' },
  { key: '2', label: 'Hơi không giống' },
  { key: '3', label: 'Ở giữa' },
  { key: '4', label: 'Khá giống tôi' },
  { key: '5', label: 'Rất giống tôi' },
] as const;

export const LIKERT_HINT = 'Chọn mức gần với bạn nhất. Phân vân thì chọn “Ở giữa”, không có đáp án sai.';

export function likertEyebrow(n: number) {
  return `KIỂU ĂN · CÂU ${n}/10`;
}

export const RELATE_EYEBROW = 'BẠN THẤY MÌNH TRONG CÂU NÀY?';

export const RELATE_OPTIONS = [
  { key: '5', label: 'Đúng là tôi' },
  { key: '3', label: 'Đôi khi' },
  { key: '1', label: 'Không hẳn' },
] as const;

export const PLAN_HEADING = 'Kế hoạch của bạn sẽ';

export const ARCHETYPE_EYEBROW = 'KIỂU ĂN CỦA BẠN';

export const ARCHETYPE_BRIDGE = 'Tiếp theo: vài câu về nhịp sống để chuyên gia dinh dưỡng AI của Nutree chỉnh kế hoạch cho sát hơn.';

export const WITH_YOU_LINE = 'Chuyên gia dinh dưỡng AI của Nutree đi cùng bạn từng bữa.';

export const WEIGHT_THANKS = 'Cảm ơn bạn. Bước đầu này không dễ.';

export const OCCASION_SUB = 'Có một mốc để hướng tới thì dễ giữ nhịp hơn.';

export const ILLUSTRATION_CAPTION = 'Hình minh họa, không phải số liệu.';

export const FOOD_QUIZ_SUB = 'Chọn món bạn nghĩ thuộc nhóm này.';

export const ARCHETYPES = {
  steady: {
    name: 'Người nhịp đều',
    body: 'Bạn hợp với vài việc nhỏ lặp lại mỗi ngày. Kế hoạch sẽ ngắn và đều, không phải một cuộc cải tổ.',
    art: 'steady',
    plan: ['Một nhịp bữa lặp lại mỗi ngày', 'Ít lựa chọn, dễ giữ', 'Nhắc nhẹ theo giờ quen'],
  },
  curious: {
    name: 'Người tò mò',
    body: 'Bạn muốn hiểu bữa ăn, không muốn bị cấm món. Kế hoạch sẽ giải thích vừa đủ để bạn tự chọn.',
    art: 'curious',
    plan: ['Giải thích ngắn vì sao món này hợp', 'Gợi ý món mới mỗi tuần', 'Không cấm món nào'],
  },
  practical: {
    name: 'Người thực tế',
    body: 'Lịch của bạn đã kín. Kế hoạch sẽ bám vào bữa có sẵn, không thêm một việc lớn.',
    art: 'practical',
    plan: ['Ưu tiên món mua sẵn được', 'Bữa làm trong 10 phút', 'Nhắc gọn khi bạn bận'],
  },
  warm: {
    name: 'Người quây quần',
    body: 'Bữa ăn của bạn gắn với người khác. Kế hoạch chừa chỗ cho bữa chung, thay vì bắt bạn ăn một mình.',
    art: 'warm',
    plan: ['Chừa chỗ cho bữa chung', 'Mẹo gắp phần khi ăn cùng nhà', 'Nhắc nhẹ, không phán xét'],
  },
} as const;

export type ArchetypeId = keyof typeof ARCHETYPES;

export const VI_SURVEY = [
  { id: 'goal', kind: 'question', noom: 1, chapter: 'you' },
  { id: 'sex', kind: 'question', noom: 2, chapter: 'you' },
  { id: 'pregnant', kind: 'question', noom: 4, chapter: 'you', screen: choice(
    'Bạn đang mang thai hoặc cho con bú không?',
    [{ key: 'yes', label: 'Có' }, { key: 'no', label: 'Không' }, { key: 'unsure', label: 'Không muốn nói' }],
    'Nutree chỉ gợi ý bữa ăn. Nếu bạn đang mang thai hoặc cho con bú, hãy hỏi bác sĩ trước khi đổi cách ăn.',
  ) },
  { id: 'age_group', kind: 'question', noom: 5, chapter: 'you' },
  { id: 'height', kind: 'question', noom: 6, chapter: 'you' },
  { id: 'weight', kind: 'question', noom: 7, chapter: 'you' },
  { id: 'wellbeing', kind: 'question', noom: 8, chapter: 'you', screen: {
    type: 'multi',
    title: 'Dạo này, điều nào hay ảnh hưởng bữa ăn của bạn?',
    note: 'Chọn những mục gần đúng. Đây là cảm giác hằng ngày, không phải một kết luận về sức khỏe.',
    options: [
      { key: 'tired', label: 'Hay mệt' },
      { key: 'sleep', label: 'Ngủ chưa ngon' },
      { key: 'stress', label: 'Dễ căng' },
      { key: 'heavy', label: 'Nặng bụng sau ăn' },
      { key: 'none', label: 'Không có gì đặc biệt' },
    ],
  } },
  { id: 'blood_sugar', kind: 'question', noom: 9, chapter: 'you', screen: choice(
    'Bạn có đang được bác sĩ theo dõi đường huyết không?',
    [{ key: 'yes', label: 'Có' }, { key: 'no', label: 'Không' }, { key: 'unsure', label: 'Không chắc' }],
    'Nutree không nhận xét kết quả xét nghiệm. Nếu bạn đang được theo dõi, hãy giữ hướng dẫn của bác sĩ.',
  ) },
  { id: 'eating_worry', kind: 'question', noom: 10, chapter: 'you', screen: choice(
    'Ăn uống có đang làm bạn thấy quá tải không?',
    [{ key: 'yes', label: 'Có, khá nhiều' }, { key: 'sometimes', label: 'Đôi khi' }, { key: 'no', label: 'Không' }],
    'Nếu ăn uống đang làm bạn khổ sở, một chuyên gia là nơi phù hợp. Nutree chỉ giúp bữa ăn hằng ngày nhẹ nhàng hơn.',
  ) },
  { id: 'with_you', kind: 'coaching', noom: 11, chapter: 'you' },
  { id: 'target_weight', kind: 'question', noom: 12, chapter: 'body' },
  { id: 'insight_pace', kind: 'insight', noom: 13, chapter: 'body' },
  { id: 'zones', kind: 'question', noom: 14, chapter: 'body' },
  { id: 'occasion', kind: 'question', noom: 15, chapter: 'body' },
  { id: 'event_date', kind: 'question', noom: 16, chapter: 'body', screen: choice(
    'Dịp đó còn khoảng bao lâu?',
    [
      { key: 'month', label: 'Trong tháng này' },
      { key: 'season', label: '2–3 tháng nữa' },
      { key: 'later', label: 'Xa hơn' },
      { key: 'none', label: 'Chưa có ngày' },
    ],
  ) },
  { id: 'pace', kind: 'question', noom: 17, chapter: 'body', screen: choice(
    'Bạn muốn đi nhịp nào?',
    [
      { key: 'slow', label: 'Chậm và chắc' },
      { key: 'steady', label: 'Vừa phải' },
      { key: 'quicker', label: 'Hơi nhanh' },
    ],
    'Không có nhịp nào đúng cho mọi người. Bạn chọn, kế hoạch theo.',
  ) },
  { id: 'insight_company', kind: 'insight', noom: 18, chapter: 'body', screen: {
    type: 'insight',
    eyebrow: 'Một nhịp thở',
    title: 'Đổi thói quen thì ở lại được, siết mạnh thì chóng chán',
    body: 'Một tuần ăn quá ít thường kết thúc bằng bữa bù. Nutree sẽ giữ bữa bạn thích, chỉ chỉnh phần và giờ.',
    points: ['Không cấm món', 'Một bữa lệch không xóa cả tuần', 'Kế hoạch sửa ở bữa sau'],
    cta: 'Mình muốn cách đó',
    art: 'calendar',
  } },
  { id: 'loader_preview', kind: 'loader', noom: 19, chapter: 'body', screen: {
    type: 'loader',
    title: 'Đang xem nhịp vừa với bạn',
    lines: ['Ghép mục tiêu và cân nặng', 'Chừa chỗ cho lịch của bạn', 'Phác một mốc đầu tiên'],
    art: 'clock',
  } },
  { id: 'progress', kind: 'projection', noom: 21, chapter: 'body' },
  { id: 'first_name', kind: 'question', noom: 22, chapter: 'body' },
  { id: 'profile_intro', kind: 'insight', noom: 23, chapter: 'habits', screen: {
    type: 'insight',
    eyebrow: 'Cách bạn ăn',
    title: 'Bạn ăn theo kiểu nào?',
    body: 'Khoảng một phút. Không có câu trả lời đúng hay sai.',
    points: [
      'Mười câu ngắn giúp chuyên gia dinh dưỡng AI của Nutree hiểu thói quen ăn của bạn.',
      'Kết quả là một kiểu ăn, và kế hoạch sẽ bám theo kiểu đó.',
    ],
    cta: 'Bắt đầu 10 câu',
    art: 'traits',
    tone: 'tinted',
  } },
  { id: 'profile_1', kind: 'question', noom: 24, chapter: 'habits', screen: scale('Tôi ăn theo cảm xúc hơn là theo giờ.', 'warm') },
  { id: 'profile_2', kind: 'question', noom: 25, chapter: 'habits', screen: scale('Tôi thích biết trước hôm nay ăn gì.', 'steady') },
  { id: 'profile_3', kind: 'question', noom: 26, chapter: 'habits', screen: scale('Khi bận, tôi chọn món nào xong nhanh.', 'practical') },
  { id: 'profile_4', kind: 'question', noom: 27, chapter: 'habits', screen: scale('Ăn cùng người khác khiến tôi dễ ăn hơn mức định.', 'warm') },
  { id: 'profile_5', kind: 'question', noom: 28, chapter: 'habits', screen: scale('Tôi muốn hiểu vì sao mình đói, không chỉ ăn gì.', 'curious') },
  { id: 'profile_6', kind: 'question', noom: 29, chapter: 'habits', screen: scale('Lúc mệt, đồ ăn sẵn thường thắng.', 'practical') },
  { id: 'profile_7', kind: 'question', noom: 30, chapter: 'habits', screen: scale('Tôi yên tâm hơn khi mỗi ngày có một nhịp giống nhau.', 'steady') },
  { id: 'profile_8', kind: 'question', noom: 31, chapter: 'habits', screen: scale('Tôi thích thử món mới hơn là một thực đơn cố định.', 'curious') },
  { id: 'profile_9', kind: 'question', noom: 32, chapter: 'habits', screen: scale('Một lời nhắc nhẹ giúp tôi quay lại nhịp.', 'warm') },
  { id: 'profile_10', kind: 'question', noom: 33, chapter: 'habits', screen: scale('Tôi muốn tự quyết, không muốn bị cấm món.', 'curious') },
  { id: 'loader_profile', kind: 'loader', noom: 34, chapter: 'habits', screen: {
    type: 'loader',
    title: 'Đang đọc cách bạn ăn',
    lines: ['Xem mười câu vừa rồi', 'Tìm nhịp nổi bật', 'Gọi tên kiểu của bạn'],
  } },
  { id: 'profile_result', kind: 'archetype', noom: 35, chapter: 'habits', screen: { type: 'archetype' } },
  { id: 'life_social', kind: 'question', noom: 36, chapter: 'habits', screen: relateScale('“Ăn cùng bạn bè, tôi hay ăn nhiều hơn mình định.”', 'table') },
  { id: 'life_convenience', kind: 'question', noom: 37, chapter: 'habits', screen: relateScale('“Món nào tiện là tôi chọn món đó.”', 'takeaway') },
  { id: 'life_fit', kind: 'question', noom: 38, chapter: 'habits', screen: relateScale('“Kế hoạch phải vừa lịch của tôi thì tôi mới theo được.”', 'calendar') },
  { id: 'lesson_time', kind: 'question', noom: 39, chapter: 'habits', screen: choice(
    'Lúc nào bạn dễ đọc một ghi chú ngắn về bữa ăn?',
    [
      { key: 'morning', label: 'Buổi sáng' },
      { key: 'midday', label: 'Giữa ngày' },
      { key: 'evening', label: 'Buổi tối' },
      { key: 'whenever', label: 'Khi rảnh' },
    ],
    'Gắn việc đọc vào một mốc có sẵn trong ngày thì không cần cố nhớ.',
    { art: 'clock' },
  ) },
  { id: 'progress_habits', kind: 'projection', noom: 40, chapter: 'habits' },
  { id: 'restrictions', kind: 'question', noom: 41, chapter: 'habits' },
  { id: 'eating_multi', kind: 'question', noom: 42, chapter: 'habits', screen: choice(
    '“Lúc ăn, tôi thường làm thêm việc khác.”',
    [
      { key: 'phone', label: 'Xem điện thoại' },
      { key: 'work', label: 'Làm việc' },
      { key: 'talk', label: 'Nói chuyện' },
      { key: 'only_eat', label: 'Chỉ ăn' },
    ],
    undefined,
    { art: 'phoneBowl', quote: true },
  ) },
  { id: 'plate_clear', kind: 'question', noom: 43, chapter: 'habits', screen: choice(
    '“Đồ đã gắp ra đĩa thì tôi ăn cho hết.”',
    [
      { key: 'often', label: 'Hay vậy' },
      { key: 'sometimes', label: 'Thỉnh thoảng' },
      { key: 'rarely', label: 'Hiếm' },
    ],
    undefined,
    { art: 'plate', quote: true },
  ) },
  { id: 'short_win', kind: 'question', noom: 44, chapter: 'habits', screen: choice(
    'Lần gần nhất bạn ăn đúng ý mình được bao lâu?',
    [
      { key: 'days', label: 'Vài ngày' },
      { key: 'weeks', label: 'Vài tuần' },
      { key: 'longer', label: 'Lâu hơn' },
      { key: 'not_yet', label: 'Chưa có lần nào' },
    ],
    'Ai cũng từng có lúc được rồi lại mất, chuyện đó rất thường.',
    { art: 'zigzag', quote: true },
  ) },
  { id: 'insight_yoyo', kind: 'insight', noom: 45, chapter: 'habits', screen: {
    type: 'insight',
    eyebrow: 'Vì sao hay bỏ giữa chừng',
    title: 'Siết mạnh rồi thả lỏng là vòng quen, không phải lỗi của bạn',
    body: 'Ăn kiêng quá chặt thường chỉ giữ được vài ngày. Khi bỏ, cơ thể và thói quen kéo bạn về chỗ cũ. Nutree giữ món bạn đang ăn và chỉ sửa một chỗ mỗi tuần.',
    cta: 'Nghe đỡ hơn',
    art: 'zigzag',
    tone: 'tinted',
  } },
  { id: 'food_light_q', kind: 'question', noom: 46, chapter: 'habits', screen: {
    type: 'quiz',
    title: 'Món nào thuộc nhóm nhẹ?',
    note: FOOD_QUIZ_SUB,
    dot: 'green',
    correct: 'soup',
    options: [
      { key: 'rice', label: 'Cơm tấm sườn' },
      { key: 'soup', label: 'Canh rau' },
      { key: 'fried', label: 'Gà rán' },
      { key: 'milk_tea', label: 'Trà sữa' },
    ],
  } },
  { id: 'food_light_why', kind: 'explain', noom: 47, chapter: 'habits', screen: {
    type: 'explain',
    quiz: 'food_light_q',
    yes: 'Đúng, đây là nhóm nhẹ',
    retry: 'Món này thuộc nhóm khác',
    titleRight: 'Đúng, đây là nhóm nhẹ',
    titleRetry: 'Món này thuộc nhóm khác',
    body: 'Canh, rau luộc và trái cây nhiều nước thuộc nhóm nhẹ. Chúng giúp bạn ăn no mà vẫn nhẹ bụng. Nên cho chúng chiếm nửa đĩa.',
    cta: 'Tiếp tục',
    art: 'plate3',
    tone: 'tinted',
    emphasis: 'green',
  } },
  { id: 'food_medium_q', kind: 'question', noom: 48, chapter: 'habits', screen: {
    type: 'quiz',
    title: 'Món nào thuộc nhóm vừa?',
    note: FOOD_QUIZ_SUB,
    dot: 'amber',
    correct: 'chicken_rice',
    options: [
      { key: 'soda', label: 'Nước ngọt' },
      { key: 'fries', label: 'Khoai tây chiên' },
      { key: 'chicken_rice', label: 'Cơm gà nướng' },
      { key: 'flan', label: 'Bánh flan' },
    ],
  } },
  { id: 'food_medium_why', kind: 'explain', noom: 49, chapter: 'habits', screen: {
    type: 'explain',
    quiz: 'food_medium_q',
    yes: 'Đúng, đây là nhóm vừa',
    retry: 'Món này thuộc nhóm khác',
    titleRight: 'Đúng, đây là nhóm vừa',
    titleRetry: 'Món này thuộc nhóm khác',
    body: 'Nhóm vừa là bữa chính quen: cơm, bún, thịt nạc, cá, đậu. Chúng giữ bạn no tới bữa sau. Một phần tư đĩa là vừa.',
    cta: 'Tiếp tục',
    art: 'plate3',
    tone: 'tinted',
    emphasis: 'amber',
  } },
  { id: 'food_rich_q', kind: 'question', noom: 50, chapter: 'habits', screen: {
    type: 'quiz',
    title: 'Món nào thuộc nhóm đậm?',
    note: FOOD_QUIZ_SUB,
    dot: 'coral',
    correct: 'cake',
    options: [
      { key: 'veg', label: 'Rau luộc' },
      { key: 'soup', label: 'Canh chua' },
      { key: 'grill', label: 'Ức gà áp chảo' },
      { key: 'cake', label: 'Bánh ngọt kem' },
    ],
  } },
  { id: 'food_rich_why', kind: 'explain', noom: 51, chapter: 'habits', screen: {
    type: 'explain',
    quiz: 'food_rich_q',
    yes: 'Đúng, đây là nhóm đậm',
    retry: 'Món này thuộc nhóm khác',
    titleRight: 'Đúng, đây là nhóm đậm',
    titleRetry: 'Món này thuộc nhóm khác',
    body: 'Nhóm đậm ngon và đậm vị: đồ chiên, bánh ngọt, nước ngọt. Không cần cấm, chỉ cần ăn phần nhỏ và đi cùng nhóm nhẹ.',
    cta: 'Đã rõ ba nhóm',
    art: 'plate3',
    tone: 'tinted',
    emphasis: 'coral',
  } },
  { id: 'food_summary', kind: 'insight', noom: 52, chapter: 'habits', screen: {
    type: 'insight',
    eyebrow: 'Nhóm nhẹ, vừa, đậm',
    title: 'Một đĩa dễ nhìn: nhiều nhẹ, đủ vừa, một chút đậm',
    body: 'Đây là cách Nutree gọi món, để bạn xếp đĩa mà không cần thuộc bảng. Không có món nào bị loại.',
    points: ['Nhóm nhẹ: canh, rau, trái cây', 'Nhóm vừa: cơm, bún, thịt nạc, cá, đậu', 'Nhóm đậm: chiên, ngọt, nước ngọt'],
    cta: 'Mình xếp đĩa được',
    art: 'plate3',
  } },
  { id: 'loader_personal', kind: 'loader', noom: 53, chapter: 'habits', screen: {
    type: 'loader',
    title: 'Đang ghép bữa cho đúng đời bạn',
    lines: [
      'Giữ món bạn đang ăn',
      'Chừa chỗ cho bữa chung và bữa bận',
      'Chuyên gia dinh dưỡng AI của Nutree sẽ đi cùng bạn từng bữa, không phải một người ngồi cạnh',
    ],
    art: 'plate3',
  } },
  { id: 'limits', kind: 'question', noom: 54, chapter: 'habits', screen: choice(
    'Đi lại có chỗ nào khiến bạn phải nương không?',
    [
      { key: 'none', label: 'Không' },
      { key: 'joints', label: 'Mỏi khớp khi đi nhiều' },
      { key: 'tired', label: 'Mau mệt khi gắng sức' },
      { key: 'other', label: 'Có chuyện khác' },
    ],
    'Nutree không thay thế bác sĩ. Nếu vận động đang đau, hãy hỏi người đang theo dõi bạn trước khi tăng bài.',
  ) },
  { id: 'activity_level', kind: 'question', noom: null, chapter: 'habits' },
  { id: 'training_days', kind: 'question', noom: null, chapter: 'habits' },
  { id: 'training_duration', kind: 'question', noom: null, chapter: 'habits' },
  { id: 'obstacle', kind: 'question', noom: null, chapter: 'habits' },
  { id: 'diet_style', kind: 'question', noom: null, chapter: 'habits' },
  { id: 'progress_pace', kind: 'projection', noom: 55, chapter: 'habits' },
  { id: 'loader_check', kind: 'loader', noom: 56, chapter: 'habits', screen: {
    type: 'loader',
    title: 'Đang kiểm lại các mảnh',
    lines: ['Mục tiêu', 'Nhịp ngày', 'Cách bạn ăn'],
    art: 'clock',
  } },
  { id: 'explore', kind: 'question', noom: 57, chapter: 'habits', screen: {
    type: 'multi',
    title: 'Ngoài bữa ăn, bạn muốn để ý thêm điều gì?',
    note: 'Chọn một hoặc vài mục. Nutree vẫn bắt đầu từ ăn uống.',
    options: [
      { key: 'sleep', label: 'Giấc ngủ' },
      { key: 'energy', label: 'Năng lượng trong ngày' },
      { key: 'stress', label: 'Đỡ căng hơn' },
      { key: 'movement', label: 'Đi lại nhiều hơn' },
      { key: 'meals', label: 'Chỉ tập trung vào bữa ăn' },
    ],
  } },
  { id: 'motivation_change', kind: 'question', noom: 58, chapter: 'habits', screen: choice(
    'Dạo này động lực của bạn đổi thế nào?',
    [
      { key: 'up', label: 'Rõ hơn trước' },
      { key: 'same', label: 'Vẫn vậy' },
      { key: 'down', label: 'Yếu đi' },
      { key: 'swing', label: 'Lúc có lúc không' },
    ],
    'Động lực lên xuống là chuyện thường. Biết trước thì kế hoạch nhắc đúng lúc.',
  ) },
  { id: 'motivation_outside', kind: 'question', noom: 59, chapter: 'habits', screen: choice(
    '“Khi bận rộn, tôi cần ai đó nhắc để không bỏ dở.”',
    [
      { key: 'yes', label: 'Có' },
      { key: 'sometimes', label: 'Đôi khi' },
      { key: 'no', label: 'Không, tôi tự giữ được' },
    ],
    undefined,
    { art: 'bell', quote: true },
  ) },
  { id: 'insight_comeback', kind: 'insight', noom: 60, chapter: 'habits', screen: {
    type: 'insight',
    eyebrow: 'Khi lệch nhịp',
    title: 'Không ai đều cả tuần, và bạn không cần đều',
    body: 'Lệch một bữa là chuyện thường. Chuyên gia dinh dưỡng AI của Nutree nhắc bạn quay lại ở bữa sau, không trách bữa vừa rồi.',
    cta: 'Được, bữa sau vậy',
    art: 'path',
    tone: 'tinted',
  } },
  { id: 'motivation_level', kind: 'question', noom: 61, chapter: 'habits', screen: choice(
    'Hôm nay động lực của bạn ở mức nào?',
    [
      { key: 'low', label: 'Thấp' },
      { key: 'mid', label: 'Vừa' },
      { key: 'high', label: 'Khá' },
      { key: 'ready', label: 'Sẵn sàng' },
    ],
  ) },
  { id: 'insight_plan', kind: 'insight', noom: 62, chapter: 'habits', screen: {
    type: 'insight',
    eyebrow: 'Mục tiêu và kế hoạch',
    title: 'Một mục tiêu không có bữa cụ thể thì dễ trôi',
    body: 'Biết mình muốn nhẹ đi là một chuyện. Biết trưa nay ăn gì là chuyện giữ bạn ở lại. Nutree làm phần thứ hai.',
    points: ['Mục tiêu nhỏ → thấy tiến bộ sớm', 'Thấy tiến bộ → dễ giữ nhịp'],
    cta: 'Cho tôi bữa cụ thể',
    art: 'target',
    tone: 'tinted',
  } },
  { id: 'aim', kind: 'question', noom: 63, chapter: 'habits' },
  { id: 'knowledge_intro', kind: 'insight', noom: 64, chapter: 'plan', screen: {
    type: 'insight',
    eyebrow: 'Ba câu ngắn',
    title: 'Xem bạn và Nutree có cùng cách nghĩ không',
    body: 'Không phải bài kiểm tra. Sai cũng không sao, màn sau sẽ nói vì sao.',
    cta: 'Hỏi tôi đi',
    art: 'bulb',
    tone: 'tinted',
  } },
  { id: 'quiz_snack', kind: 'question', noom: 65, chapter: 'plan', screen: {
    type: 'quiz',
    title: 'Bữa phụ nào hợp một ngày bận?',
    correct: 'yogurt',
    options: [
      { key: 'bread', label: 'Một ổ bánh mì ngọt' },
      { key: 'soda', label: 'Nước ngọt lon' },
      { key: 'yogurt', label: 'Sữa chua và chuối' },
    ],
  } },
  { id: 'quiz_snack_why', kind: 'explain', noom: 66, chapter: 'plan', screen: {
    type: 'explain',
    quiz: 'quiz_snack',
    yes: 'Chính xác!',
    retry: 'Gần đúng rồi',
    titleRight: 'Chính xác!',
    titleRetry: 'Gần đúng rồi',
    body: 'Sữa chua thêm chuối no lâu hơn đồ ngọt uống một hơi. Đường trong nước ngọt đi qua nhanh, đói lại đến. Khi bận, để sẵn một hộp sữa chua và một quả chuối thì khỏi phải chọn lúc đói.',
    cta: 'Câu tiếp',
    art: 'check',
    tone: 'tinted',
  } },
  { id: 'quiz_mindful', kind: 'question', noom: 67, chapter: 'plan', screen: {
    type: 'quiz',
    title: 'Khi ăn, việc nào giúp bạn nhận ra đã no?',
    correct: 'slow',
    options: [
      { key: 'show', label: 'Vừa xem phim vừa ăn hết' },
      { key: 'slow', label: 'Để điện thoại xuống, ăn chậm hơn một chút' },
      { key: 'stand', label: 'Ăn đứng trong bếp' },
    ],
  } },
  { id: 'quiz_mindful_why', kind: 'explain', noom: 68, chapter: 'plan', screen: {
    type: 'explain',
    quiz: 'quiz_mindful',
    yes: 'Chính xác!',
    retry: 'Gần đúng rồi',
    titleRight: 'Chính xác!',
    titleRetry: 'Gần đúng rồi',
    body: 'Ăn chậm và chú ý vị giúp bạn dừng khi vừa đủ. Màn hình và ăn đứng làm bụng no trễ hơn miệng. Để điện thoại xuống trong vài phút đầu của bữa là đủ.',
    cta: 'Câu cuối',
    art: 'check',
    tone: 'tinted',
  } },
  { id: 'quiz_weigh', kind: 'question', noom: 69, chapter: 'plan', screen: {
    type: 'quiz',
    title: 'Nên cân vào lúc nào để thấy nhịp?',
    correct: 'weekly',
    options: [
      { key: 'each_meal', label: 'Sau mỗi bữa' },
      { key: 'mood', label: 'Chỉ khi thấy chán' },
      { key: 'weekly', label: 'Cùng một buổi, mỗi tuần một lần' },
    ],
  } },
  { id: 'quiz_weigh_why', kind: 'explain', noom: 70, chapter: 'plan', screen: {
    type: 'explain',
    quiz: 'quiz_weigh',
    yes: 'Chính xác!',
    retry: 'Gần đúng rồi',
    titleRight: 'Chính xác!',
    titleRetry: 'Gần đúng rồi',
    body: 'Cùng giờ, cùng một ngày trong tuần. Cân sau từng bữa chỉ thấy nước và thức ăn, chưa thấy nhịp. Chọn một buổi cố định, rồi để cân yên đến tuần sau.',
    cta: 'Xong ba câu',
    art: 'check',
    tone: 'tinted',
  } },
  { id: 'great_job', kind: 'coaching', noom: 71, chapter: 'plan', screen: {
    type: 'cheer',
    title: (name: string) => `Làm tốt lắm, ${name}`,
    body: 'Bạn đã kể đủ để Nutree dựng bữa. Phần còn lại là gói những câu đó thành một ngày ăn được.',
    cta: 'Gói thành kế hoạch',
    art: 'trophy',
    tone: 'tinted',
  } },
  { id: 'referral', kind: 'question', noom: 72, chapter: 'plan', screen: choice(
    'Bạn biết Nutree qua đâu?',
    [
      { key: 'facebook', label: 'Facebook' },
      { key: 'tiktok', label: 'TikTok' },
      { key: 'youtube', label: 'YouTube' },
      { key: 'friend', label: 'Bạn bè hoặc người thân' },
      { key: 'search', label: 'Tự tìm' },
      { key: 'other', label: 'Chỗ khác' },
    ],
  ) },
  { id: 'calculating', kind: 'loader', noom: 73, chapter: 'plan' },
  { id: 'day_plan', kind: 'plan', noom: null, chapter: 'plan' },
  { id: 'result', kind: 'plan', noom: 74, chapter: 'plan' },
  { id: 'progress_final', kind: 'projection', noom: 75, chapter: 'plan' },
] as const satisfies readonly ViEntry[];

export type ViQuizStep = (typeof VI_SURVEY)[number]['id'];

export const VI_QUIZ_STEPS: readonly ViQuizStep[] = VI_SURVEY.map((entry) => entry.id);

const BY_ID = new Map<string, (typeof VI_SURVEY)[number]>(VI_SURVEY.map((entry) => [entry.id, entry]));

export function viEntry(id: string) {
  return BY_ID.get(id);
}

function screenOf(entry: (typeof VI_SURVEY)[number] | undefined): FlowScreen | undefined {
  if (!entry || !('screen' in entry)) return undefined;
  return entry.screen;
}

export function isLoaderStep(id: string): boolean {
  return BY_ID.get(id)?.kind === 'loader';
}

export function viChapter(id: string): ViChapter {
  return BY_ID.get(id)?.chapter ?? 'you';
}

export function viQuizChapter(id: string): 'intent' | 'body' | 'routine' | 'plan' {
  const chapter = viChapter(id);
  if (chapter === 'you') return 'intent';
  if (chapter === 'body') return 'body';
  if (chapter === 'habits') return 'routine';
  return 'plan';
}

export const VI_FLOW_STEPS = VI_SURVEY.flatMap((entry) => (screenOf(entry) ? [entry.id] : []));

export function flowScreen(id: string): FlowScreen | undefined {
  return screenOf(BY_ID.get(id));
}

export function archetypeFromAnswers(answers: Partial<Record<string, string>> | undefined): ArchetypeId {
  const scores: Record<ArchetypeId, number> = { steady: 0, curious: 0, practical: 0, warm: 0 };
  for (const entry of VI_SURVEY) {
    const screen = screenOf(entry);
    if (!screen || screen.type !== 'scale' || !screen.trait) continue;
    const raw = Number(answers?.[entry.id] ?? 0);
    if (raw > 0) scores[screen.trait] += raw;
  }
  return (Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'steady') as ArchetypeId;
}

export type CalcPopup = {
  id: string;
  question: string;
  options: readonly { key: string; label: string; cooking?: 'home' | 'out'; job?: 'desk' | 'on_feet' }[];
};

/** Three questions on the build-plan loader. Family eating is a household habit, not a health history. */
export const CALC_POPUPS: readonly CalcPopup[] = [
  {
    id: 'loader_family',
    question: 'Ở nhà, bữa ăn thường theo kiểu nào?',
    options: [
      { key: 'home', label: 'Ăn cơm nhà, mọi người ăn chung', cooking: 'home' },
      { key: 'out', label: 'Hay ăn ngoài hoặc gọi món', cooking: 'out' },
      { key: 'mixed', label: 'Mỗi người một kiểu', cooking: 'home' },
    ],
  },
  {
    id: 'loader_meals',
    question: 'Các bữa của bạn có giờ khá đều không?',
    options: [
      { key: 'yes', label: 'Khá đều' },
      { key: 'no', label: 'Lúc nào đói thì ăn' },
    ],
  },
  {
    id: 'loader_posture',
    question: 'Ngày của bạn nghiêng về đi lại hay ngồi?',
    options: [
      { key: 'move', label: 'Đi lại nhiều', job: 'on_feet' },
      { key: 'sit', label: 'Ngồi nhiều', job: 'desk' },
    ],
  },
];

function pushStrings(value: unknown, found: string[]) {
  if (typeof value === 'string') found.push(value);
  else if (typeof value === 'function') found.push(value('Minh'));
  else if (Array.isArray(value)) value.forEach((item) => pushStrings(item, found));
  else if (value && typeof value === 'object') Object.values(value).forEach((item) => pushStrings(item, found));
}

/** Every string the new Vietnamese screens can show, for the claim check. Art has no text. */
export function viFlowStrings(): string[] {
  const found: string[] = [];
  for (const entry of VI_SURVEY) pushStrings(screenOf(entry), found);
  pushStrings(AGREE_OPTIONS, found);
  pushStrings(ARCHETYPES, found);
  pushStrings(CALC_POPUPS, found);
  pushStrings(RELATE_OPTIONS, found);
  found.push(
    LIKERT_HINT,
    RELATE_EYEBROW,
    PLAN_HEADING,
    ARCHETYPE_EYEBROW,
    ARCHETYPE_BRIDGE,
    WITH_YOU_LINE,
    WEIGHT_THANKS,
    OCCASION_SUB,
    ILLUSTRATION_CAPTION,
    FOOD_QUIZ_SUB,
  );
  for (let n = 1; n <= 10; n += 1) found.push(likertEyebrow(n));
  return found;
}
