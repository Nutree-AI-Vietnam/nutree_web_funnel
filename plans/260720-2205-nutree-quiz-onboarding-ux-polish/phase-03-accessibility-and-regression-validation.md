---
phase: 3
title: "Accessibility And Regression Validation"
status: completed
priority: P1
effort: "3h"
dependencies: [1, 2]
---

# Phase 3: Accessibility And Regression Validation

## Overview

Protect the redesign with focused behavior tests and full funnel validation;
verify accessibility and responsive behavior before accepting the visual pass.

## Requirements

- Functional: all current 23 steps, TDEE result flow, localStorage resume, email
  capture, and paywall navigation still work.
- Non-functional: keyboard flow, focus visibility, labels, errors, touch targets,
  reduced motion, 375px layout, and no additional client bundle dependency.

## Related Code Files

- Modify: `e2e/funnel.spec.ts`.
- Optional create: a colocated pure helper test if parsing/range normalization is
  extracted from the component.
- Verify: `src/lib/quiz/steps.test.ts`, `src/lib/quiz/store.test.ts`, existing
  TDEE tests, all component files changed in phases 1–2.

## Test Scenario Matrix

| Priority | Scenario | Evidence |
|---|---|---|
| Critical | Target/current weight entry is bounded, persists, and still reaches TDEE results | Playwright full-funnel run |
| Critical | Invalid metric values cannot continue and receive a linked Vietnamese error | focused Playwright test |
| High | Steppers respect min/max and retain typed decimal values | focused unit or Playwright test |
| High | Back/reload restores values and choices | existing resume E2E plus metric assertion |
| High | Logo/progress/CTA fit 375px and support keyboard focus | browser smoke at 375px |
| Medium | `prefers-reduced-motion` suppresses visual-only transitions | browser/style inspection |

## Implementation Steps

1. Add/update E2E selectors using labels and roles, never class names. Cover
   direct entry, plus/minus adjustment, min/max disabled state, invalid feedback,
   and a resumed height/weight or target-weight screen.
2. Run unit tests first, then lint/build, then mocked-backend E2E. Resolve real
   failures instead of weakening range assertions or bypassing route checks.
3. Manually smoke 375px and 430px layouts in a real browser: test keypad open,
   scroll to Continue, selected choices, back navigation, and resumed state.
4. Keyboard/screen-reader pass: Tab/Shift+Tab order; visible focus; all icon
   buttons named; labels and errors associated; progress exposed as a progressbar;
   no meaning conveyed only by color.
5. Test `prefers-reduced-motion: reduce` and check that initial rendering reserves
   logo space and does not shift the CTA or input controls.
6. Record any residual accessibility/browser discrepancy in the implementation
   handoff, including exact device/browser and whether it is a launch blocker.

## Success Criteria

- [x] `npm run lint`, `npm test`, `npm run build`, and `npm run test:e2e` pass.
- [x] E2E proves the full contract from landing through TDEE, email, and paywall
      with the new metric controls.
- [x] Primary controls are usable at 375px with keyboard and touch; no horizontal
      overflow, invisible focus, unlabeled control, or unannounced validation error.
- [x] Reduced-motion users get an equally understandable static experience.

## Completion Notes

- Added unit coverage for metric normalization/range helpers.
- Added E2E coverage for invalid metric submit, disabled min stepper, quick
  adjustment, Enter submit, full funnel, resume, and unknown-step 404.
- Verification commands passed on 2026-07-20.
- Playwright visual smoke wrote screenshots to `reports/target-weight-375.png`
  and `reports/target-weight-430.png`.

## Risk Assessment

- The repository has unrelated dirty worktree changes. Stage only files owned by
  this UX work if a later delivery request arrives.
- Test environments can render native spinbuttons differently. Assert semantic
  behavior and accessible names rather than browser-specific internal arrows.

## Security Considerations

Tests use the existing mocked backend only. Do not add production credentials or
real user information to fixtures, screenshots, or browser storage.
