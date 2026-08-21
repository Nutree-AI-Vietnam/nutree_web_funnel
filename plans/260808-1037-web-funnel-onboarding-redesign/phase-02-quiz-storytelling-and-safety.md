---
phase: 2
title: "Quiz Storytelling And Safety"
status: pending
priority: P1
effort: "1.5d"
dependencies: [1]
---

# Phase 2: Quiz Storytelling And Safety

## Overview

Upgrade the quiz-side persuasion surfaces without changing the lead/payment
contract. This phase owns credibility, science/evidence, dietary safety, the
target-weight visual anchor, and the Flutter-inspired progress transition.

## Requirements

- Functional: add a swipeable credibility section inspired by the supplied
  screenshots.
- Functional: add science-backed evidence/backup framing with clear
  not-medical-advice language.
- Functional: show a medical-care modal when dietary selections imply allergy or
  medical-diet caution.
- Functional: show current weight as the left anchor of the target-weight
  transition.
- Non-functional: swipe must not be the only interaction; modal must trap focus
  and restore it on close.

## Architecture

- Input: `name`, `weight_kg`, and `dietary_preferences` from
  `src/lib/quiz/types.ts:2-26` via `useQuizStore`.
- Transform: `welcome`, `science`, and `preview` stay in
  `src/components/steps/impression-steps.tsx:11-147`; `target_weight` stays in
  `src/components/steps/final-web-steps.tsx:130-175`; diet interception stays in
  `src/components/steps/multi-choice.tsx:13-69`.
- Output: only existing payload keys change; `dietary_preferences` remains the
  sole persisted dietary field (`src/lib/api/client.ts:107-109`).

## Related Code Files

- Modify: `src/components/steps/impression-steps.tsx`,
  `src/components/steps/final-web-steps.tsx`,
  `src/components/steps/multi-choice.tsx`,
  `src/components/steps/quiz-step-frame.tsx`,
  `src/lib/copy/en.ts`,
  `src/lib/copy/vi.ts`
- Optional extract only if needed for file-size control: a small modal helper or
  carousel child component under `src/components/steps/`

## Implementation Steps

1. Rebuild `WelcomeStep` into a credibility section with swipeable cards,
   explicit previous/next controls, pagination dots, and one dominant CTA. Use
   Mobbin-informed patterns: short proof cards, visible paging, and tight social
   proof instead of long paragraphs.
2. Expand `ScienceStep` to add a compact evidence/backup block plus a
   not-medical-advice note. Mirror the intent of Flutter’s
   `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/core/widgets/medical_methodology_notice.dart:16-18`
   and `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/core/widgets/medical_methodology_notice.dart:42-117`
   without pulling browser users into external auth.
3. Update `TargetWeightStep` to visually anchor current weight on the left and
   the target on the right, borrowing the information hierarchy already present
   in `src/app/paywall/paywall-page-client.tsx:225-267`.
4. Intercept diet-step continue in `MultiChoiceStep` when selected values are
   `gluten_free`, `dairy_free`, or any future allergy-tagged key. The modal
   should explain Nutree is not medical care, let the user edit choices, or
   proceed with a starter plan.
5. Replace the current `PreviewStep` summary cards with a Flutter-style progress
   transition informed by
   `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/features/onboarding/presentation/screens/transition_screen.dart:18-20`,
   `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/features/onboarding/presentation/screens/transition_screen.dart:35-49`,
   `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/features/onboarding/presentation/screens/transition_screen.dart:227-249`,
   and `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/features/onboarding/presentation/widgets/onboarding_progress_bar.dart:4-40`:
   section emphasis, progress cue, short reassurance copy, single CTA.

## Success Criteria

- [ ] Carousel works with touch, keyboard, and buttons; no swipe-only path exists.
- [ ] Science/evidence copy stays within the product spec’s non-medical boundary.
- [ ] Dietary modal triggers only on cautionary choices and does not alter the
  persisted payload shape.
- [ ] Current-weight anchor makes the target-weight moment legible before results.

## Risk Assessment

- High: medical-language drift can overpromise. Mitigation: keep copy aligned to
  `docs/superpowers/specs/2026-07-22-web-funnel-final-product-spec.md:150-152`
  and `docs/superpowers/specs/2026-07-22-web-funnel-final-product-spec.md:381`.
- Medium: carousel bloat can hurt completion. Mitigation: hard-cap card count,
  keep one proof point per card, and keep CTA always visible.
- Medium: modal friction may reduce step completion. Mitigation: trigger only on
  cautionary selections and provide a clear “edit” vs “continue” choice.
