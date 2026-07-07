# Web-to-App Funnel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Nutree web onboarding funnel (quiz → TDEE results → email capture → RevenueCat Web Billing checkout → app download handoff) as a Next.js app in this repo.

**Architecture:** Next.js App Router with one URL per quiz step (`/quiz/[step]` dynamic route driven by a step config array). Client-side quiz state in a zustand store persisted to `localStorage`, with keys matching the backend's snake_case fields. TDEE comes from the existing backend `POST /v1/tdee/preview` endpoint, with a local TypeScript port of the mobile app's calculator as fallback. Payment via RevenueCat Web Billing (`@revenuecat/purchases-js`); handoff via backend-issued claim token carried on Airbridge links.

**Tech Stack:** Next.js 15 (App Router) + TypeScript + Tailwind CSS 4, zustand, @revenuecat/purchases-js, qrcode.react, Vitest (unit), Playwright (E2E). Vietnamese-only copy in a single strings module.

**Scope notes:**
- This plan covers the `nutree_web_funnel` repo only. The mobile claim flow (deferred deep link handler + claim service in `nutree_ai`) needs its own plan in that repo. The backend endpoints (`POST /web-funnel/leads`, `POST /web-funnel/claim`, RC webhook) are owned by the backend team — this plan codes against the contract in the design spec.
- Source of truth used below (verified in `nutree_ai` on 2026-07-07):
  - Screen slugs: `lib/features/onboarding/domain/enums/onboarding_screen_id.dart` (`rcKey` = snake_case of enum name)
  - Field names: `lib/features/onboarding/domain/entities/onboarding_data.dart`
  - TDEE math: `lib/features/onboarding/domain/services/tdee_calculator.dart` + `lib/core/constants/macro_calculation_constants.dart`
  - API shapes: `lib/features/onboarding/data/models/tdee_preview_request.dart`, `lib/features/settings/data/models/tdee_models.dart`, endpoint `@POST('/v1/tdee/preview')`
  - Vietnamese copy & option keys: `lib/features/onboarding/data/models/onboarding_flow_defaults.dart`, `referral_source_screen.dart`, `goal_screen.dart`, `activity_level_screen.dart`
- The app's goal screen stores `cut` / `bulk` / `recomp` directly (RC content keys `lose_weight`/`gain_weight` are display-only). The activity screen offers exactly 3 options mapping to `job_type`: `desk` / `on_feet` / `physical`.

**Environment variables** (create `.env.local`; all documented in Task 22):

```bash
NEXT_PUBLIC_API_BASE_URL=https://api.nutree.ai        # backend base (no trailing slash)
NEXT_PUBLIC_RC_WEB_BILLING_KEY=rcb_xxx                # RevenueCat Web Billing public key
NEXT_PUBLIC_GA4_ID=G-XXXXXXX
NEXT_PUBLIC_META_PIXEL_ID=000000000000000
NEXT_PUBLIC_TIKTOK_PIXEL_ID=XXXXXXXXXXXXXXX
NEXT_PUBLIC_AIRBRIDGE_APP_NAME=nutree
NEXT_PUBLIC_AIRBRIDGE_WEB_TOKEN=xxxx
NEXT_PUBLIC_AIRBRIDGE_TRACKING_LINK=https://abr.ge/xxxxx   # created in Airbridge dashboard
NEXT_PUBLIC_APPSTORE_URL=https://apps.apple.com/app/idXXXXXXXX
NEXT_PUBLIC_PLAYSTORE_URL=https://play.google.com/store/apps/details?id=ai.nutree.app
```

---

## Task 1: Scaffold the Next.js project

**Files:**
- Create: entire Next.js scaffold (`package.json`, `src/app/*`, `tsconfig.json`, …) via create-next-app
- Create: `vitest.config.ts`
- Modify: `package.json` (add `test` scripts)

- [x] **Step 1: Scaffold into a temp dir and merge** (create-next-app refuses non-empty dirs; this repo already has `docs/`)

```bash
cd /Users/truongle/nutree_web_funnel
npx create-next-app@latest scaffold --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --no-git --no-turbopack
rsync -a scaffold/ ./ && rm -rf scaffold
```

- [x] **Step 2: Install runtime + test dependencies**

```bash
npm install zustand @revenuecat/purchases-js qrcode.react
npm install -D vitest @playwright/test
```

- [x] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
```

- [x] **Step 4: Add test scripts to `package.json`** (inside `"scripts"`)

```json
"test": "vitest run",
"test:watch": "vitest",
"test:e2e": "playwright test"
```

- [x] **Step 5: Verify build and empty test run**

Run: `npm run build && npm test`
Expected: build succeeds; vitest exits with "No test files found" (pass with `--passWithNoTests` not needed — if vitest errors on zero tests, add `passWithNoTests: true` to the `test` block of `vitest.config.ts`).

- [x] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with Tailwind, vitest, playwright"
```

---

## Task 2: Brand theme + Vietnamese copy module

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`
- Create: `src/lib/copy/vi.ts`

- [ ] **Step 1: Replace `src/app/globals.css` with brand tokens** (colors from `nutree_ai/lib/core/theme/tokens/brand_colors.dart`)

```css
@import "tailwindcss";

@theme {
  --color-forest: #1a4739;
  --color-emerald-deep: #1e5447;
  --color-emerald-brand: #2d8b70;
  --color-teal-brand: #29b6a1;
  --color-forest-dark: #0f1f1a;
  --color-wordmark: #0f5035;
  --color-charcoal: #1c2b26;
  --color-slate-brand: #3d4d47;
  --color-muted-brand: #6b7b75;
  --color-border-brand: #d4e5de;
  --color-mist: #e8f2ee;
  --color-bg-brand: #fafcfb;
  --color-success-brand: #10b981;
  --color-error-brand: #dc2626;
  --color-protein: #d97706;
  --color-carbs: #0d9488;
  --color-fat: #ca8a04;
}

body {
  background: var(--color-bg-brand);
  color: var(--color-charcoal);
}
```

- [ ] **Step 2: Replace `src/app/layout.tsx`** — Be Vietnam Pro font (same as the app's Vietnamese typography), `lang="vi"` metadata

```tsx
import type { Metadata } from 'next';
import { Be_Vietnam_Pro } from 'next/font/google';
import './globals.css';

const beVietnam = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-be-vietnam',
});

export const metadata: Metadata = {
  title: 'Nutree — Kế hoạch dinh dưỡng cá nhân hóa',
  description:
    'Trả lời vài câu hỏi để nhận kế hoạch calo & macro dựa trên khoa học, thiết kế riêng cho bạn.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body className={`${beVietnam.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Create `src/lib/copy/vi.ts`** — every user-facing string, keyed by screen slug (Vietnamese copy taken from the app's RC defaults in `onboarding_flow_defaults.dart`)

```ts
/**
 * All Vietnamese copy, keyed by quiz step slug (matches OnboardingScreenId.rcKey
 * in nutree_ai). Structured so adding a locale later = adding a sibling module.
 */
export const vi = {
  common: {
    continue: 'Tiếp tục',
    back: 'Quay lại',
    skip: 'Bỏ qua',
    retry: 'Thử lại',
  },
  landing: {
    headline: 'Kế hoạch dinh dưỡng khoa học, thiết kế riêng cho bạn',
    subheadline:
      'Trả lời vài câu hỏi (chỉ mất 3 phút) để nhận mục tiêu calo & macro cá nhân hóa từ Nutree.',
    cta: 'Bắt đầu ngay',
    bullets: [
      'Công thức được kiểm chứng khoa học',
      'Macro tối ưu theo mục tiêu của bạn',
      'Gợi ý bữa ăn AI phù hợp macro',
    ],
  },
  name_ask: {
    question: 'Tên bạn là gì?',
    placeholder: 'Nhập tên của bạn',
  },
  goal: {
    question: 'Mục tiêu chính của bạn là gì?',
    options: [
      { key: 'cut', label: 'Giảm cân' },
      { key: 'bulk', label: 'Tăng cơ' },
      { key: 'recomp', label: 'Cải thiện vóc dáng' },
    ],
  },
  target_weight: {
    question: 'Cân nặng mục tiêu của bạn?',
    unit: 'kg',
  },
  challenges: {
    question: 'Bạn đã gặp khó khăn nào?',
    hint: 'Chọn tất cả các mục phù hợp',
    options: [
      { key: 'no_time', label: 'Không có thời gian' },
      { key: 'no_motivation', label: 'Thiếu động lực' },
      { key: 'dont_know_what_to_eat', label: 'Không biết ăn gì' },
      { key: 'cant_stick_to_diet', label: 'Không thể duy trì chế độ ăn' },
      { key: 'slow_progress', label: 'Tiến độ chậm' },
      { key: 'cravings', label: 'Thèm ăn vặt' },
      { key: 'stress_eating', label: 'Ăn do stress' },
      { key: 'confusion', label: 'Quá nhiều lời khuyên mâu thuẫn' },
      { key: 'past_failures', label: 'Thất bại trước đây' },
    ],
  },
  referral_source: {
    question: 'Bạn biết đến chúng tôi qua đâu?',
    options: [
      { key: 'facebook_group', label: 'Facebook' },
      { key: 'youtube', label: 'YouTube' },
      { key: 'instagram', label: 'Instagram' },
      { key: 'tiktok', label: 'TikTok' },
      { key: 'google_search', label: 'Google' },
      { key: 'friend_family', label: 'Bạn bè / gia đình' },
      { key: 'other', label: 'Khác' },
    ],
  },
  duration: {
    question: 'Bạn đã cố gắng đạt mục tiêu trong bao lâu?',
    options: [
      { key: 'just_starting', label: 'Mới bắt đầu' },
      { key: 'few_months', label: 'Vài tháng' },
      { key: 'over_a_year', label: 'Hơn một năm' },
      { key: 'several_years', label: 'Nhiều năm' },
    ],
  },
  reflection: {
    template:
      '[name], mục tiêu [goal] của bạn đã rõ ràng. Nhiều người gặp [challenges] — nhưng với kế hoạch đúng đắn, bạn có thể đạt được trong [duration].',
    fallbackName: 'Bạn',
  },
  sex: {
    question: 'Giới tính sinh học của bạn?',
    options: [
      { key: 'male', label: 'Nam' },
      { key: 'female', label: 'Nữ' },
    ],
  },
  age: {
    question: 'Bạn bao nhiêu tuổi?',
    unit: 'tuổi',
  },
  height_weight: {
    question: 'Chiều cao và cân nặng hiện tại?',
    heightLabel: 'Chiều cao (cm)',
    weightLabel: 'Cân nặng (kg)',
  },
  body_fat: {
    question: 'Ước tính tỷ lệ mỡ cơ thể? (tùy chọn)',
    hint: 'Nếu không chắc, bạn có thể bỏ qua — chúng tôi sẽ dùng công thức tiêu chuẩn.',
    unit: '%',
  },
  training_days: {
    question: 'Bạn tập mấy ngày mỗi tuần?',
    unit: 'ngày/tuần',
  },
  training_duration: {
    question: 'Mỗi buổi tập của bạn kéo dài bao lâu?',
    options: [
      { key: '30', label: '~30 phút' },
      { key: '45', label: '~45 phút' },
      { key: '60', label: '~60 phút' },
      { key: '90', label: '90 phút trở lên' },
    ],
  },
  experience: {
    question: 'Kinh nghiệm tập luyện của bạn?',
    options: [
      { key: 'beginner', label: 'Người mới (< 1 năm)' },
      { key: 'intermediate', label: 'Trung cấp (1–3 năm)' },
      { key: 'advanced', label: 'Nâng cao (3+ năm)' },
    ],
  },
  training_type: {
    question: 'Bạn thường tập loại hình nào?',
    hint: 'Chọn tất cả các mục phù hợp',
    options: [
      { key: 'weights', label: 'Tập tạ' },
      { key: 'cardio', label: 'Cardio' },
      { key: 'yoga', label: 'Yoga' },
      { key: 'running', label: 'Chạy bộ' },
      { key: 'swimming', label: 'Bơi lội' },
      { key: 'martial_arts', label: 'Võ thuật' },
      { key: 'calisthenics', label: 'Calisthenics' },
      { key: 'pilates', label: 'Pilates' },
      { key: 'hiit', label: 'HIIT' },
      { key: 'cycling', label: 'Đạp xe' },
      { key: 'dance', label: 'Nhảy' },
    ],
  },
  activity_level: {
    question: 'Mức độ hoạt động hàng ngày của bạn?',
    options: [
      { key: 'desk', label: 'Văn phòng / ngồi nhiều' },
      { key: 'on_feet', label: 'Đứng / di chuyển cả ngày' },
      { key: 'physical', label: 'Lao động chân tay' },
    ],
  },
  diet: {
    question: 'Bạn có yêu cầu dinh dưỡng đặc biệt không?',
    hint: 'Chọn tất cả các mục phù hợp',
    options: [
      { key: 'vegan', label: 'Thuần chay' },
      { key: 'gluten_free', label: 'Không gluten' },
      { key: 'dairy_free', label: 'Không sữa' },
      { key: 'halal', label: 'Halal' },
      { key: 'none', label: 'Không có yêu cầu' },
    ],
  },
  tdee_science_promo: {
    headline: 'Mục tiêu calo dựa trên khoa học',
    body: 'Chúng tôi dùng công thức được kiểm chứng khoa học để tính toán nhu cầu calo chính xác của bạn.',
  },
  smart_macro_promo: {
    headline: 'Macro tối ưu theo mục tiêu của bạn',
    body: 'Protein, carbs và chất béo được thiết lập dựa trên mục tiêu, cân nặng và lịch tập — không phải tỷ lệ chung chung.',
  },
  smart_meals_promo: {
    headline: 'Gợi ý bữa ăn AI phù hợp macro của bạn',
    body: 'Mỗi ý tưởng bữa ăn được tạo ra để phù hợp với mục tiêu hàng ngày của bạn.',
  },
  calculating: {
    text: 'Đang xây dựng kế hoạch cá nhân cho [name]...',
    steps: [
      'Phân tích chỉ số cơ thể...',
      'Tính toán TDEE của bạn...',
      'Tối ưu macro theo mục tiêu...',
      'Hoàn thiện kế hoạch...',
    ],
  },
  tdee_targets: {
    headline: 'Mục tiêu hàng ngày của bạn',
    calories: 'Calo mỗi ngày',
    protein: 'Protein',
    carbs: 'Carbs',
    fat: 'Chất béo',
    bmiTitle: 'Chỉ số BMI của bạn',
    bmiCategories: {
      underweight: 'Thiếu cân',
      normal: 'Bình thường',
      overweight: 'Thừa cân',
      obese: 'Béo phì',
    },
    projectionTitle: 'Lộ trình đến cân nặng mục tiêu',
    projectionWeeks: (weeks: number) => `Dự kiến ${weeks} tuần`,
  },
  result_promising: {
    headline: '[name], kế hoạch của bạn đã sẵn sàng.',
    body: 'Người dùng Nutree theo sát kế hoạch thường thấy thay đổi rõ rệt trong 12 tuần đầu.',
    withNutree: 'Với Nutree',
    withoutNutree: 'Tự theo dõi',
    cta: 'Nhận kế hoạch của tôi',
  },
  email: {
    headline: 'Kế hoạch của bạn đã sẵn sàng!',
    body: 'Nhập email để lưu kế hoạch và tiếp tục. Chúng tôi sẽ gửi link tải ứng dụng cho bạn.',
    placeholder: 'email@vidu.com',
    cta: 'Lưu kế hoạch của tôi',
    invalid: 'Email không hợp lệ',
    error: 'Có lỗi xảy ra. Vui lòng thử lại.',
  },
  paywall: {
    headline: 'Mở khóa kế hoạch đầy đủ của bạn',
    bullets: [
      'Mục tiêu calo & macro cá nhân hóa',
      'Gợi ý bữa ăn AI mỗi ngày',
      'Theo dõi tiến độ & điều chỉnh tự động',
    ],
    cta: 'Bắt đầu ngay',
    loading: 'Đang tải các gói...',
    error: 'Không tải được gói đăng ký. Vui lòng thử lại.',
    paymentError: 'Thanh toán chưa hoàn tất. Vui lòng thử lại.',
  },
  success: {
    headline: 'Thanh toán thành công! 🎉',
    body: 'Bước cuối: tải ứng dụng Nutree. Kế hoạch của bạn sẽ tự động xuất hiện khi mở app.',
    qrHint: 'Quét mã QR bằng điện thoại',
    emailHint: 'Chúng tôi cũng đã gửi link tải qua email — kiểm tra hộp thư nếu bạn đang dùng máy tính.',
    appStore: 'Tải trên App Store',
    playStore: 'Tải trên Google Play',
  },
} as const;

export type ViCopy = typeof vi;
```

