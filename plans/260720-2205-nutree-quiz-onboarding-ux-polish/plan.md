---
title: "Nutree Quiz Onboarding UX Polish"
description: "Polish the Vietnamese web quiz with Nutree branding and lower-friction, accessible metric inputs while preserving its route and TDEE contracts."
status: completed
priority: P1
branch: "main"
tags: [feature, frontend, ux, accessibility]
blockedBy: []
blocks: []
created: "2026-07-20T15:06:13.628Z"
createdBy: "ck:plan"
source: skill
---

# Nutree Quiz Onboarding UX Polish

## Overview

Deliver a coherent, mobile-first visual pass for the existing 23-step Nutree
quiz. Replace the browser-default numeric spinner pattern with direct entry,
large increment controls, and contextual quick picks; add the canonical Nutree
wordmark; and make validation, progress, selections, and motion feel deliberate.

Scope decision: hold scope. Preserve quiz order, route slugs, Zustand payload
keys, analytics events, TDEE calculation, email capture, and the MoMo work in
the separate pending plan. No backend work, new quiz questions, A/B framework,
or broad third-party UI library.

## Research Decisions

- Use the existing mobile wordmark asset at
  `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/ios/NutreeWidgets/Assets.xcassets/NutreeLogo.imageset/nutree-logo@3x.png`.
  Copy it to this app's `public/` directory as a local, optimized brand asset;
  do not recreate the mark in text or source an unverified logo online.
- Retain the established forest/teal palette and Be Vietnam Pro. The UI/UX
  review supports a calm, high-contrast wellness form instead of changing the
  product to a generic blue/orange template.
- Build one small in-repo metric-entry primitive rather than install a slider or
  component library. Native numeric semantics retain mobile numeric keyboards
  and browser range validation; explicit 44px decrement/increment buttons solve
  the tiny native spinner shown in the supplied screenshot.
- Use visible labels, helper text, blur/continue validation, inline Vietnamese
  error recovery, and `aria-describedby` / `aria-invalid` only after a field
  is invalid. These choices follow W3C/WAI form guidance and keep direct typing
  available for precision.
- Do not substitute a range-only slider: it is slower for a known exact target
  (for example, 70 kg), hides precise values, and requires substantial keyboard
  and assistive-technology behavior to be correct.

## Interaction Contract

```text
Metric question
  ├─ direct numeric input (keyboard entry; original persisted value shown)
  ├─ unit suffix (kg / cm / tuổi / %)
  ├─ large - / + buttons (bounded, field-specific step size)
  ├─ quick chips where useful (target/current weight: ± 2.5 kg, age: decade-adjacent)
  └─ Continue submits only when valid; error on blur or attempted Continue
       └─ persisted Zustand payload → existing nextRoute(step)
```

## Cross-Plan Dependencies

None. This plan is compatible with, but does not block or modify,
`plans/260713-2334-momo-hard-paywall-backend-contract`.

## Files Expected To Change

- Create: `public/nutree-logo.png`, `src/components/steps/metric-input.tsx`
- Modify: `src/components/quiz-shell.tsx`, `src/components/option-card.tsx`,
  `src/components/primary-button.tsx`, `src/components/steps/number-input-step.tsx`,
  `src/components/steps/height-weight.tsx`, `src/components/steps/training-days.tsx`,
  `src/app/page.tsx`, `src/app/globals.css`, `src/lib/copy/vi.ts`,
  `e2e/funnel.spec.ts`
- Add focused tests only where the shared control exposes pure validation or
  normalization logic; retain existing route/store unit tests.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Brand And Quiz Foundation](./phase-01-brand-and-quiz-foundation.md) | Complete |
| 2 | [Low-Friction Inputs And Choice Polish](./phase-02-low-friction-inputs-and-choice-polish.md) | Complete |
| 3 | [Accessibility And Regression Validation](./phase-03-accessibility-and-regression-validation.md) | Complete |

## Implementation Evidence

- Completed on 2026-07-20.
- Added the canonical local Nutree logo at `public/nutree-logo.png` from the
  verified mobile asset source.
- Added `MetricInput` with direct numeric entry, bounded steppers, optional
  quick adjustments, Vietnamese validation, and pure parsing/range tests.
- Preserved quiz route order, `OnboardingPayload` keys, analytics step-view
  call, TDEE preview flow, email capture, and paywall handoff.
- Verification passed: `npm run lint`, `npm test`, `npm run build`, and
  `npm run test:e2e`.
- Responsive smoke passed at 375px and 430px: no horizontal overflow, logo
  reserved at 104x40 in the quiz shell, steppers 48x48, reduced-motion animation
  duration `1e-05s`.

## Dependencies

- Next.js 16.2 App Router/client-component conventions already reviewed.
- Existing `next/image`, Tailwind 4, Zustand, Vitest, and Playwright only.
- No new npm dependency is planned.

## Completion Gates

- `npm run lint`, `npm test`, `npm run build`, and `npm run test:e2e` pass.
- Manual mobile checks at 375px and 430px: logo is crisp, no horizontal scroll,
  numeric controls remain above the keyboard, and all primary controls are at
  least 44px tall.
- Keyboard/screen-reader smoke: visible focus, logical back-to-continue order,
  labels and errors are announced, and reduced motion removes nonessential
  transitions.
