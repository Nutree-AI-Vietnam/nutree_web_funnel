---
title: "Nutree Web Funnel Storytelling Alignment"
description: "Align the web funnel storytelling with Nutree in-app onboarding while borrowing Welmi-style conversion proof, without changing quiz contracts."
status: completed
priority: P1
branch: "main"
tags: [frontend, funnel, onboarding, ux]
created: "2026-07-21T00:45:00+07:00"
createdBy: "codex"
---

# Nutree Web Funnel Storytelling Alignment

## Scope

Keep the existing web funnel contract stable: 23 quiz steps, route slugs,
Zustand payload keys, TDEE preview, email capture, MoMo/paywall handoff, and
analytics step-view behavior. This pass changes presentation and copy only.

## Research Inputs

- Welmi reference: immediate high-intent entry, proof/data screens, strong
  personalized promise, and confidence-building transitions.
- Nutree app reference: off-white/mint mobile screens, compact cards, large
  faint section numbers, coach-like Vietnamese copy, macro/projection/review
  moments, and calm green CTAs.

## Implementation Plan

1. Make the landing feel like an app onboarding start screen with Nutree logo,
   a stronger plan promise, proof stats, and compact preview cards.
2. Keep the first CTA route as `/quiz/name_ask`; do not add a new pre-quiz
   branch or gender-first route.
3. Upgrade promo screens into app-style section transitions with large faint
   section numbers, proof chips, and small visual evidence cards.
4. Make `tdee_targets` feel like the plan-ready macro screen: celebratory
   calorie panel, macro cards, BMI, source/proof checklist, and projection.
5. Make `result_promising` bridge to email/paywall with projection, testimonial
   cards, and “what happens next” commitments.
6. Add/update copy centrally in `src/lib/copy/vi.ts`.
7. Update E2E only for intentional visible text changes; preserve the full
   funnel path.

## Success Criteria

- [x] Web funnel feels visually closer to Nutree in-app onboarding and less like a
  generic landing page.
- [x] Welmi-style proof/storytelling appears without copying Welmi visuals.
- [x] `npm run lint`, `npm test`, `npm run build`, and `CI=1 npm run test:e2e` pass.
- [x] No backend/API/store schema/env dependency changes.

## Implementation Notes

- Landing now uses app-style onboarding framing with a large `01`, proof stats,
  plan preview, and the existing `/quiz/name_ask` CTA.
- Promo screens now use app-style section transitions with large faint section
  numbers, coach copy, and proof chips.
- TDEE result now presents the plan-ready moment with macro note and source
  checklist.
- Final bridge now includes next-step commitments and lightweight testimonials
  before email capture.
- Responsive smoke screenshots are in `reports/landing-375.png`,
  `reports/landing-430.png`, `reports/promo-375.png`, and
  `reports/promo-430.png`.