- [ ] **Step 4: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx src/lib/copy/vi.ts
git commit -m "feat: brand theme, Be Vietnam Pro font, Vietnamese copy module"
```

---

## Task 3: Onboarding types + quiz step navigation

**Files:**
- Create: `src/lib/quiz/types.ts`
- Create: `src/lib/quiz/steps.ts`
- Test: `src/lib/quiz/steps.test.ts`

- [ ] **Step 1: Create `src/lib/quiz/types.ts`** (field names mirror `OnboardingData`'s `@JsonKey` names — the backend contract; no mapping layer)

```ts
/** Snake_case keys match the backend / nutree_ai OnboardingData JSON fields. */
export interface OnboardingPayload {
  name?: string;
  fitness_goal?: 'cut' | 'bulk' | 'recomp';
  target_weight_kg?: number;
  pain_points?: string[];
  referral_sources?: string[];
  challenge_duration?: string;
  gender?: 'male' | 'female';
  age?: number;
  height_cm?: number;
  weight_kg?: number;
  body_fat_percentage?: number;
  training_days_per_week?: number;
  training_minutes_per_session?: number;
  experience_level?: 'beginner' | 'intermediate' | 'advanced';
  training_types?: string[];
  job_type?: 'desk' | 'on_feet' | 'physical';
  dietary_preferences?: string[];
  measurement_unit?: 'metric';
}

