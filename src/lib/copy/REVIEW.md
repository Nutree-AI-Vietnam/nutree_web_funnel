# Copy layer: i18n architecture + bilingual marketing review

## 1. Architecture — adding a language is one step

The copy layer lives in `src/lib/copy/`:

| File | Role |
| --- | --- |
| `vi.ts` | Source-of-truth **shape** + Vietnamese copy (`as const`). |
| `en.ts` | English copy, typed as `Copy` so the compiler forces completeness. |
| `index.ts` | `Copy` type (derived from `typeof vi` via a `Widen` helper), `locales` registry, `Locale` type, `DEFAULT_LOCALE`, `LOCALE_ORDER`, `LOCALE_LABELS`, `LOCALE_NAMES`, `copyFor()`, `isLocale()`. |
| `use-copy.ts` | Client hooks: `useCopy()`, `useLocale()`, `useSetLocale()`. |

**To add a locale (e.g. `fr`):**

1. `cp vi.ts fr.ts`, translate the values, change the export to `export const fr: Copy = { ... }`.
2. In `index.ts`, `import { fr } from './fr'` and add `fr` to the `locales` map (+ a `LOCALE_LABELS` / `LOCALE_NAMES` entry).

That's it. `Locale`, the switcher, persistence and every `useCopy()` call pick it up automatically, and `tsc` fails if any key is missing.

### Why `Copy = Widen<typeof vi>`
`vi` is `as const`, so `typeof vi` is a tree of **literal** types (`'Tiếp tục'`). A translation can't reuse those literals, so `Widen` recursively widens literals to their base types while preserving object structure, function signatures, and `readonly` arrays. Result: `en` is checked for **completeness and correct types** (including the functions like `metric.rangeError(...)`, `tdee_targets.projectionWeeks(n)`, `paywall.perDayNote(x)`) with **no `any`**.

### Accessor + persistence
- Locale is a field on the existing zustand store (`src/lib/quiz/store.ts`), persisted to `localStorage` with the rest of the funnel state, and **kept across `reset()`** (language is a UI preference, not quiz data).
- `useLocale()` returns `DEFAULT_LOCALE` until the store has rehydrated, so SSR and first client render agree (no hydration mismatch); it then flips to the persisted choice.
- The switcher (`LanguageToggle` in `src/app/page.tsx`) is a segmented VI/EN control: `role="group"`, per-button `aria-pressed` + `aria-label` (full language name), 44px touch targets (`min-h-11 min-w-11`), `focus-visible` ring, on-brand forest gradient for the active state.

## 2. Backward compatibility
`import { vi } from '@/lib/copy/vi'` still works, so components not yet migrated keep rendering Vietnamese. Migrated components switched their import to `useCopy()` (keeping the local variable name `vi` where possible for a minimal diff), which makes them re-render live when the locale changes.

## 3. Marketing-psychology + copywriting principles applied (both languages)

Applied symmetrically to `vi` and `en`.

**Landing (`landing.*`)**
- **Headline** — JTBD + specificity + Contrast: "Your body, your goal, your plan" / "Kế hoạch ăn uống riêng cho cơ thể và mục tiêu của bạn". Subheadline adds a contrast frame ("not a generic number" / "không phải con số chung chung") and a concrete time cost ("about 3 minutes").
- **CTA** — action + outcome + ownership: "Build my plan" / "Xây kế hoạch của tôi" (was the generic "Get started" / "Bắt đầu").
- **Zero-price effect / Reciprocity** — proof stat "Free / 0đ to see your first result" keeps the first result free.
- **Goal-gradient / Activation energy** — "3 min" framing lowers the perceived effort to start.

**Quiz microcopy** — Clarity over cleverness, customer language, low friction: "Not sure what to eat", "Can't stick to a diet", "Stop guessing" / "Không muốn đoán mò nữa". Hints cap choices ("Pick up to 2") to fight the **Paradox of Choice / Hick's Law**.

**Reflection line** — left to the in-flight agent (see follow-ups); EN mirror is a single, confident sentence ("your goal is clear — and genuinely doable with the right plan").

**Result step (`result_promising.*`)** — **Contrast effect** (With Nutree vs. On your own) and **Peak-End**: a vivid "daily loop" payoff before the ask.

**Paywall (`paywall.*`)** — the persuasion-heavy surface:
- **Anchoring** — annual plan is listed **first** and marked "Best value" / "Đáng giá nhất"; the large `total` anchors before the smaller per-month number.
- **Good-better-best / Price relativity** — 3 tiers (annual / quarterly / monthly) with the annual pre-selected (**Default effect**).
- **Mental accounting** — new `perDayNote`: "That's about X đ a day" / "Chỉ khoảng Xđ mỗi ngày", computed from the selected plan's per-month price.
- **Loss aversion / Endowment** — headline "Unlock the plan **you just built**" leverages ownership of the plan they invested effort into (**IKEA effect** from completing the quiz).
- **Regret aversion / Risk reversal** — fine print now ends with "Cancel anytime" / "Huỷ bất cứ lúc nào".
- **Social proof (honest)** — a non-fabricated line ("Join others building a plan they actually stick to"). **Deliberately no invented user counts or stats** — per the copywriting rule "honest over sensational".

**Email step** — **Commitment & consistency / Foot-in-the-door**: "Save my plan and continue"; expectation-setting ("no free trial") stated up front to avoid a jarring surprise at the paywall.

## 4. Known follow-ups (intentionally not touched)
These files were being edited by another agent, so they keep the static `vi` import and remain Vietnamese even in EN mode. Migrating them to `useCopy()` is a mechanical follow-up (swap the import + add `const vi = useCopy()`), plus extracting a few hardcoded strings:
- `quiz-shell.tsx` (back/progress aria labels)
- `reflection.tsx` (reflection headline + chip captions + subline)
- `single-choice.tsx` (prop-driven — already EN via the localized registry; no copy of its own)
- `number-input-step.tsx` (field labels, error, continue/skip)
- `final-web-steps.tsx` (`target_weight`, `body_review`, `body_basics`, `body_metrics`, `routine` screens)
- `metric-input.tsx` / `metric-wheel-picker.tsx`

Also minor: `src/app/momo/return/page.tsx` still shows a literal "MoMo" brand chip (not a copy-object string); the payment status *copy* was made provider-agnostic in both languages.

## 5. Verification
- `npx tsc --noEmit` → clean (proves `en` matches the `vi` shape, functions included).
- `/`, `/email`, `/paywall`, `/success`, `/quiz` → HTTP 200 on the running dev server.
- Landing SSR renders the default (VI) copy and the accessible VI/EN toggle (`aria-pressed`, full-name `aria-label`); switching is client-side via the persisted store and `useCopy()`.
