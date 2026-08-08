---
phase: 3
title: "TDEE And Result Sequence"
status: pending
priority: P1
effort: "1.5d"
dependencies: [1, 2]
---

# Phase 3: TDEE And Result Sequence

## Overview

Replace the short one-panel calculating moment with a longer, slide-driven
sequence and add the heart reassurance beat before it. This phase keeps the
actual TDEE fetch/result contract intact while changing pacing and presentation.

## Requirements

- Functional: add a short animated heart reassurance screen before calculating.
- Functional: turn `calculating` into a roughly 10-second progress sequence with
  slides tied to real TDEE readiness.
- Functional: preserve the result screen’s calories/macros/BMI contract and add
  a compact evidence/footer treatment.
- Non-functional: back navigation and failure states must remain explicit; no
  silent dead-end if API and timer finish out of sync.

## Architecture

- Input: `useQuizStore.data` feeds both the reassurance copy and
  `previewTdee(data)` (`src/components/steps/calculating.tsx:35-79`).
- Transform: the heart screen is presentation-only; the calculating sequence
  owns timer state, stage state, and fetch state; the result screen still reads
  `useQuizStore.tdee` (`src/components/steps/tdee-targets.tsx:14-46`).
- Output: only `setTdee()` writes persisted calculation output; no extra durable
  flags are required.

## Related Code Files

- Modify: `src/components/steps/calculating.tsx`,
  `src/components/steps/tdee-targets.tsx`,
  `src/components/steps/registry.tsx`,
  `src/lib/quiz/steps.ts`,
  `src/lib/quiz/steps.test.ts`,
  `src/lib/copy/en.ts`,
  `src/lib/copy/vi.ts`
- Optional create only if needed for file-size control:
  `src/components/steps/heart-reassurance-step.tsx`

## Implementation Steps

1. Add a short heart/reassurance beat immediately before calculating. Prefer an
   additive `reassurance` route only if `preview` cannot host it cleanly.
2. Rebuild `CalculatingStep` around a ~10s timeline with discrete slide/stage
   changes, checklist/progress states, and proof/testimonial pacing informed by
   Flutter’s `CalculatingScreen`
   (`/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/features/onboarding/presentation/screens/calculating_screen.dart:16-18`,
   `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/features/onboarding/presentation/screens/calculating_screen.dart:42-86`,
   `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/features/onboarding/presentation/screens/calculating_screen.dart:124-127`,
   `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/features/onboarding/presentation/screens/calculating_screen.dart:153-225`).
3. Gate forward progression on both timer completion and TDEE readiness. If the
   API fails and local fallback also fails, stay on calculating and show an
   explicit retry path.
4. Keep `TdeeTargetsStep` as the first value-delivery screen, but add a compact
   evidence/estimate footer so the science/safety story survives after the long
   loading sequence.
5. Recheck back-button behavior from `src/components/quiz-shell.tsx:45-92` so
   the new sequence cannot send users into inconsistent intermediate states.

## Success Criteria

- [ ] The sequence lasts about 10 seconds under normal motion and remains usable under reduced motion.
- [ ] TDEE fetch readiness and timer readiness are synchronized; no blank or auto-advanced state exists.
- [ ] Result screen still renders calories, macros, BMI, and existing CTA flow.
- [ ] New or reused route order is covered by `src/lib/quiz/steps.test.ts`.

## Risk Assessment

- High: long animation can feel fake if it outruns real work. Mitigation: tie
  late slides to actual fetch readiness and keep stage copy honest.
- Medium: the touched files already exceed the preferred size ceiling.
  Mitigation: extract only small child pieces if `calculating.tsx` or result
  code becomes unreadable.
- Medium: new route insertion can break progress percentages. Mitigation:
  update `QUIZ_STEPS`, progress math, and tests together.