/** Normalized TDEE result (from API or local fallback). */
export interface TdeeResult {
  bmr: number;
  tdee: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface Lead {
  email: string;
  web_user_id: string;
  claim_token: string;
}
```

- [ ] **Step 2: Write failing tests `src/lib/quiz/steps.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { QUIZ_STEPS, isQuizStep, nextRoute, prevRoute, stepIndex } from './steps';

describe('quiz steps', () => {
  it('has 23 steps in spec order, starting with name_ask and ending with result_promising', () => {
    expect(QUIZ_STEPS).toHaveLength(23);
    expect(QUIZ_STEPS[0]).toBe('name_ask');
    expect(QUIZ_STEPS[QUIZ_STEPS.length - 1]).toBe('result_promising');
  });

  it('validates step slugs', () => {
    expect(isQuizStep('goal')).toBe(true);
    expect(isQuizStep('health_connect')).toBe(false); // app-only, dropped
    expect(isQuizStep('nonsense')).toBe(false);
  });

  it('navigates forward through quiz steps', () => {
    expect(nextRoute('name_ask')).toBe('/quiz/goal');
    expect(nextRoute('diet')).toBe('/quiz/tdee_science_promo');
  });

  it('exits to /email after the last quiz step', () => {
    expect(nextRoute('result_promising')).toBe('/email');
  });

  it('navigates backward, landing page before first step', () => {
    expect(prevRoute('goal')).toBe('/quiz/name_ask');
    expect(prevRoute('name_ask')).toBe('/');
  });

  it('exposes 1-based progress index', () => {
    expect(stepIndex('name_ask')).toBe(1);
    expect(stepIndex('result_promising')).toBe(23);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- steps`
Expected: FAIL — cannot resolve `./steps`.

- [ ] **Step 4: Create `src/lib/quiz/steps.ts`**

```ts
/** Step slugs = OnboardingScreenId.rcKey from nutree_ai; order per design spec. */
export const QUIZ_STEPS = [
  // Section 1: Greetings & pain points
  'name_ask',
  'goal',
  'target_weight',
  'challenges',
  'referral_source',
  'duration',
  'reflection',
  // Section 2: Personal info
  'sex',
  'age',
  'height_weight',
  'body_fat',
  // Section 3: Training
  'training_days',
  'training_duration',
  'experience',
  'training_type',
  // Section 4: Daily life
  'activity_level',
  'diet',
  // Section 5: Feature promos
  'tdee_science_promo',
  'smart_macro_promo',
  'smart_meals_promo',
  // Section 6: Results
  'calculating',
  'tdee_targets',
  'result_promising',
] as const;

export type QuizStep = (typeof QUIZ_STEPS)[number];

export function isQuizStep(slug: string): slug is QuizStep {
  return (QUIZ_STEPS as readonly string[]).includes(slug);
}

/** Route after `step`; the funnel continues to /email after the last quiz step. */
export function nextRoute(step: QuizStep): string {
  const i = QUIZ_STEPS.indexOf(step);
  return i === QUIZ_STEPS.length - 1 ? '/email' : `/quiz/${QUIZ_STEPS[i + 1]}`;
}

/** Route before `step`; the landing page precedes the first step. */
export function prevRoute(step: QuizStep): string {
  const i = QUIZ_STEPS.indexOf(step);
  return i === 0 ? '/' : `/quiz/${QUIZ_STEPS[i - 1]}`;
}

/** 1-based index for the progress bar. */
export function stepIndex(step: QuizStep): number {
  return QUIZ_STEPS.indexOf(step) + 1;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- steps`
Expected: 6 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/quiz/types.ts src/lib/quiz/steps.ts src/lib/quiz/steps.test.ts
git commit -m "feat: onboarding payload types and quiz step navigation"
```

---

## Task 4: Quiz state store with localStorage persistence

**Files:**
- Create: `src/lib/quiz/store.ts`
- Test: `src/lib/quiz/store.test.ts`

- [ ] **Step 1: Write failing tests `src/lib/quiz/store.test.ts`**

zustand stores are plain JS outside React — testable in node. `persist` no-ops when `localStorage` is missing, so give it an in-memory stub.

```ts
import { describe, it, expect, beforeEach } from 'vitest';

// In-memory localStorage stub (node env has none)
const mem = new Map<string, string>();
globalThis.localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
  key: (i: number) => [...mem.keys()][i] ?? null,
  get length() {
    return mem.size;
  },
} as Storage;

import { useQuizStore, STORAGE_KEY } from './store';

describe('quiz store', () => {
  beforeEach(() => {
    useQuizStore.getState().reset();
    mem.clear();
  });

  it('merges partial payload patches', () => {
    useQuizStore.getState().setData({ fitness_goal: 'cut' });
    useQuizStore.getState().setData({ age: 30 });
    expect(useQuizStore.getState().data).toMatchObject({
      fitness_goal: 'cut',
      age: 30,
      measurement_unit: 'metric',
    });
  });

  it('stores tdee result with source', () => {
    const r = { bmr: 1700, tdee: 2040, calories: 1540, protein_g: 165, carbs_g: 85, fat_g: 60 };
    useQuizStore.getState().setTdee(r, 'fallback');
    expect(useQuizStore.getState().tdee).toEqual(r);
    expect(useQuizStore.getState().tdeeSource).toBe('fallback');
  });

  it('stores lead and purchase flag', () => {
    useQuizStore.getState().setLead({ email: 'a@b.c', web_user_id: 'w1', claim_token: 't1' });
    useQuizStore.getState().setPurchased(true);
    expect(useQuizStore.getState().lead?.claim_token).toBe('t1');
    expect(useQuizStore.getState().purchased).toBe(true);
  });

  it('persists to localStorage under the versioned key', () => {
    useQuizStore.getState().setData({ name: 'Anh' });
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!).state.data.name).toBe('Anh');
  });

  it('reset clears everything', () => {
    useQuizStore.getState().setData({ name: 'Anh' });
    useQuizStore.getState().setPurchased(true);
    useQuizStore.getState().reset();
    expect(useQuizStore.getState().data.name).toBeUndefined();
    expect(useQuizStore.getState().purchased).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- store`
Expected: FAIL — cannot resolve `./store`.

- [ ] **Step 3: Create `src/lib/quiz/store.ts`**

```ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { OnboardingPayload, TdeeResult, Lead } from './types';

export const STORAGE_KEY = 'nutree_funnel_v1';

interface QuizState {
  data: OnboardingPayload;
  tdee: TdeeResult | null;
  tdeeSource: 'api' | 'fallback' | null;
  lead: Lead | null;
  purchased: boolean;
  setData: (patch: Partial<OnboardingPayload>) => void;
  setTdee: (result: TdeeResult, source: 'api' | 'fallback') => void;
  setLead: (lead: Lead) => void;
  setPurchased: (v: boolean) => void;
  reset: () => void;
}

const initial = {
  data: { measurement_unit: 'metric' } as OnboardingPayload,
  tdee: null,
  tdeeSource: null,
  lead: null,
  purchased: false,
};

export const useQuizStore = create<QuizState>()(
  persist(
    (set) => ({
      ...initial,
      setData: (patch) => set((s) => ({ data: { ...s.data, ...patch } })),
      setTdee: (result, source) => set({ tdee: result, tdeeSource: source }),
      setLead: (lead) => set({ lead }),
      setPurchased: (purchased) => set({ purchased }),
      reset: () => set({ ...initial, data: { ...initial.data } }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

/** True once the persisted state has been rehydrated on the client.
 * Render quiz UI only after this to avoid SSR/localStorage mismatch. */
import { useSyncExternalStore } from 'react';
export function useHydrated(): boolean {
  return useSyncExternalStore(
    (cb) => useQuizStore.persist.onFinishHydration(cb),
    () => useQuizStore.persist.hasHydrated(),
    () => false,
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- store`
Expected: 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/quiz/store.ts src/lib/quiz/store.test.ts
git commit -m "feat: persisted quiz state store"
```

---

## Task 5: TDEE fallback calculator (port of tdee_calculator.dart)

**Files:**
- Create: `src/lib/tdee/calculator.ts`
- Test: `src/lib/tdee/calculator.test.ts`

Expected values below were hand-computed from the Dart formulas (Mifflin-St Jeor / Katch-McArdle, job multiplier, goal-based macros with clamps) — they ARE the parity check.

- [ ] **Step 1: Write failing tests `src/lib/tdee/calculator.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { calculateBmr, calculateTdee, calculateMacros, computeTdeeResult } from './calculator';

describe('BMR', () => {
  it('Mifflin-St Jeor male: 30y, 75kg, 175cm', () => {
    // 10*75 + 6.25*175 - 5*30 + 5 = 1698.75
    expect(calculateBmr({ age: 30, sex: 'male', weightKg: 75, heightCm: 175 })).toBeCloseTo(1698.75, 2);
  });

  it('Mifflin-St Jeor female: 25y, 55kg, 160cm', () => {
    // 10*55 + 6.25*160 - 5*25 - 161 = 1264
    expect(calculateBmr({ age: 25, sex: 'female', weightKg: 55, heightCm: 160 })).toBeCloseTo(1264, 2);
  });

  it('Katch-McArdle when body fat provided: 75kg @ 20%', () => {
    // 370 + 21.6 * (75 * 0.8) = 1666
    expect(
      calculateBmr({ age: 30, sex: 'male', weightKg: 75, heightCm: 175, bodyFatPercentage: 20 }),
    ).toBeCloseTo(1666, 2);
  });
});

describe('TDEE', () => {
  it('applies job multiplier (desk=1.2, on_feet=1.4, physical=1.6)', () => {
    const base = { age: 30, sex: 'male' as const, weightKg: 75, heightCm: 175 };
    expect(calculateTdee({ ...base, jobType: 'desk' })).toBeCloseTo(2038.5, 1);
    expect(calculateTdee({ ...base, jobType: 'on_feet' })).toBeCloseTo(2378.25, 1);
    expect(calculateTdee({ ...base, jobType: 'physical' })).toBeCloseTo(2718.0, 1);
  });
});

describe('macros', () => {
  it('cut: tdee-500 kcal, 2.2 g/kg protein, fat dual-gate picks weight-based', () => {
    // tdee 2038.5 → cal 1538.5; protein 75*2.2=165; fat max(75*0.8=60, 1538.5*0.20/9=34.19)=60
    // carbs (1538.5 - 660 - 540)/4 = 84.625
    const m = calculateMacros({ tdee: 2038.5, goal: 'cut', weightKg: 75 });
    expect(m.calories).toBeCloseTo(1538.5, 1);
    expect(m.protein_g).toBeCloseTo(165, 1);
    expect(m.fat_g).toBeCloseTo(60, 1);
    expect(m.carbs_g).toBeCloseTo(84.625, 2);
  });

  it('recomp female: fat dual-gate close call picks weight-based', () => {
    // tdee 1769.6 → cal 1769.6; protein 55*2.0=110
    // fat max(55*0.9=49.5, 1769.6*0.25/9=49.156)=49.5
    // carbs (1769.6 - 440 - 445.5)/4 = 221.025
    const m = calculateMacros({ tdee: 1769.6, goal: 'recomp', weightKg: 55 });
    expect(m.calories).toBeCloseTo(1769.6, 1);
    expect(m.protein_g).toBeCloseTo(110, 1);
    expect(m.fat_g).toBeCloseTo(49.5, 1);
    expect(m.carbs_g).toBeCloseTo(221.025, 2);
  });

  it('bulk beginner: training-level protein 1.8 g/kg, fat dual-gate picks percent-based', () => {
    // tdee 2688 → cal 2988; protein 70*1.8=126
    // fat max(70*1.0=70, 2988*0.25/9=83)=83
    // carbs (2988 - 504 - 747)/4 = 434.25
    const m = calculateMacros({ tdee: 2688, goal: 'bulk', weightKg: 70, trainingLevel: 'beginner' });
    expect(m.protein_g).toBeCloseTo(126, 1);
    expect(m.fat_g).toBeCloseTo(83, 1);
    expect(m.carbs_g).toBeCloseTo(434.25, 2);
  });

  it('clamps protein to 60g minimum', () => {
    const m = calculateMacros({ tdee: 1200, goal: 'cut', weightKg: 25 });
    expect(m.protein_g).toBe(60);
  });

  it('clamps carbs to 50g minimum', () => {
    // aggressive deficit: tdee 1300 → cal 800; protein 90*2.2=198 (792 kcal) leaves nothing
    const m = calculateMacros({ tdee: 1300, goal: 'cut', weightKg: 90 });
    expect(m.carbs_g).toBe(50);
  });
});

describe('computeTdeeResult (end-to-end from payload)', () => {
  it('returns full normalized result', () => {
    const r = computeTdeeResult({
      age: 30,
      gender: 'male',
      weight_kg: 75,
      height_cm: 175,
      job_type: 'desk',
      fitness_goal: 'cut',
    });
    expect(r).not.toBeNull();
    expect(r!.bmr).toBeCloseTo(1698.75, 2);
    expect(r!.tdee).toBeCloseTo(2038.5, 1);
    expect(r!.calories).toBeCloseTo(1538.5, 1);
  });

  it('returns null when required fields missing', () => {
    expect(computeTdeeResult({ age: 30 })).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- calculator`
Expected: FAIL — cannot resolve `./calculator`.

- [ ] **Step 3: Create `src/lib/tdee/calculator.ts`**

```ts
/**
 * Local TDEE fallback — TypeScript port of nutree_ai's tdee_calculator.dart
 * + macro_calculation_constants.dart. Used only when POST /v1/tdee/preview fails.
 */
import type { OnboardingPayload, TdeeResult } from '../quiz/types';

type Sex = 'male' | 'female';
type Goal = 'cut' | 'bulk' | 'recomp';
type JobType = 'desk' | 'on_feet' | 'physical';
type TrainingLevel = 'beginner' | 'intermediate' | 'advanced';

const JOB_TYPE_MULTIPLIER: Record<JobType, number> = {
  desk: 1.2,
  on_feet: 1.4,
  physical: 1.6,
};

const PROTEIN_PER_KG_BY_GOAL: Record<Goal, number> = { cut: 2.2, recomp: 2.0, bulk: 2.0 };

const PROTEIN_PER_KG_BY_TRAINING: Record<Goal, Record<TrainingLevel, number>> = {
  cut: { beginner: 2.2, intermediate: 2.2, advanced: 2.2 },
  recomp: { beginner: 1.8, intermediate: 2.0, advanced: 2.2 },
  bulk: { beginner: 1.8, intermediate: 2.0, advanced: 2.2 },
};

const FAT_PER_KG_BY_GOAL: Record<Goal, number> = { cut: 0.8, recomp: 0.9, bulk: 1.0 };
const FAT_MIN_PERCENT_BY_GOAL: Record<Goal, number> = { cut: 0.2, recomp: 0.25, bulk: 0.25 };

const MIN_PROTEIN_G = 60;
const MAX_PROTEIN_G = 300;
const MIN_FAT_G = 40;
const MAX_FAT_G = 150;
const MIN_CARBS_G = 50;
const KCAL_PER_G_PROTEIN = 4;
const KCAL_PER_G_CARBS = 4;
const KCAL_PER_G_FAT = 9;
const KATCH_MCARDLE_BASE = 370;
const KATCH_MCARDLE_LBM_MULTIPLIER = 21.6;

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

export function calculateBmr(p: {
  age: number;
  sex: Sex;
  weightKg: number;
  heightCm: number;
  bodyFatPercentage?: number;
}): number {
  if (p.bodyFatPercentage != null) {
    const lbm = p.weightKg * (1 - p.bodyFatPercentage / 100);
    return KATCH_MCARDLE_BASE + KATCH_MCARDLE_LBM_MULTIPLIER * lbm;
  }
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age;
  return p.sex === 'male' ? base + 5 : base - 161;
}

export function calculateTdee(p: {
  age: number;
  sex: Sex;
  weightKg: number;
  heightCm: number;
  jobType: JobType;
  bodyFatPercentage?: number;
}): number {
  return calculateBmr(p) * (JOB_TYPE_MULTIPLIER[p.jobType] ?? 1.2);
}

export function calculateMacros(p: {
  tdee: number;
  goal: Goal;
  weightKg: number;
  trainingLevel?: TrainingLevel;
}): { calories: number; protein_g: number; carbs_g: number; fat_g: number } {
  const calories =
    p.goal === 'cut' ? p.tdee - 500 : p.goal === 'bulk' ? p.tdee + 300 : p.tdee;

  const proteinMultiplier = p.trainingLevel
    ? PROTEIN_PER_KG_BY_TRAINING[p.goal][p.trainingLevel]
    : PROTEIN_PER_KG_BY_GOAL[p.goal];
  const protein_g = clamp(p.weightKg * proteinMultiplier, MIN_PROTEIN_G, MAX_PROTEIN_G);

  // Fat dual-gate: max(weight-based, percentage-based) for hormone safety
  const fatFromWeight = p.weightKg * FAT_PER_KG_BY_GOAL[p.goal];
  const fatFromPercent = (calories * FAT_MIN_PERCENT_BY_GOAL[p.goal]) / KCAL_PER_G_FAT;
  const fat_g = clamp(Math.max(fatFromWeight, fatFromPercent), MIN_FAT_G, MAX_FAT_G);

  const remaining = calories - protein_g * KCAL_PER_G_PROTEIN - fat_g * KCAL_PER_G_FAT;
  const carbs_g = Math.max(remaining / KCAL_PER_G_CARBS, MIN_CARBS_G);

  return { calories, protein_g, carbs_g, fat_g };
}

/** Full fallback from the quiz payload. Null if required fields are missing. */
export function computeTdeeResult(data: OnboardingPayload): TdeeResult | null {
  const { age, gender, weight_kg, height_cm, job_type, fitness_goal } = data;
  if (!age || !gender || !weight_kg || !height_cm || !job_type || !fitness_goal) return null;

  const bmr = calculateBmr({
    age,
    sex: gender,
    weightKg: weight_kg,
    heightCm: height_cm,
    bodyFatPercentage: data.body_fat_percentage,
  });
  const tdee = bmr * (JOB_TYPE_MULTIPLIER[job_type] ?? 1.2);
  const macros = calculateMacros({
    tdee,
    goal: fitness_goal,
    weightKg: weight_kg,
    trainingLevel: data.experience_level,
  });
  return { bmr, tdee, ...macros };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- calculator`
Expected: 11 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tdee/calculator.ts src/lib/tdee/calculator.test.ts
git commit -m "feat: local TDEE fallback calculator (parity with tdee_calculator.dart)"
```

---

## Task 6: Backend API client

**Files:**
- Create: `src/lib/api/client.ts`
- Test: `src/lib/api/client.test.ts`

- [ ] **Step 1: Write failing tests `src/lib/api/client.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { previewTdee, createLead } from './client';
import type { OnboardingPayload } from '../quiz/types';

const payload: OnboardingPayload = {
  age: 30,
  gender: 'male',
  height_cm: 175,
  weight_kg: 75,
  job_type: 'desk',
  fitness_goal: 'cut',
  training_days_per_week: 4,
  training_minutes_per_session: 60,
  experience_level: 'intermediate',
  measurement_unit: 'metric',
};

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://api.test');
  vi.stubGlobal('fetch', vi.fn());
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('previewTdee', () => {
  it('POSTs the TdeePreviewRequest shape and normalizes the response', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        JSON.stringify({
          bmr: 1698.75,
          tdee: 2038.5,
          goal: 'cut',
          macros: { calories: 1538.5, protein: 165, carbs: 84.6, fat: 60 },
        }),
        { status: 200 },
      ),
    );

    const result = await previewTdee(payload);

    expect(fetch).toHaveBeenCalledWith(
      'https://api.test/v1/tdee/preview',
      expect.objectContaining({ method: 'POST' }),
    );
    const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body).toEqual({
      age: 30,
      sex: 'male',
      height: 175,
      weight: 75,
      job_type: 'desk',
      training_days_per_week: 4,
      training_minutes_per_session: 60,
      training_level: 'intermediate',
      goal: 'cut',
      unit_system: 'metric',
    });
    expect(result).toEqual({
      bmr: 1698.75,
      tdee: 2038.5,
      calories: 1538.5,
      protein_g: 165,
      carbs_g: 84.6,
      fat_g: 60,
    });
  });

  it('prefers *_grams fields when the backend sends them', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        JSON.stringify({
          bmr: 1,
          tdee: 2,
          goal: 'cut',
          macros: { calories: 3, protein: 0, carbs: 0, fat: 0, protein_grams: 165, carbs_grams: 85, fat_grams: 60 },
        }),
        { status: 200 },
      ),
    );
    const result = await previewTdee(payload);
    expect(result.protein_g).toBe(165);
    expect(result.carbs_g).toBe(85);
    expect(result.fat_g).toBe(60);
  });

  it('throws on non-2xx', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(new Response('{}', { status: 500 }));
    await expect(previewTdee(payload)).rejects.toThrow();
  });
});

describe('createLead', () => {
  it('POSTs email + onboarding payload, returns lead identifiers', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ web_user_id: 'w_1', claim_token: 'ct_1' }), { status: 200 }),
    );
    const lead = await createLead('a@b.vn', payload);
    expect(fetch).toHaveBeenCalledWith(
      'https://api.test/v1/web-funnel/leads',
      expect.objectContaining({ method: 'POST' }),
    );
    const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.email).toBe('a@b.vn');
    expect(body.onboarding_payload).toMatchObject({ fitness_goal: 'cut' });
    expect(lead).toEqual({ email: 'a@b.vn', web_user_id: 'w_1', claim_token: 'ct_1' });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- client`
Expected: FAIL — cannot resolve `./client`.

- [ ] **Step 3: Create `src/lib/api/client.ts`**

```ts
import type { OnboardingPayload, TdeeResult, Lead } from '../quiz/types';

function baseUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!base) throw new Error('NEXT_PUBLIC_API_BASE_URL is not set');
  return base;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

/** Backend response for /v1/tdee/preview (see nutree_ai tdee_models.dart). */
interface TdeeApiResponse {
  bmr: number;
  tdee: number;
  goal: string;
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    protein_grams?: number;
    carbs_grams?: number;
    fat_grams?: number;
  };
}

/** Calls the existing unauthenticated TDEE preview endpoint. */
export async function previewTdee(data: OnboardingPayload): Promise<TdeeResult> {
  const body = {
    age: data.age,
    sex: data.gender,
    height: data.height_cm,
    weight: data.weight_kg,
    ...(data.body_fat_percentage != null && { body_fat_percentage: data.body_fat_percentage }),
    job_type: data.job_type,
    training_days_per_week: data.training_days_per_week,
    training_minutes_per_session: data.training_minutes_per_session,
    ...(data.experience_level && { training_level: data.experience_level }),
    goal: data.fitness_goal,
    unit_system: 'metric',
  };
  const r = await post<TdeeApiResponse>('/v1/tdee/preview', body);
  return {
    bmr: r.bmr,
    tdee: r.tdee,
    calories: r.macros.calories,
    protein_g: r.macros.protein_grams ?? r.macros.protein,
    carbs_g: r.macros.carbs_grams ?? r.macros.carbs,
    fat_g: r.macros.fat_grams ?? r.macros.fat,
  };
}

/** Stores a web lead; backend returns identity for RC checkout + claim handoff. */
export async function createLead(email: string, payload: OnboardingPayload): Promise<Lead> {
  const r = await post<{ web_user_id: string; claim_token: string }>('/v1/web-funnel/leads', {
    email,
    onboarding_payload: payload,
  });
  return { email, web_user_id: r.web_user_id, claim_token: r.claim_token };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- client`
Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/api/client.ts src/lib/api/client.test.ts
git commit -m "feat: backend API client (tdee preview + web-funnel leads)"
```

---

## Task 7: Analytics module

**Files:**
- Create: `src/lib/analytics/track.ts`
- Test: `src/lib/analytics/track.test.ts`

Pixel `<script>` tags are added in Task 20; this module is the call-site API and must exist before screens are built so they can fire `funnel_step_viewed`.

- [ ] **Step 1: Write failing tests `src/lib/analytics/track.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { trackEvent, trackStepViewed } from './track';

describe('analytics', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      gtag: vi.fn(),
      fbq: vi.fn(),
      ttq: { track: vi.fn() },
    });
  });

  it('fans out events to gtag, fbq, ttq', () => {
    trackEvent('funnel_step_viewed', { step: 'goal' });
    const w = window as unknown as { gtag: ReturnType<typeof vi.fn>; fbq: ReturnType<typeof vi.fn>; ttq: { track: ReturnType<typeof vi.fn> } };
    expect(w.gtag).toHaveBeenCalledWith('event', 'funnel_step_viewed', { step: 'goal' });
    expect(w.fbq).toHaveBeenCalledWith('trackCustom', 'funnel_step_viewed', { step: 'goal' });
    expect(w.ttq.track).toHaveBeenCalledWith('funnel_step_viewed', { step: 'goal' });
  });

  it('trackStepViewed sends the step slug', () => {
    trackStepViewed('height_weight');
    const w = window as unknown as { gtag: ReturnType<typeof vi.fn> };
    expect(w.gtag).toHaveBeenCalledWith('event', 'funnel_step_viewed', { step: 'height_weight' });
  });

  it('does not throw when pixels are absent', () => {
    vi.stubGlobal('window', {});
    expect(() => trackEvent('x', {})).not.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- track`
Expected: FAIL — cannot resolve `./track`.

- [ ] **Step 3: Create `src/lib/analytics/track.ts`**

```ts
/**
 * Fan-out event tracking: GA4 (gtag), Meta Pixel (fbq), TikTok Pixel (ttq).
 * Step names use OnboardingScreenId.rcKey slugs to align with the app's
 * analytics taxonomy. Purchase conversions are fired SERVER-SIDE from the
 * RevenueCat webhook (backend) — do not fire purchase pixels here.
 */
type AnyWindow = Window & {
  gtag?: (...args: unknown[]) => void;
  fbq?: (...args: unknown[]) => void;
  ttq?: { track: (event: string, params?: Record<string, unknown>) => void };
};

export function trackEvent(name: string, params: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') return;
  const w = window as AnyWindow;
  try {
    w.gtag?.('event', name, params);
    w.fbq?.('trackCustom', name, params);
    w.ttq?.track(name, params);
  } catch {
    // analytics must never break the funnel
  }
}

/** One event per funnel step view; step = rcKey slug or page name. */
export function trackStepViewed(step: string): void {
  trackEvent('funnel_step_viewed', { step });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- track`
Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/analytics/track.ts src/lib/analytics/track.test.ts
git commit -m "feat: analytics fan-out module with funnel_step_viewed"
```

---

## Task 8: Shared UI components + quiz shell

**Files:**
- Create: `src/components/primary-button.tsx`
- Create: `src/components/option-card.tsx`
- Create: `src/components/quiz-shell.tsx`

These are presentational; correctness is covered by the Playwright E2E in Task 21.

- [ ] **Step 1: Create `src/components/primary-button.tsx`**

```tsx
'use client';

export function PrimaryButton({
  children,
  onClick,
  disabled,
  type = 'button',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-2xl bg-teal-brand px-6 py-4 text-lg font-semibold text-white transition
                 hover:bg-emerald-brand disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 2: Create `src/components/option-card.tsx`**

```tsx
'use client';

export function OptionCard({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`w-full rounded-2xl border-2 px-5 py-4 text-left text-base font-medium transition
        ${selected ? 'border-teal-brand bg-mist text-forest' : 'border-border-brand bg-white text-charcoal hover:border-teal-brand/50'}`}
    >
      {label}
    </button>
  );
}
```

- [ ] **Step 3: Create `src/components/quiz-shell.tsx`** — progress bar, back link, `funnel_step_viewed`, hydration gate

```tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { QUIZ_STEPS, prevRoute, stepIndex, type QuizStep } from '@/lib/quiz/steps';
import { useHydrated } from '@/lib/quiz/store';
import { trackStepViewed } from '@/lib/analytics/track';
import { vi } from '@/lib/copy/vi';

export function QuizShell({ step, children }: { step: QuizStep; children: React.ReactNode }) {
  const router = useRouter();
  const hydrated = useHydrated();

  useEffect(() => {
    trackStepViewed(step);
  }, [step]);

  if (!hydrated) return null; // avoid rendering pre-rehydration state

  const progress = (stepIndex(step) / QUIZ_STEPS.length) * 100;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-8 pt-4">
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push(prevRoute(step))}
          aria-label={vi.common.back}
          className="rounded-full p-2 text-slate-brand hover:bg-mist"
        >
          ←
        </button>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-border-brand">
          <div
            className="h-full rounded-full bg-teal-brand transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <div className="flex flex-1 flex-col">{children}</div>
    </main>
  );
}
```

- [ ] **Step 4: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/primary-button.tsx src/components/option-card.tsx src/components/quiz-shell.tsx
git commit -m "feat: shared UI components and quiz shell with progress + step analytics"
```

---

## Task 9: Generic step components + step registry + dynamic route

**Files:**
- Create: `src/components/steps/single-choice.tsx`
- Create: `src/components/steps/multi-choice.tsx`
- Create: `src/components/steps/registry.tsx` (placeholder entries filled by Tasks 10–14)
- Create: `src/app/quiz/[step]/page.tsx`

- [ ] **Step 1: Create `src/components/steps/single-choice.tsx`** — selecting an option saves and auto-advances (matches app behavior)

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { OptionCard } from '@/components/option-card';
import { useQuizStore } from '@/lib/quiz/store';
import { nextRoute, type QuizStep } from '@/lib/quiz/steps';
import type { OnboardingPayload } from '@/lib/quiz/types';

export function SingleChoiceStep<K extends keyof OnboardingPayload>({
  step,
  field,
  question,
  options,
}: {
  step: QuizStep;
  field: K;
  question: string;
  options: ReadonlyArray<{ readonly key: string; readonly label: string }>;
}) {
  const router = useRouter();
  const value = useQuizStore((s) => s.data[field]);
  const setData = useQuizStore((s) => s.setData);

  return (
    <div className="flex flex-col gap-3">
      <h1 className="mb-4 text-2xl font-bold text-forest">{question}</h1>
      {options.map((o) => (
        <OptionCard
          key={o.key}
          label={o.label}
          selected={value === o.key}
          onClick={() => {
            setData({ [field]: o.key } as Partial<OnboardingPayload>);
            router.push(nextRoute(step));
          }}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/steps/multi-choice.tsx`** — toggle + explicit continue

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { OptionCard } from '@/components/option-card';
import { PrimaryButton } from '@/components/primary-button';
import { useQuizStore } from '@/lib/quiz/store';
import { nextRoute, type QuizStep } from '@/lib/quiz/steps';
import type { OnboardingPayload } from '@/lib/quiz/types';
import { vi } from '@/lib/copy/vi';

type ArrayField = 'pain_points' | 'referral_sources' | 'training_types' | 'dietary_preferences';

export function MultiChoiceStep({
  step,
  field,
  question,
  hint,
  options,
}: {
  step: QuizStep;
  field: ArrayField;
  question: string;
  hint?: string;
  options: ReadonlyArray<{ readonly key: string; readonly label: string }>;
}) {
  const router = useRouter();
  const values = useQuizStore((s) => s.data[field]) ?? [];
  const setData = useQuizStore((s) => s.setData);

  const toggle = (key: string) => {
    const next = values.includes(key) ? values.filter((v) => v !== key) : [...values, key];
    setData({ [field]: next } as Partial<OnboardingPayload>);
  };

  return (
    <div className="flex flex-1 flex-col gap-3">
      <h1 className="text-2xl font-bold text-forest">{question}</h1>
      {hint && <p className="mb-2 text-sm text-muted-brand">{hint}</p>}
      <div className="flex flex-col gap-3">
        {options.map((o) => (
          <OptionCard key={o.key} label={o.label} selected={values.includes(o.key)} onClick={() => toggle(o.key)} />
        ))}
      </div>
      <div className="mt-auto pt-6">
        <PrimaryButton disabled={values.length === 0} onClick={() => router.push(nextRoute(step))}>
          {vi.common.continue}
        </PrimaryButton>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `src/components/steps/registry.tsx`** — the single map from slug → screen. Start with the steps expressible via the generic components; later tasks add their imports/entries here.

```tsx
'use client';

import type { QuizStep } from '@/lib/quiz/steps';
import { vi } from '@/lib/copy/vi';
import { SingleChoiceStep } from './single-choice';
import { MultiChoiceStep } from './multi-choice';

/** slug → screen component. Every QuizStep must have an entry (registry check in page.tsx). */
export const STEP_COMPONENTS: Partial<Record<QuizStep, React.ComponentType>> = {
  goal: () => (
    <SingleChoiceStep step="goal" field="fitness_goal" question={vi.goal.question} options={vi.goal.options} />
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
  sex: () => <SingleChoiceStep step="sex" field="gender" question={vi.sex.question} options={vi.sex.options} />,
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
```

- [ ] **Step 4: Create `src/app/quiz/[step]/page.tsx`**

```tsx
import { notFound } from 'next/navigation';
import { QUIZ_STEPS, isQuizStep } from '@/lib/quiz/steps';
import { QuizShell } from '@/components/quiz-shell';
import { StepRenderer } from './step-renderer';

export function generateStaticParams() {
  return QUIZ_STEPS.map((step) => ({ step }));
}

export default async function QuizStepPage({ params }: { params: Promise<{ step: string }> }) {
  const { step } = await params;
  if (!isQuizStep(step)) notFound();
  return (
    <QuizShell step={step}>
      <StepRenderer step={step} />
    </QuizShell>
  );
}
```

- [ ] **Step 5: Create `src/app/quiz/[step]/step-renderer.tsx`** (client component bridging the server route to the registry)

```tsx
'use client';

import type { QuizStep } from '@/lib/quiz/steps';
import { STEP_COMPONENTS } from '@/components/steps/registry';

export function StepRenderer({ step }: { step: QuizStep }) {
  const Component = STEP_COMPONENTS[step];
  if (!Component) {
    // Steps land here until their task adds a registry entry.
    return <p className="text-muted-brand">Chưa triển khai: {step}</p>;
  }
  return <Component />;
}
```

- [ ] **Step 6: Verify in dev**

Run: `npm run build`
Expected: build passes. Then `npm run dev` and open `http://localhost:3000/quiz/goal` — 3 goal options render; clicking one navigates to `/quiz/target_weight` (placeholder text for now). `http://localhost:3000/quiz/bogus` → 404.

- [ ] **Step 7: Commit**

```bash
git add src/components/steps src/app/quiz
git commit -m "feat: quiz step registry, generic choice steps, dynamic /quiz/[step] route"
```

---

## Task 10: Input steps — name, target weight, age, height/weight, body fat

**Files:**
- Create: `src/components/steps/text-input-step.tsx`
- Create: `src/components/steps/number-input-step.tsx`
- Create: `src/components/steps/height-weight.tsx`
- Modify: `src/components/steps/registry.tsx`

- [ ] **Step 1: Create `src/components/steps/text-input-step.tsx`** (used for name_ask; skippable like the app)

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PrimaryButton } from '@/components/primary-button';
import { useQuizStore } from '@/lib/quiz/store';
import { nextRoute, type QuizStep } from '@/lib/quiz/steps';
import { vi } from '@/lib/copy/vi';

export function NameAskStep({ step }: { step: QuizStep }) {
  const router = useRouter();
  const saved = useQuizStore((s) => s.data.name);
  const setData = useQuizStore((s) => s.setData);
  const [value, setValue] = useState(saved ?? '');

  const submit = () => {
    setData({ name: value.trim() || undefined });
    router.push(nextRoute(step));
  };

  return (
    <div className="flex flex-1 flex-col gap-4">
      <h1 className="text-2xl font-bold text-forest">{vi.name_ask.question}</h1>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && value.trim() && submit()}
        placeholder={vi.name_ask.placeholder}
        autoFocus
        className="rounded-2xl border-2 border-border-brand bg-white px-5 py-4 text-lg outline-none focus:border-teal-brand"
      />
      <div className="mt-auto flex flex-col gap-3 pt-6">
        <PrimaryButton disabled={!value.trim()} onClick={submit}>
          {vi.common.continue}
        </PrimaryButton>
        <button
          type="button"
          onClick={() => {
            setData({ name: undefined });
            router.push(nextRoute(step));
          }}
          className="py-2 text-sm font-medium text-muted-brand hover:text-slate-brand"
        >
          {vi.common.skip}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/steps/number-input-step.tsx`** (generic: target_weight, age, body_fat)

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PrimaryButton } from '@/components/primary-button';
import { useQuizStore } from '@/lib/quiz/store';
import { nextRoute, type QuizStep } from '@/lib/quiz/steps';
import type { OnboardingPayload } from '@/lib/quiz/types';
import { vi } from '@/lib/copy/vi';

type NumberField = 'target_weight_kg' | 'age' | 'body_fat_percentage';

export function NumberInputStep({
  step,
  field,
  question,
  unit,
  min,
  max,
  hint,
  optional = false,
}: {
  step: QuizStep;
  field: NumberField;
  question: string;
  unit: string;
  min: number;
  max: number;
  hint?: string;
  optional?: boolean;
}) {
  const router = useRouter();
  const saved = useQuizStore((s) => s.data[field]);
  const setData = useQuizStore((s) => s.setData);
  const [value, setValue] = useState(saved != null ? String(saved) : '');

  const parsed = Number(value);
  const valid = value !== '' && Number.isFinite(parsed) && parsed >= min && parsed <= max;

  const submit = () => {
    setData({ [field]: parsed } as Partial<OnboardingPayload>);
    router.push(nextRoute(step));
  };

  return (
    <div className="flex flex-1 flex-col gap-4">
      <h1 className="text-2xl font-bold text-forest">{question}</h1>
      {hint && <p className="text-sm text-muted-brand">{hint}</p>}
      <div className="flex items-center gap-3">
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && valid && submit()}
          min={min}
          max={max}
          autoFocus
          className="w-40 rounded-2xl border-2 border-border-brand bg-white px-5 py-4 text-center text-2xl font-bold outline-none focus:border-teal-brand"
        />
        <span className="text-lg text-muted-brand">{unit}</span>
      </div>
      <div className="mt-auto flex flex-col gap-3 pt-6">
        <PrimaryButton disabled={!valid} onClick={submit}>
          {vi.common.continue}
        </PrimaryButton>
        {optional && (
          <button
            type="button"
            onClick={() => {
              setData({ [field]: undefined } as Partial<OnboardingPayload>);
              router.push(nextRoute(step));
            }}
            className="py-2 text-sm font-medium text-muted-brand hover:text-slate-brand"
          >
            {vi.common.skip}
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `src/components/steps/height-weight.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PrimaryButton } from '@/components/primary-button';
import { useQuizStore } from '@/lib/quiz/store';
import { nextRoute } from '@/lib/quiz/steps';
import { vi } from '@/lib/copy/vi';

export function HeightWeightStep() {
  const router = useRouter();
  const data = useQuizStore((s) => s.data);
  const setData = useQuizStore((s) => s.setData);
  const [height, setHeight] = useState(data.height_cm != null ? String(data.height_cm) : '');
  const [weight, setWeight] = useState(data.weight_kg != null ? String(data.weight_kg) : '');

  const h = Number(height);
  const w = Number(weight);
  const valid = Number.isFinite(h) && h >= 100 && h <= 250 && Number.isFinite(w) && w >= 30 && w <= 250;

  const field = (
    label: string,
    value: string,
    onChange: (v: string) => void,
  ) => (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-slate-brand">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-2xl border-2 border-border-brand bg-white px-5 py-4 text-xl font-bold outline-none focus:border-teal-brand"
      />
    </label>
  );

  return (
    <div className="flex flex-1 flex-col gap-4">
      <h1 className="text-2xl font-bold text-forest">{vi.height_weight.question}</h1>
      <div className="grid grid-cols-2 gap-4">
        {field(vi.height_weight.heightLabel, height, setHeight)}
        {field(vi.height_weight.weightLabel, weight, setWeight)}
      </div>
      <div className="mt-auto pt-6">
        <PrimaryButton
          disabled={!valid}
          onClick={() => {
            setData({ height_cm: h, weight_kg: w });
            router.push(nextRoute('height_weight'));
          }}
        >
          {vi.common.continue}
        </PrimaryButton>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Add registry entries** — in `src/components/steps/registry.tsx`, add imports and entries:

```tsx
import { NameAskStep } from './text-input-step';
import { NumberInputStep } from './number-input-step';
import { HeightWeightStep } from './height-weight';
```

and inside `STEP_COMPONENTS`:

```tsx
  name_ask: () => <NameAskStep step="name_ask" />,
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
  age: () => (
    <NumberInputStep step="age" field="age" question={vi.age.question} unit={vi.age.unit} min={13} max={100} />
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
```

- [ ] **Step 5: Verify in dev**

Run: `npm run build`
Expected: passes. In `npm run dev`, walk `/quiz/name_ask` → name persists across a page reload (localStorage); `/quiz/body_fat` shows the skip button.

- [ ] **Step 6: Commit**

```bash
git add src/components/steps
git commit -m "feat: text/number input quiz steps (name, target weight, age, height/weight, body fat)"
```

---

## Task 11: Remaining quiz steps — training days/duration, reflection, promos

**Files:**
- Create: `src/components/steps/training-days.tsx`
- Create: `src/components/steps/reflection.tsx`
- Create: `src/components/steps/promo.tsx`
- Create: `src/lib/quiz/reflection.ts`
- Test: `src/lib/quiz/reflection.test.ts`
- Modify: `src/components/steps/registry.tsx`

- [ ] **Step 1: Write failing test `src/lib/quiz/reflection.test.ts`** for template interpolation

```ts
import { describe, it, expect } from 'vitest';
import { buildReflection } from './reflection';

describe('buildReflection', () => {
  it('interpolates name, goal label, challenge labels, duration label', () => {
    const text = buildReflection({
      name: 'Anh',
      fitness_goal: 'cut',
      pain_points: ['no_time', 'cravings'],
      challenge_duration: 'few_months',
    });
    expect(text).toContain('Anh');
    expect(text).toContain('Giảm cân'.toLowerCase());
    expect(text).toContain('không có thời gian');
    expect(text).toContain('thèm ăn vặt');
    expect(text).toContain('vài tháng');
    expect(text).not.toMatch(/\[(name|goal|challenges|duration)\]/);
  });

  it('falls back to generic name when name skipped', () => {
    const text = buildReflection({ fitness_goal: 'bulk' });
    expect(text.startsWith('Bạn')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- reflection`
Expected: FAIL — cannot resolve `./reflection`.

- [ ] **Step 3: Create `src/lib/quiz/reflection.ts`**

```ts
import { vi } from '../copy/vi';
import type { OnboardingPayload } from './types';

const label = (
  options: ReadonlyArray<{ readonly key: string; readonly label: string }>,
  key: string | undefined,
): string | undefined => options.find((o) => o.key === key)?.label;

/** Fills the reflection template with the user's earlier answers (lowercased inline). */
export function buildReflection(data: OnboardingPayload): string {
  const goal = label(vi.goal.options, data.fitness_goal) ?? '';
  const duration = label(vi.duration.options, data.challenge_duration) ?? '';
  const challenges = (data.pain_points ?? [])
    .slice(0, 3)
    .map((k) => label(vi.challenges.options, k))
    .filter(Boolean)
    .join(', ');

  return vi.reflection.template
    .replace('[name]', data.name || vi.reflection.fallbackName)
    .replace('[goal]', goal.toLowerCase())
    .replace('[challenges]', challenges.toLowerCase())
    .replace('[duration]', duration.toLowerCase());
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- reflection`
Expected: 2 tests PASS.

- [ ] **Step 5: Create `src/components/steps/training-days.tsx`** (0–7 chips; range mirrors `TdeePreviewRequest` 0–7)

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useQuizStore } from '@/lib/quiz/store';
import { nextRoute } from '@/lib/quiz/steps';
import { vi } from '@/lib/copy/vi';

export function TrainingDaysStep() {
  const router = useRouter();
  const value = useQuizStore((s) => s.data.training_days_per_week);
  const setData = useQuizStore((s) => s.setData);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-forest">{vi.training_days.question}</h1>
      <div className="grid grid-cols-4 gap-3">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((d) => (
          <button
            key={d}
            type="button"
            aria-pressed={value === d}
            onClick={() => {
              setData({ training_days_per_week: d });
              router.push(nextRoute('training_days'));
            }}
            className={`rounded-2xl border-2 py-4 text-xl font-bold transition
              ${value === d ? 'border-teal-brand bg-mist text-forest' : 'border-border-brand bg-white text-charcoal hover:border-teal-brand/50'}`}
          >
            {d}
          </button>
        ))}
      </div>
      <p className="text-center text-sm text-muted-brand">{vi.training_days.unit}</p>
    </div>
  );
}
```

- [ ] **Step 6: Create `src/components/steps/reflection.tsx`**

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { PrimaryButton } from '@/components/primary-button';
import { useQuizStore } from '@/lib/quiz/store';
import { nextRoute } from '@/lib/quiz/steps';
import { buildReflection } from '@/lib/quiz/reflection';
import { vi } from '@/lib/copy/vi';

export function ReflectionStep() {
  const router = useRouter();
  const data = useQuizStore((s) => s.data);

  return (
    <div className="flex flex-1 flex-col justify-center gap-8 text-center">
      <p className="text-2xl font-semibold leading-relaxed text-forest">{buildReflection(data)}</p>
      <PrimaryButton onClick={() => router.push(nextRoute('reflection'))}>
        {vi.common.continue}
      </PrimaryButton>
    </div>
  );
}
```

- [ ] **Step 7: Create `src/components/steps/promo.tsx`** (shared by the 3 promo screens)

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { PrimaryButton } from '@/components/primary-button';
import { nextRoute, type QuizStep } from '@/lib/quiz/steps';
import { vi } from '@/lib/copy/vi';

export function PromoStep({
  step,
  headline,
  body,
  emoji,
}: {
  step: QuizStep;
  headline: string;
  body: string;
  emoji: string;
}) {
  const router = useRouter();
  return (
    <div className="flex flex-1 flex-col justify-center gap-6 text-center">
      <div className="text-6xl">{emoji}</div>
      <h1 className="text-3xl font-extrabold text-forest">{headline}</h1>
      <p className="text-lg leading-relaxed text-slate-brand">{body}</p>
      <div className="pt-4">
        <PrimaryButton onClick={() => router.push(nextRoute(step))}>{vi.common.continue}</PrimaryButton>
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Add registry entries** — in `registry.tsx` add imports:

```tsx
import { TrainingDaysStep } from './training-days';
import { ReflectionStep } from './reflection';
import { PromoStep } from './promo';
```

and entries:

```tsx
  reflection: () => <ReflectionStep />,
  training_days: () => <TrainingDaysStep />,
  training_duration: () => {
    // stores minutes as number; option keys are the minute values
    const opts = vi.training_duration.options;
    return (
      <TrainingDurationStep question={vi.training_duration.question} options={opts} />
    );
  },
  tdee_science_promo: () => (
    <PromoStep step="tdee_science_promo" emoji="🔬" headline={vi.tdee_science_promo.headline} body={vi.tdee_science_promo.body} />
  ),
  smart_macro_promo: () => (
    <PromoStep step="smart_macro_promo" emoji="🥗" headline={vi.smart_macro_promo.headline} body={vi.smart_macro_promo.body} />
  ),
  smart_meals_promo: () => (
    <PromoStep step="smart_meals_promo" emoji="🤖" headline={vi.smart_meals_promo.headline} body={vi.smart_meals_promo.body} />
  ),
```

- [ ] **Step 9: Add `TrainingDurationStep` to `src/components/steps/training-days.tsx`** (same file — both are tiny training inputs; stores `training_minutes_per_session` as a number)

```tsx
export function TrainingDurationStep({
  question,
  options,
}: {
  question: string;
  options: ReadonlyArray<{ readonly key: string; readonly label: string }>;
}) {
  const router = useRouter();
  const value = useQuizStore((s) => s.data.training_minutes_per_session);
  const setData = useQuizStore((s) => s.setData);

  return (
    <div className="flex flex-col gap-3">
      <h1 className="mb-4 text-2xl font-bold text-forest">{question}</h1>
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          aria-pressed={value === Number(o.key)}
          onClick={() => {
            setData({ training_minutes_per_session: Number(o.key) });
            router.push(nextRoute('training_duration'));
          }}
          className={`w-full rounded-2xl border-2 px-5 py-4 text-left text-base font-medium transition
            ${value === Number(o.key) ? 'border-teal-brand bg-mist text-forest' : 'border-border-brand bg-white text-charcoal hover:border-teal-brand/50'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
```

(Also add the import in registry: `import { TrainingDaysStep, TrainingDurationStep } from './training-days';` — replace the earlier single import.)

- [ ] **Step 10: Verify all quiz input steps work end-to-end**

Run: `npm run build && npm test`
Expected: build + all unit tests pass. In dev, walking `/quiz/name_ask` through `/quiz/smart_meals_promo` never hits "Chưa triển khai" except `calculating`, `tdee_targets`, `result_promising` (next tasks).

- [ ] **Step 11: Commit**

```bash
git add src/components/steps src/lib/quiz/reflection.ts src/lib/quiz/reflection.test.ts
git commit -m "feat: training, reflection, and promo quiz steps"
```

---

## Task 12: Calculating screen (previewTdee + fallback)

**Files:**
- Create: `src/components/steps/calculating.tsx`
- Modify: `src/components/steps/registry.tsx`

- [ ] **Step 1: Create `src/components/steps/calculating.tsx`**

Behavior: on mount, fire `previewTdee`; run a ~4s staged progress animation; when both the animation and the request settle, store the result (API, or local fallback on failure) and advance. Guard against double-run in React StrictMode.

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuizStore } from '@/lib/quiz/store';
import { nextRoute } from '@/lib/quiz/steps';
import { previewTdee } from '@/lib/api/client';
import { computeTdeeResult } from '@/lib/tdee/calculator';
import { vi } from '@/lib/copy/vi';

const STAGE_MS = 1000;

export function CalculatingStep() {
  const router = useRouter();
  const data = useQuizStore((s) => s.data);
  const setTdee = useQuizStore((s) => s.setTdee);
  const [stage, setStage] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const timer = setInterval(
      () => setStage((s) => Math.min(s + 1, vi.calculating.steps.length - 1)),
      STAGE_MS,
    );
    const minDelay = new Promise((r) => setTimeout(r, STAGE_MS * vi.calculating.steps.length));

    const fetchTdee = previewTdee(data)
      .then((result) => ({ result, source: 'api' as const }))
      .catch(() => {
        const fallback = computeTdeeResult(data);
        return fallback ? { result: fallback, source: 'fallback' as const } : null;
      });

    Promise.all([fetchTdee, minDelay]).then(([outcome]) => {
      clearInterval(timer);
      if (outcome) {
        setTdee(outcome.result, outcome.source);
        router.push(nextRoute('calculating'));
      } else {
        // Required fields missing (deep-linked mid-quiz) — restart the quiz.
        router.push('/quiz/name_ask');
      }
    });

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
      <div className="h-16 w-16 animate-spin rounded-full border-4 border-mist border-t-teal-brand" />
      <h1 className="text-2xl font-bold text-forest">
        {vi.calculating.text.replace('[name]', data.name || vi.reflection.fallbackName)}
      </h1>
      <p className="text-slate-brand" aria-live="polite">
        {vi.calculating.steps[stage]}
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Register it** — in `registry.tsx`:

```tsx
import { CalculatingStep } from './calculating';
// …
  calculating: () => <CalculatingStep />,
```

- [ ] **Step 3: Verify fallback path in dev**

With `NEXT_PUBLIC_API_BASE_URL` pointing at a non-existent host in `.env.local`, fill the quiz then visit `/quiz/calculating`.
Expected: ~4s animation, then navigation to `/quiz/tdee_targets`; `localStorage.nutree_funnel_v1` contains `tdee` with `tdeeSource: "fallback"`.

- [ ] **Step 4: Commit**

```bash
git add src/components/steps/calculating.tsx src/components/steps/registry.tsx
git commit -m "feat: calculating screen with previewTdee and local fallback"
```

---

## Task 13: TDEE results screen (BMI bar, macro cards, projection)

**Files:**
- Create: `src/lib/tdee/insights.ts`
- Test: `src/lib/tdee/insights.test.ts`
- Create: `src/components/steps/tdee-targets.tsx`
- Modify: `src/components/steps/registry.tsx`

- [ ] **Step 1: Write failing tests `src/lib/tdee/insights.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { bmi, bmiCategory, weeksToTarget } from './insights';

describe('bmi', () => {
  it('computes weight / (height m)^2', () => {
    expect(bmi(75, 175)).toBeCloseTo(24.49, 2);
  });
  it('categorizes per WHO cutoffs', () => {
    expect(bmiCategory(17)).toBe('underweight');
    expect(bmiCategory(22)).toBe('normal');
    expect(bmiCategory(27)).toBe('overweight');
    expect(bmiCategory(31)).toBe('obese');
  });
});

describe('weeksToTarget', () => {
  it('cut: 0.5 kg/week', () => {
    expect(weeksToTarget({ currentKg: 80, targetKg: 74, goal: 'cut' })).toBe(12);
  });
  it('bulk: 0.25 kg/week', () => {
    expect(weeksToTarget({ currentKg: 60, targetKg: 63, goal: 'bulk' })).toBe(12);
  });
  it('recomp or no target: null', () => {
    expect(weeksToTarget({ currentKg: 70, targetKg: undefined, goal: 'cut' })).toBeNull();
    expect(weeksToTarget({ currentKg: 70, targetKg: 65, goal: 'recomp' })).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- insights`
Expected: FAIL — cannot resolve `./insights`.

- [ ] **Step 3: Create `src/lib/tdee/insights.ts`**

```ts
export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

export type BmiCategory = 'underweight' | 'normal' | 'overweight' | 'obese';

export function bmiCategory(value: number): BmiCategory {
  if (value < 18.5) return 'underweight';
  if (value < 25) return 'normal';
  if (value < 30) return 'overweight';
  return 'obese';
}

/** Safe weekly rates: cut −0.5 kg/wk, bulk +0.25 kg/wk. Null when not applicable. */
export function weeksToTarget(p: {
  currentKg: number;
  targetKg: number | undefined;
  goal: 'cut' | 'bulk' | 'recomp' | undefined;
}): number | null {
  if (p.targetKg == null || p.goal == null || p.goal === 'recomp') return null;
  const delta = p.targetKg - p.currentKg;
  const rate = p.goal === 'cut' ? -0.5 : 0.25;
  if (delta === 0 || Math.sign(delta) !== Math.sign(rate)) return null;
  return Math.ceil(delta / rate);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- insights`
Expected: 5 tests PASS.

- [ ] **Step 5: Create `src/components/steps/tdee-targets.tsx`**

```tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PrimaryButton } from '@/components/primary-button';
import { useQuizStore } from '@/lib/quiz/store';
import { nextRoute } from '@/lib/quiz/steps';
import { bmi, bmiCategory, weeksToTarget } from '@/lib/tdee/insights';
import { vi } from '@/lib/copy/vi';

const BMI_MIN = 15;
const BMI_MAX = 35;

export function TdeeTargetsStep() {
  const router = useRouter();
  // Separate selectors — an object selector would create a new reference
  // every render and loop useSyncExternalStore.
  const data = useQuizStore((s) => s.data);
  const tdee = useQuizStore((s) => s.tdee);

  const missing = !tdee || !data.weight_kg || !data.height_cm;
  useEffect(() => {
    // Deep link without state — send back through calculating.
    if (missing) router.replace('/quiz/calculating');
  }, [missing, router]);
  if (missing || !tdee || !data.weight_kg || !data.height_cm) return null;

  const bmiValue = bmi(data.weight_kg, data.height_cm);
  const category = bmiCategory(bmiValue);
  const bmiPct = Math.min(Math.max((bmiValue - BMI_MIN) / (BMI_MAX - BMI_MIN), 0), 1) * 100;
  const weeks = weeksToTarget({
    currentKg: data.weight_kg,
    targetKg: data.target_weight_kg,
    goal: data.fitness_goal,
  });

  const macroCard = (label: string, grams: number, colorClass: string) => (
    <div className="flex flex-col items-center gap-1 rounded-2xl bg-white p-4 shadow-sm">
      <span className={`text-2xl font-extrabold ${colorClass}`}>{Math.round(grams)}g</span>
      <span className="text-sm text-muted-brand">{label}</span>
    </div>
  );

  return (
    <div className="flex flex-1 flex-col gap-6">
      <h1 className="text-2xl font-bold text-forest">{vi.tdee_targets.headline}</h1>

      <div className="rounded-3xl bg-forest p-6 text-center text-white">
        <div className="text-5xl font-extrabold">{Math.round(tdee.calories)}</div>
        <div className="mt-1 text-sm opacity-80">{vi.tdee_targets.calories}</div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {macroCard(vi.tdee_targets.protein, tdee.protein_g, 'text-protein')}
        {macroCard(vi.tdee_targets.carbs, tdee.carbs_g, 'text-carbs')}
        {macroCard(vi.tdee_targets.fat, tdee.fat_g, 'text-fat')}
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="font-semibold text-forest">{vi.tdee_targets.bmiTitle}</span>
          <span className="text-sm text-muted-brand">
            {bmiValue.toFixed(1)} — {vi.tdee_targets.bmiCategories[category]}
          </span>
        </div>
        <div className="relative h-3 rounded-full bg-gradient-to-r from-sky-400 via-emerald-400 via-40% to-red-400">
          <div
            className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-forest shadow"
            style={{ left: `${bmiPct}%` }}
          />
        </div>
      </div>

      {weeks !== null && data.target_weight_kg != null && (
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-1 font-semibold text-forest">{vi.tdee_targets.projectionTitle}</div>
          <div className="text-sm text-muted-brand">
            {data.weight_kg}kg → {data.target_weight_kg}kg · {vi.tdee_targets.projectionWeeks(weeks)}
          </div>
        </div>
      )}

      <div className="mt-auto pt-4">
        <PrimaryButton onClick={() => router.push(nextRoute('tdee_targets'))}>
          {vi.common.continue}
        </PrimaryButton>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Register it** — in `registry.tsx`:

```tsx
import { TdeeTargetsStep } from './tdee-targets';
// …
  tdee_targets: () => <TdeeTargetsStep />,
```

- [ ] **Step 7: Verify build + tests, view in dev**

Run: `npm run build && npm test`
Expected: pass. In dev after completing the quiz: calories card, 3 macro cards, BMI marker positioned, projection row visible when target weight set.

- [ ] **Step 8: Commit**

```bash
git add src/lib/tdee/insights.ts src/lib/tdee/insights.test.ts src/components/steps/tdee-targets.tsx src/components/steps/registry.tsx
git commit -m "feat: TDEE results screen with BMI bar, macro cards, target projection"
```

---

## Task 14: Result promising screen

**Files:**
- Create: `src/components/steps/result-promising.tsx`
- Modify: `src/components/steps/registry.tsx`

- [ ] **Step 1: Create `src/components/steps/result-promising.tsx`** — SVG potential chart ("with Nutree" vs "without"), then CTA into conversion

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { PrimaryButton } from '@/components/primary-button';
import { useQuizStore } from '@/lib/quiz/store';
import { nextRoute } from '@/lib/quiz/steps';
import { vi } from '@/lib/copy/vi';

export function ResultPromisingStep() {
  const router = useRouter();
  const name = useQuizStore((s) => s.data.name);

  return (
    <div className="flex flex-1 flex-col gap-6">
      <h1 className="text-2xl font-bold text-forest">
        {vi.result_promising.headline.replace('[name]', name || vi.reflection.fallbackName)}
      </h1>
      <p className="text-slate-brand">{vi.result_promising.body}</p>

      <svg viewBox="0 0 320 200" className="w-full rounded-2xl bg-white p-2 shadow-sm" role="img">
        {/* axes */}
        <line x1="30" y1="170" x2="300" y2="170" stroke="#d4e5de" strokeWidth="2" />
        <line x1="30" y1="20" x2="30" y2="170" stroke="#d4e5de" strokeWidth="2" />
        {/* without Nutree: shallow, plateaus */}
        <path d="M30 160 C 110 150, 190 145, 300 140" fill="none" stroke="#9ba8a3" strokeWidth="3" strokeDasharray="6 5" />
        {/* with Nutree: steady compounding progress */}
        <path d="M30 160 C 120 140, 180 90, 300 40" fill="none" stroke="#29b6a1" strokeWidth="4" strokeLinecap="round" />
        <circle cx="300" cy="40" r="6" fill="#29b6a1" />
        <text x="200" y="30" fontSize="12" fill="#1a4739" fontWeight="700">
          {vi.result_promising.withNutree}
        </text>
        <text x="210" y="130" fontSize="12" fill="#6b7b75">
          {vi.result_promising.withoutNutree}
        </text>
      </svg>

      <div className="mt-auto pt-4">
        <PrimaryButton onClick={() => router.push(nextRoute('result_promising'))}>
          {vi.result_promising.cta}
        </PrimaryButton>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Register it** — in `registry.tsx`:

```tsx
import { ResultPromisingStep } from './result-promising';
// …
  result_promising: () => <ResultPromisingStep />,
```

Also change the type of `STEP_COMPONENTS` from `Partial<Record<…>>` to `Record<QuizStep, React.ComponentType>` — every step now has an entry, and the compiler will catch future gaps. Remove the fallback branch in `step-renderer.tsx`:

```tsx
export function StepRenderer({ step }: { step: QuizStep }) {
  const Component = STEP_COMPONENTS[step];
  return <Component />;
}
```

- [ ] **Step 3: Verify full quiz is registered**

Run: `npm run build`
Expected: passes; the `Record<QuizStep, …>` type would fail compilation if any of the 23 steps lacked an entry.

- [ ] **Step 4: Commit**

```bash
git add src/components/steps src/app/quiz
git commit -m "feat: result promising screen; step registry complete for all 23 steps"
```

---

## Task 15: Email capture page

**Files:**
- Create: `src/app/email/page.tsx`
- Create: `src/lib/quiz/email.ts`
- Test: `src/lib/quiz/email.test.ts`

- [ ] **Step 1: Write failing test `src/lib/quiz/email.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { isValidEmail } from './email';

describe('isValidEmail', () => {
  it('accepts normal addresses', () => {
    expect(isValidEmail('a@b.vn')).toBe(true);
    expect(isValidEmail('nguyen.van.a+tag@gmail.com')).toBe(true);
  });
  it('rejects malformed addresses', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('abc')).toBe(false);
    expect(isValidEmail('a@b')).toBe(false);
    expect(isValidEmail('a b@c.vn')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- email`
Expected: FAIL — cannot resolve `./email`.

- [ ] **Step 3: Create `src/lib/quiz/email.ts`**

```ts
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- email`
Expected: 2 tests PASS.

- [ ] **Step 5: Create `src/app/email/page.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PrimaryButton } from '@/components/primary-button';
import { useQuizStore, useHydrated } from '@/lib/quiz/store';
import { createLead } from '@/lib/api/client';
import { isValidEmail } from '@/lib/quiz/email';
import { trackStepViewed, trackEvent } from '@/lib/analytics/track';
import { vi } from '@/lib/copy/vi';

export default function EmailPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const data = useQuizStore((s) => s.data);
  const lead = useQuizStore((s) => s.lead);
  const setLead = useQuizStore((s) => s.setLead);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => trackStepViewed('email_capture'), []);
  useEffect(() => {
    if (lead) setEmail(lead.email);
  }, [lead]);

  if (!hydrated) return null;

  const submit = async () => {
    if (!isValidEmail(email)) {
      setError(vi.email.invalid);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await createLead(email.trim(), data);
      setLead(result);
      trackEvent('lead_created', {});
      router.push('/paywall');
    } catch {
      setError(vi.email.error);
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-4 px-5 py-8">
      <h1 className="text-3xl font-extrabold text-forest">{vi.email.headline}</h1>
      <p className="text-slate-brand">{vi.email.body}</p>
      <input
        type="email"
        inputMode="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder={vi.email.placeholder}
        className="rounded-2xl border-2 border-border-brand bg-white px-5 py-4 text-lg outline-none focus:border-teal-brand"
      />
      {error && <p className="text-sm font-medium text-error-brand">{error}</p>}
      <PrimaryButton disabled={submitting || !email} onClick={submit}>
        {submitting ? '…' : vi.email.cta}
      </PrimaryButton>
    </main>
  );
}
```

- [ ] **Step 6: Verify build + tests**

Run: `npm run build && npm test`
Expected: pass.

- [ ] **Step 7: Commit**

```bash
git add src/app/email src/lib/quiz/email.ts src/lib/quiz/email.test.ts
git commit -m "feat: email capture page creating web-funnel lead"
```

---

## Task 16: Paywall + RevenueCat Web Billing checkout

**Files:**
- Create: `src/lib/billing/revenuecat.ts`
- Create: `src/app/paywall/page.tsx`

RevenueCat's `purchase()` renders its own hosted checkout UI (Stripe under the hood) and resolves when payment completes. Verify method names against the installed `@revenuecat/purchases-js` version's docs if the SDK has moved (current major: `Purchases.configure`, `getOfferings`, `purchase({ rcPackage })`).

- [ ] **Step 1: Create `src/lib/billing/revenuecat.ts`**

```ts
import { Purchases, type Package } from '@revenuecat/purchases-js';

let instance: Purchases | null = null;

/** Configure RC Web Billing with the backend-issued web_user_id so the
 * purchase attaches to the lead (webhook flags it paid; app claims it via RC logIn). */
export function configureBilling(webUserId: string): Purchases {
  const key = process.env.NEXT_PUBLIC_RC_WEB_BILLING_KEY;
  if (!key) throw new Error('NEXT_PUBLIC_RC_WEB_BILLING_KEY is not set');
  if (!instance) {
    instance = Purchases.configure(key, webUserId);
  }
  return instance;
}

export async function getPackages(webUserId: string): Promise<Package[]> {
  const purchases = configureBilling(webUserId);
  const offerings = await purchases.getOfferings();
  return offerings.current?.availablePackages ?? [];
}

/** Runs RC's hosted checkout. Resolves true if any entitlement is active afterwards. */
export async function purchasePackage(
  webUserId: string,
  pkg: Package,
  email: string,
): Promise<boolean> {
  const purchases = configureBilling(webUserId);
  const { customerInfo } = await purchases.purchase({ rcPackage: pkg, customerEmail: email });
  return Object.keys(customerInfo.entitlements.active).length > 0;
}
```

- [ ] **Step 2: Create `src/app/paywall/page.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Package } from '@revenuecat/purchases-js';
import { PrimaryButton } from '@/components/primary-button';
import { useQuizStore, useHydrated } from '@/lib/quiz/store';
import { getPackages, purchasePackage } from '@/lib/billing/revenuecat';
import { trackStepViewed, trackEvent } from '@/lib/analytics/track';
import { vi } from '@/lib/copy/vi';

export default function PaywallPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const lead = useQuizStore((s) => s.lead);
  const setPurchased = useQuizStore((s) => s.setPurchased);
  const [packages, setPackages] = useState<Package[] | null>(null);
  const [selected, setSelected] = useState<Package | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => trackStepViewed('paywall'), []);

  useEffect(() => {
    if (!hydrated) return;
    if (!lead) {
      router.replace('/email'); // must have a lead (web_user_id) before checkout
      return;
    }
    getPackages(lead.web_user_id)
      .then((pkgs) => {
        setPackages(pkgs);
        setSelected(pkgs[0] ?? null);
      })
      .catch(() => setError(vi.paywall.error));
  }, [hydrated, lead, router]);

  if (!hydrated || !lead) return null;

  const buy = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const entitled = await purchasePackage(lead.web_user_id, selected, lead.email);
      if (entitled) {
        setPurchased(true);
        trackEvent('checkout_completed_client', {}); // authoritative purchase event is server-side (RC webhook)
        router.push('/success');
      } else {
        setError(vi.paywall.paymentError);
      }
    } catch {
      setError(vi.paywall.paymentError); // user closed checkout or payment failed — retry UI
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-5 px-5 py-8">
      <h1 className="text-3xl font-extrabold text-forest">{vi.paywall.headline}</h1>
      <ul className="flex flex-col gap-2">
        {vi.paywall.bullets.map((b) => (
          <li key={b} className="flex items-center gap-2 text-slate-brand">
            <span className="text-success-brand">✓</span> {b}
          </li>
        ))}
      </ul>

      {!packages && !error && <p className="text-muted-brand">{vi.paywall.loading}</p>}

      {packages && (
        <div className="flex flex-col gap-3">
          {packages.map((pkg) => (
            <button
              key={pkg.identifier}
              type="button"
              onClick={() => setSelected(pkg)}
              aria-pressed={selected?.identifier === pkg.identifier}
              className={`flex items-center justify-between rounded-2xl border-2 px-5 py-4 text-left transition
                ${selected?.identifier === pkg.identifier ? 'border-teal-brand bg-mist' : 'border-border-brand bg-white'}`}
            >
              <span className="font-semibold text-forest">
                {pkg.webBillingProduct.title}
              </span>
              <span className="font-bold text-forest">
                {pkg.webBillingProduct.currentPrice.formattedPrice}
              </span>
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm font-medium text-error-brand" role="alert">
          {error}
        </p>
      )}

      <PrimaryButton disabled={!selected || busy} onClick={buy}>
        {busy ? '…' : vi.paywall.cta}
      </PrimaryButton>
    </main>
  );
}
```

- [ ] **Step 3: Verify build; smoke-test with sandbox key if available**

Run: `npm run build`
Expected: passes. With a real `NEXT_PUBLIC_RC_WEB_BILLING_KEY` (sandbox) in `.env.local` and a lead created, `/paywall` lists packages; RC sandbox checkout opens on CTA. Without a key, `/paywall` shows the load-error state — acceptable.

If `pkg.webBillingProduct` doesn't exist on the installed SDK version, check `node_modules/@revenuecat/purchases-js/dist/index.d.ts` for the product accessor on `Package` (older versions expose `rcBillingProduct`) and adjust.

- [ ] **Step 4: Commit**

```bash
git add src/lib/billing/revenuecat.ts src/app/paywall
git commit -m "feat: paywall with RevenueCat Web Billing checkout"
```

---

## Task 17: Success / download page with claim-token links + QR

**Files:**
- Create: `src/lib/handoff/links.ts`
- Test: `src/lib/handoff/links.test.ts`
- Create: `src/app/success/page.tsx`

- [ ] **Step 1: Write failing test `src/lib/handoff/links.test.ts`**

```ts
import { describe, it, expect, beforeEach, afterEach, vi as vitest } from 'vitest';
import { buildDownloadLink } from './links';

beforeEach(() => {
  vitest.stubEnv('NEXT_PUBLIC_AIRBRIDGE_TRACKING_LINK', 'https://abr.ge/abc123');
});
afterEach(() => vitest.unstubAllEnvs());

describe('buildDownloadLink', () => {
  it('appends claim token as deep-link param on the Airbridge tracking link', () => {
    const url = new URL(buildDownloadLink('ct_42'));
    expect(url.origin + url.pathname).toBe('https://abr.ge/abc123');
    expect(url.searchParams.get('deeplink_url')).toBe('nutree://claim?token=ct_42');
  });

  it('preserves existing query params on the tracking link', () => {
    vitest.stubEnv('NEXT_PUBLIC_AIRBRIDGE_TRACKING_LINK', 'https://abr.ge/abc123?campaign=web_funnel');
    const url = new URL(buildDownloadLink('ct_42'));
    expect(url.searchParams.get('campaign')).toBe('web_funnel');
    expect(url.searchParams.get('deeplink_url')).toBe('nutree://claim?token=ct_42');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- links`
Expected: FAIL — cannot resolve `./links`.

- [ ] **Step 3: Create `src/lib/handoff/links.ts`**

```ts
/**
 * Airbridge tracking link (created in the Airbridge dashboard, set via env)
 * + claim token as the deferred deep link. The app's Airbridge SDK surfaces
 * nutree://claim?token=… on first launch; the app then calls the claim endpoint.
 * The scheme/path must match the handler registered in nutree_ai.
 */
export function buildDownloadLink(claimToken: string): string {
  const base = process.env.NEXT_PUBLIC_AIRBRIDGE_TRACKING_LINK;
  if (!base) throw new Error('NEXT_PUBLIC_AIRBRIDGE_TRACKING_LINK is not set');
  const url = new URL(base);
  url.searchParams.set('deeplink_url', `nutree://claim?token=${claimToken}`);
  return url.toString();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- links`
Expected: 2 tests PASS.

- [ ] **Step 5: Create `src/app/success/page.tsx`**

```tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { useQuizStore, useHydrated } from '@/lib/quiz/store';
import { buildDownloadLink } from '@/lib/handoff/links';
import { trackStepViewed } from '@/lib/analytics/track';
import { vi } from '@/lib/copy/vi';

export default function SuccessPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const lead = useQuizStore((s) => s.lead);
  const purchased = useQuizStore((s) => s.purchased);

  useEffect(() => trackStepViewed('success'), []);
  useEffect(() => {
    if (hydrated && (!lead || !purchased)) router.replace(lead ? '/paywall' : '/email');
  }, [hydrated, lead, purchased, router]);

  if (!hydrated || !lead || !purchased) return null;

  const link = buildDownloadLink(lead.claim_token);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col items-center justify-center gap-6 px-5 py-8 text-center">
      <h1 className="text-3xl font-extrabold text-forest">{vi.success.headline}</h1>
      <p className="text-slate-brand">{vi.success.body}</p>

      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <QRCodeSVG value={link} size={192} fgColor="#1a4739" />
        <p className="mt-3 text-sm text-muted-brand">{vi.success.qrHint}</p>
      </div>

      <div className="flex w-full flex-col gap-3">
        <a
          href={link}
          className="rounded-2xl bg-forest-dark px-6 py-4 text-lg font-semibold text-white"
        >
           {vi.success.appStore}
        </a>
        <a
          href={link}
          className="rounded-2xl bg-forest-dark px-6 py-4 text-lg font-semibold text-white"
        >
          ▶ {vi.success.playStore}
        </a>
      </div>

      <p className="text-sm text-muted-brand">{vi.success.emailHint}</p>
    </main>
  );
}
```

(Both badges use the Airbridge link — it routes to the correct store per device and carries attribution + the claim token. The raw store URLs env vars remain available for the landing page footer if wanted.)

- [ ] **Step 6: Verify build + tests**

Run: `npm run build && npm test`
Expected: pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/handoff src/app/success
git commit -m "feat: success page with QR + Airbridge claim-token download links"
```

---

## Task 18: Landing page

**Files:**
- Modify: `src/app/page.tsx` (replace scaffold content)

- [ ] **Step 1: Replace `src/app/page.tsx`**

```tsx
'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { trackStepViewed } from '@/lib/analytics/track';
import { vi } from '@/lib/copy/vi';

export default function LandingPage() {
  useEffect(() => trackStepViewed('landing'), []);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-8 px-5 py-10">
      <div className="text-2xl font-extrabold text-wordmark">Nutree</div>
      <h1 className="text-4xl font-extrabold leading-tight text-forest">{vi.landing.headline}</h1>
      <p className="text-lg text-slate-brand">{vi.landing.subheadline}</p>
      <ul className="flex flex-col gap-3">
        {vi.landing.bullets.map((b) => (
          <li key={b} className="flex items-center gap-3 text-charcoal">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-mist text-sm text-emerald-brand">
              ✓
            </span>
            {b}
          </li>
        ))}
      </ul>
      <Link
        href="/quiz/name_ask"
        className="rounded-2xl bg-teal-brand px-6 py-4 text-center text-lg font-semibold text-white transition hover:bg-emerald-brand"
      >
        {vi.landing.cta}
      </Link>
    </main>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: passes; `/` shows hero + CTA linking into the quiz.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: landing page"
```

---

## Task 19: Pixels + Airbridge web SDK wiring

**Files:**
- Create: `src/components/analytics-scripts.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Create `src/components/analytics-scripts.tsx`** — each script renders only when its env id is set, so dev/E2E run clean

```tsx
'use client';

import Script from 'next/script';

const GA4 = process.env.NEXT_PUBLIC_GA4_ID;
const META = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const TIKTOK = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;
const AB_APP = process.env.NEXT_PUBLIC_AIRBRIDGE_APP_NAME;
const AB_TOKEN = process.env.NEXT_PUBLIC_AIRBRIDGE_WEB_TOKEN;

export function AnalyticsScripts() {
  return (
    <>
      {GA4 && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA4}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              gtag('config', '${GA4}');`}
          </Script>
        </>
      )}
      {META && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
            n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
            document,'script','https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${META}'); fbq('track', 'PageView');`}
        </Script>
      )}
      {TIKTOK && (
        <Script id="tiktok-pixel" strategy="afterInteractive">
          {`!function (w, d, t) {
            w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
            ttq.load('${TIKTOK}'); ttq.page();
          }(window, document, 'ttq');`}
        </Script>
      )}
      {AB_APP && AB_TOKEN && (
        <Script id="airbridge" strategy="afterInteractive">
          {`(function(a_,i_,r_,_b,_r,_i,_d,_g,_e){if(!a_[_b]){var n=function(){var c=i_.createElement(r_);c.onerror=function(){h.queue.filter(function(t){return 0<=_d.indexOf(t[0])}).forEach(function(t){t=t[1];t=t[t.length-1];"function"==typeof t&&t("error occur when load airbridge")})};c.async=1;c.src=_r;"complete"===i_.readyState?i_.head.appendChild(c):a_.addEventListener("load",function t(){a_.removeEventListener("load",t);i_.head.appendChild(c)})},h={queue:[],get isSDKEnabled(){return!1}};_i.concat(_d).forEach(function(t){var e=t.split("."),c=e.pop();e.reduce(function(t,e){return t[e]=t[e]||{}},h)[c]=function(){h.queue.push([t,arguments])}});a_[_b]=h;0<_g?(_e=setInterval(function(){0<--_g?a_[_b].isSDKEnabled&&(clearInterval(_e),n()):(clearInterval(_e),n())},1e3)):n()}})(window,document,"script","airbridge","https://static.airbridge.io/sdk/latest/airbridge.min.js",["init","startTracking","fetchResource","setBanner","setDownload","setDownloads","setDeeplinks","sendWeb","setUserAgent","setMobileAppData","setUserId","setUserEmail","setUserPhone","setUserAttributes","clearUser","setDeviceIFV","setDeviceIFA","setDeviceGAID","events.send","events.signIn","events.signUp","events.signOut","events.purchased","events.addedToCart","events.productDetailsViewReceived","events.homeViewed","events.productListViewed","events.searchResultViewed"],[],0);
          airbridge.init({ app: '${AB_APP}', webToken: '${AB_TOKEN}' });`}
        </Script>
      )}
    </>
  );
}
```

- [ ] **Step 2: Wire into `src/app/layout.tsx`** — add import and render inside `<body>` before `{children}`:

```tsx
import { AnalyticsScripts } from '@/components/analytics-scripts';
// … in the body:
      <body className={`${beVietnam.variable} font-sans antialiased`}>
        <AnalyticsScripts />
        {children}
      </body>
```

- [ ] **Step 3: Verify**

Run: `npm run build`
Expected: passes. In dev with no analytics env vars set, pages render with zero third-party scripts (check the network tab).

- [ ] **Step 4: Commit**

```bash
git add src/components/analytics-scripts.tsx src/app/layout.tsx
git commit -m "feat: GA4/Meta/TikTok pixels and Airbridge web SDK (env-gated)"
```

---

## Task 20: Playwright E2E — full funnel with mocked backend

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/funnel.spec.ts`

- [ ] **Step 1: Create `playwright.config.ts`**

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://localhost:3100' },
  webServer: {
    command: 'npm run dev -- --port 3100',
    url: 'http://localhost:3100',
    reuseExistingServer: !process.env.CI,
    env: {
      // Real host not needed — E2E intercepts these routes.
      NEXT_PUBLIC_API_BASE_URL: 'https://api.e2e.test',
    },
  },
});
```

- [ ] **Step 2: Install browsers**

```bash
npx playwright install chromium
```

- [ ] **Step 3: Create `e2e/funnel.spec.ts`**

```ts
import { test, expect, type Page } from '@playwright/test';

async function mockBackend(page: Page) {
  await page.route('https://api.e2e.test/v1/tdee/preview', (route) =>
    route.fulfill({
      json: {
        bmr: 1698.75,
        tdee: 2038.5,
        goal: 'cut',
        macros: { calories: 1538.5, protein: 165, carbs: 84.6, fat: 60 },
      },
    }),
  );
  await page.route('https://api.e2e.test/v1/web-funnel/leads', (route) =>
    route.fulfill({ json: { web_user_id: 'w_e2e', claim_token: 'ct_e2e' } }),
  );
}

test('full funnel: landing → quiz → results → email capture → paywall', async ({ page }) => {
  await mockBackend(page);

  // Landing
  await page.goto('/');
  await page.getByRole('link', { name: 'Bắt đầu ngay' }).click();

  // Section 1
  await page.getByPlaceholder('Nhập tên của bạn').fill('Anh');
  await page.getByRole('button', { name: 'Tiếp tục' }).click();
  await page.getByRole('button', { name: 'Giảm cân' }).click();
  await page.getByRole('spinbutton').fill('70');
  await page.getByRole('button', { name: 'Tiếp tục' }).click();
  await page.getByRole('button', { name: 'Không có thời gian' }).click();
  await page.getByRole('button', { name: 'Tiếp tục' }).click();
  await page.getByRole('button', { name: 'TikTok' }).click();
  await page.getByRole('button', { name: 'Tiếp tục' }).click();
  await page.getByRole('button', { name: 'Vài tháng' }).click();
  await expect(page.getByText('Anh, mục tiêu')).toBeVisible(); // reflection
  await page.getByRole('button', { name: 'Tiếp tục' }).click();

  // Section 2
  await page.getByRole('button', { name: 'Nam' }).click();
  await page.getByRole('spinbutton').fill('30');
  await page.getByRole('button', { name: 'Tiếp tục' }).click();
  await page.getByRole('spinbutton').first().fill('175');
  await page.getByRole('spinbutton').nth(1).fill('75');
  await page.getByRole('button', { name: 'Tiếp tục' }).click();
  await page.getByRole('button', { name: 'Bỏ qua' }).click(); // body fat optional

  // Section 3
  await page.getByRole('button', { name: '4', exact: true }).click();
  await page.getByRole('button', { name: '~60 phút' }).click();
  await page.getByRole('button', { name: 'Trung cấp (1–3 năm)' }).click();
  await page.getByRole('button', { name: 'Tập tạ' }).click();
  await page.getByRole('button', { name: 'Tiếp tục' }).click();

  // Section 4
  await page.getByRole('button', { name: 'Văn phòng / ngồi nhiều' }).click();
  await page.getByRole('button', { name: 'Không có yêu cầu' }).click();
  await page.getByRole('button', { name: 'Tiếp tục' }).click();

  // Promos
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Tiếp tục' }).click();
  }

  // Calculating → results (animation ≈ 4s)
  await expect(page).toHaveURL(/tdee_targets/, { timeout: 15_000 });
  await expect(page.getByText('1539')).toBeVisible(); // rounded calories
  await expect(page.getByText('165g')).toBeVisible();
  await page.getByRole('button', { name: 'Tiếp tục' }).click();

  // Result promising → email
  await page.getByRole('button', { name: 'Nhận kế hoạch của tôi' }).click();
  await expect(page).toHaveURL(/\/email/);
  await page.getByPlaceholder('email@vidu.com').fill('anh@example.vn');
  await page.getByRole('button', { name: 'Lưu kế hoạch của tôi' }).click();

  // Paywall reached with lead stored (RC key absent → load-error state is expected)
  await expect(page).toHaveURL(/\/paywall/);
  const stored = await page.evaluate(() => localStorage.getItem('nutree_funnel_v1'));
  expect(JSON.parse(stored!).state.lead.claim_token).toBe('ct_e2e');
});

test('mid-quiz resume from localStorage', async ({ page }) => {
  await mockBackend(page);
  await page.goto('/quiz/goal');
  await page.getByRole('button', { name: 'Tăng cơ' }).click();
  await page.reload();
  // Re-visit the answered step: selection survives reload
  await page.goto('/quiz/goal');
  await expect(page.getByRole('button', { name: 'Tăng cơ' })).toHaveAttribute('aria-pressed', 'true');
});

test('unknown quiz step 404s', async ({ page }) => {
  const res = await page.goto('/quiz/not_a_step');
  expect(res!.status()).toBe(404);
});
```

- [ ] **Step 4: Run E2E**

Run: `npm run test:e2e`
Expected: 3 tests PASS. If selectors drift from the implemented markup, fix the spec (or the markup's accessible names) — accessible names above match the copy module exactly.

- [ ] **Step 5: Commit**

```bash
git add playwright.config.ts e2e
git commit -m "test: Playwright E2E for full funnel, resume, and 404"
```

---

## Task 21: Full verification pass

- [ ] **Step 1: Run everything**

```bash
npm run lint && npx tsc --noEmit && npm test && npm run build && npm run test:e2e
```

Expected: all green. Fix anything that isn't before proceeding.

- [ ] **Step 2: Manual smoke of the fallback path**

Set `NEXT_PUBLIC_API_BASE_URL=https://nonexistent.invalid` in `.env.local`, `npm run dev`, complete the quiz.
Expected: calculating screen still lands on TDEE results (fallback calculator), values match the unit-test expectations for your inputs.

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: verification pass fixes"
```

(Skip the commit if nothing changed.)

---

## Task 22: README + deploy documentation

**Files:**
- Modify: `README.md` (replace create-next-app boilerplate)

- [ ] **Step 1: Replace `README.md`**

````markdown
# Nutree Web Funnel

Web onboarding funnel (start.nutree.ai): quiz → TDEE results → email capture →
RevenueCat Web Billing checkout → app download handoff via Airbridge claim token.

Design spec: `docs/superpowers/specs/2026-07-07-web-to-app-funnel-design.md`

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · zustand · @revenuecat/purchases-js ·
Vitest · Playwright. Vietnamese-only copy lives in `src/lib/copy/vi.ts`.

## Development

```bash
npm install
cp .env.example .env.local   # fill in values
npm run dev                  # http://localhost:3000
npm test                     # unit tests (vitest)
npm run test:e2e             # Playwright (mocked backend)
```

## Environment variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Nutree backend base URL (no trailing slash) |
| `NEXT_PUBLIC_RC_WEB_BILLING_KEY` | RevenueCat Web Billing public API key (`rcb_…`) |
| `NEXT_PUBLIC_GA4_ID` | GA4 measurement id (optional; script omitted if unset) |
| `NEXT_PUBLIC_META_PIXEL_ID` | Meta Pixel id (optional) |
| `NEXT_PUBLIC_TIKTOK_PIXEL_ID` | TikTok Pixel id (optional) |
| `NEXT_PUBLIC_AIRBRIDGE_APP_NAME` | Airbridge app name (optional) |
| `NEXT_PUBLIC_AIRBRIDGE_WEB_TOKEN` | Airbridge web SDK token (optional) |
| `NEXT_PUBLIC_AIRBRIDGE_TRACKING_LINK` | Airbridge tracking link for the success page |
| `NEXT_PUBLIC_APPSTORE_URL` / `NEXT_PUBLIC_PLAYSTORE_URL` | Raw store URLs |

## Deploy (Vercel)

Import the repo in Vercel, set the env vars above for Production/Preview, and point
`start.nutree.ai` at the project. No special build settings (defaults work).

## External dependencies

- **Backend** (separate team): `POST /v1/tdee/preview` (exists),
  `POST /v1/web-funnel/leads` + `POST /v1/web-funnel/claim` + RC webhook (per design spec).
- **Mobile** (`nutree_ai`): deferred deep link handler + claim service — separate plan in that repo.
- **RevenueCat**: Web Billing app configured, offering with web packages.
- **Airbridge**: tracking link created in dashboard (goes in
  `NEXT_PUBLIC_AIRBRIDGE_TRACKING_LINK`).
````

- [ ] **Step 2: Create `.env.example`** with every variable from the table (empty values).

```bash
NEXT_PUBLIC_API_BASE_URL=
NEXT_PUBLIC_RC_WEB_BILLING_KEY=
NEXT_PUBLIC_GA4_ID=
NEXT_PUBLIC_META_PIXEL_ID=
NEXT_PUBLIC_TIKTOK_PIXEL_ID=
NEXT_PUBLIC_AIRBRIDGE_APP_NAME=
NEXT_PUBLIC_AIRBRIDGE_WEB_TOKEN=
NEXT_PUBLIC_AIRBRIDGE_TRACKING_LINK=
NEXT_PUBLIC_APPSTORE_URL=
NEXT_PUBLIC_PLAYSTORE_URL=
```

- [ ] **Step 3: Commit**

```bash
git add README.md .env.example
git commit -m "docs: README with env vars, deploy, and external dependencies"
```

---

## Follow-ups outside this plan

1. **`nutree_ai` mobile plan** (separate repo): Airbridge deferred deep link handler for `nutree://claim?token=…`, claim service (fetch payload → hydrate `OnboardingData` → `saveProfile` → RC `logIn`), route past onboarding. Includes the token-invalid fallback (normal onboarding + restore purchases).
2. **Backend team**: implement `POST /v1/web-funnel/leads`, `POST /v1/web-funnel/claim`, RC Web Billing webhook → mark lead paid + send confirmation email (universal link with claim token), abandoned-cart email. Contract in the design spec.
3. **RevenueCat sandbox E2E**: once a sandbox Web Billing key exists, add a manual test doc / optional Playwright spec for the checkout leg (Stripe test cards).
4. **Airbridge dashboard**: create the web-funnel tracking link and set `NEXT_PUBLIC_AIRBRIDGE_TRACKING_LINK`.
