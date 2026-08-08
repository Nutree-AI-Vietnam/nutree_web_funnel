---
title: "Web Funnel Onboarding Redesign"
description: "Redesign the quiz-to-email funnel with carousel proof, science/safety framing, a longer calculation sequence, and a Flutter-informed progress transition while preserving checkout contracts."
status: pending
priority: P1
effort: 5d
branch: "delivery"
tags: [frontend, onboarding, funnel, ux, accessibility]
blockedBy: [260807-1652-onboarding-v2-age-split]
blocks: []
created: "2026-08-08"
createdBy: "ck:plan"
source: skill
---

# Web Funnel Onboarding Redesign

## Overview

Verified current flow: `goal -> ... -> result -> /email` in `src/lib/quiz/steps.ts:2-26`,
`src/app/quiz/[step]/page.tsx:18-25`, and `src/components/steps/registry.tsx:26-166`.
Current gaps vs request: no swipeable credibility surface, no medical-care modal,
no Flutter-style progress transition, the calculating screen is a single 4.8s
panel (`src/components/steps/calculating.tsx:14-20`, `49-79`), and email capture
is still a one-card form (`src/app/email/page.tsx:55-105`).

Scope lock:
- Preserve lead creation, safe lead projection, `/welcome-gift`, `/paywall`, and
  RevenueCat/BFF contracts (`src/lib/api/client.ts:63-112`, `src/app/email/page.tsx:39-41`).
- Keep existing quiz slugs stable; allow at most one additive route if the heart
  reassurance screen cannot fit inside `preview`.
- Treat allergy/medical-care handling as UI-only in v1. Do not add new backend
  payload fields unless product explicitly expands the contract. This follows
  `docs/superpowers/specs/2026-07-22-web-funnel-final-product-spec.md:150-152`
  and `docs/superpowers/specs/2026-07-22-web-funnel-final-product-spec.md:375-381`.

Target order:
`goal -> name_ask -> welcome(credibility carousel) -> challenges -> duration ->
motivation -> reflection -> sex -> age -> height -> weight ->
target_weight(current-weight anchor) -> body_review -> science(evidence) ->
activity_level -> training_days -> training_duration -> eating_pattern ->
diet(modal intercept) -> support_style -> preview(Flutter-style progress) ->
reassurance(new only if needed) -> calculating(10s sequence) -> result -> /email
-> /welcome-gift -> /paywall`

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Flow Freeze](./phase-01-flow-freeze.md) | Pending |
| 2 | [Quiz Storytelling And Safety](./phase-02-quiz-storytelling-and-safety.md) | Pending |
| 3 | [TDEE And Result Sequence](./phase-03-tdee-and-result-sequence.md) | Pending |
| 4 | [Email And Conversion Handoff](./phase-04-email-and-conversion-handoff.md) | Pending |
| 5 | [Validation And Rollout](./phase-05-validation-and-rollout.md) | Pending |

## Dependencies

- Blocker: `plans/260807-1652-onboarding-v2-age-split/plan.md` owns the pending
  `age`/DOB contract and overlaps `src/lib/quiz/steps.ts`, `src/components/steps/registry.tsx`,
  `src/lib/quiz/types.ts`, and `src/lib/api/client.ts`.
- Not a blocker: active email-link/RevenueCat plans stay compatible if this cut
  keeps `/email` route ownership and `createLead()` semantics unchanged.
- External reference only: Nutree Flutter calculation/progress patterns come from
  `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/features/onboarding/presentation/screens/calculating_screen.dart:16-18`,
  `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/features/onboarding/presentation/screens/calculating_screen.dart:42-86`,
  `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/features/onboarding/presentation/screens/calculating_screen.dart:124-127`,
  `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/features/onboarding/presentation/screens/calculating_screen.dart:153-225`,
  `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/features/onboarding/presentation/screens/transition_screen.dart:18-20`,
  `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/features/onboarding/presentation/screens/transition_screen.dart:35-49`,
  `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/features/onboarding/presentation/screens/transition_screen.dart:227-249`, and
  `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/features/onboarding/presentation/widgets/onboarding_progress_bar.dart:4-40`.

## Validation Gates

- Commands: `npm run lint`, `npm test`, `npm run build`
- Manual: 375px + 430px mobile widths, keyboard-only navigation, reduced motion,
  swipe + button carousel controls, focus-trapped medical modal, `/quiz/*` back
  flow, `/email -> /welcome-gift -> /paywall` continuity
- No Playwright/e2e for this repo; rely on unit/build/manual evidence only

## Open Questions

- The supplied screenshots are not in the workspace, so exact hierarchy/copy
  mapping for the credibility carousel and email layout stays provisional until
  those assets are rechecked during implementation.
