---
phase: 2
title: "Low-Friction Inputs And Choice Polish"
status: completed
priority: P1
effort: "5h"
dependencies: [1]
---

# Phase 2: Low-Friction Inputs And Choice Polish

## Overview

Replace scattered browser-default number fields with one direct-entry metric
control, then apply the same interaction language to choices, options, and CTAs.

## Requirements

- Functional: retain values and min/max constraints for target weight, age,
  body-fat percentage, height, and current weight; preserve optional body-fat
  skip behavior and the exact existing `OnboardingPayload` keys.
- Functional: reduce typing friction with direct entry, large steppers, and
  limited context-relevant quick adjustments; preserve manual precision.
- Non-functional: numeric keyboard, labels, units, focus state, input errors,
  44px targets, no gesture-only action, and no new runtime dependency.

## Architecture

Create a client-side `MetricInput` presentation component. It accepts a string
draft, label, unit, min/max, step, quick-adjust configuration, error state, and
callbacks. `NumberInputStep` continues owning persistence/navigation; the
height/weight screen owns its two drafts and composes two `MetricInput`s. This
avoids coupling the reusable control to Zustand and keeps the current flow
contract intact.

## Related Code Files

- Create: `src/components/steps/metric-input.tsx`.
- Modify: `src/components/steps/number-input-step.tsx`,
  `src/components/steps/height-weight.tsx`, `src/components/steps/training-days.tsx`,
  `src/components/option-card.tsx`, `src/components/primary-button.tsx`,
  `src/lib/copy/vi.ts`, `src/app/globals.css`.
- Read before implementation: `src/lib/quiz/types.ts`, `src/lib/quiz/store.ts`,
  `src/lib/quiz/steps.ts`, `e2e/funnel.spec.ts`.

## Implementation Steps

1. Define field-specific behavior: target/current weight uses 0.5 or 1 kg
   increments and ±2.5 kg quick adjustments; height uses 1 cm; age uses 1 year;
   body fat uses 0.5 or 1%. Quick actions must be optional and must not overwrite
   a valid custom entry without an explicit tap.
2. Implement direct numeric input with `type="number"`, appropriate `step`,
   `inputMode="decimal"` where decimals are valid, `min`, `max`, a visible label,
   unit suffix, and a non-placeholder-only instruction. Keep the native control
   semantically a spinbutton rather than emulating one with ARIA.
3. Add labelled decrement/increment buttons with disabled boundary states. Each
   action clamps within the field range and updates the same draft string used by
   direct entry; keyboard users can type or use the native spinbutton behavior.
4. Validate on blur and attempted continue. When invalid, expose a Vietnamese
   message that states the accepted range; connect it with `aria-describedby`,
   set `aria-invalid` only after validation, and do not erase the user's input.
5. Compose the metric control into generic number and combined height/weight
   screens. Reuse saved Zustand values when revisiting a step, preserve Enter to
   continue when valid, and do not auto-advance on a numeric button tap.
6. Polish discrete choices: selected state includes border, check/selection
   affordance, and text—not only color; press/hover/focus states use the same
   radius/elevation tokens. Keep single-choice auto-advance and multi-choice
   explicit Continue behavior unchanged.
7. Update Vietnamese copy for useful helper/error/quick-adjust labels in the
   centralized copy module; no hard-coded user-facing strings in components.

## Success Criteria

- [x] Every metric screen supports exact keyboard entry plus 44px-or-larger
      decrement/increment controls and field-appropriate bounded values.
- [x] Valid input survives back/reload and writes the same payload shape before
      calling the existing `nextRoute(step)`.
- [x] Empty/invalid values cannot continue; an associated Vietnamese recovery
      message appears only after blur or an attempted submission.
- [x] Single/multi-choice, training-day, and primary CTA interactions are visually
      consistent without changing their existing navigation semantics.

## Completion Notes

- Added `MetricInput` as a presentational client component; store writes remain
  owned by the existing number and height/weight steps.
- Numeric parsing normalizes decimal comma to period and rejects empty/malformed
  values instead of coercing to zero.
- Continue remains focusable for attempted-submit validation, but invalid values
  do not persist or navigate.
- Enter submission is owned by the enclosing form to avoid duplicate submit
  side effects from input key handlers.
- Choice controls now include non-color selected affordances and consistent focus
  styling.

## Risk Assessment

- Decimal parsing may differ with Vietnamese commas. Explicitly decide and test
  whether comma is normalized to a period; never silently turn malformed input
  into zero.
- Combining a keypad, steppers, and chips can become visually dense. Render quick
  actions only on fields that benefit from them and keep one clear primary CTA.
- A shared component can cause selector drift in E2E. Retain accessible names
  and labels; update tests only for intentional behavior changes.

## Security Considerations

Client validation improves feedback but is not a security boundary. Preserve
server-side TDEE preview validation and never derive or transmit additional data.
