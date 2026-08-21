---
phase: 5
title: "Validation And Rollout"
status: pending
priority: P1
effort: "0.5d"
dependencies: [2, 3, 4]
---

# Phase 5: Validation And Rollout

## Overview

Validate the redesign the way this repo is actually maintained: lint, unit
tests, build, and focused browser/manual checks. No Playwright/e2e.

## Requirements

- Functional: cover route-order changes, modal trigger logic, and any extracted
  pure helpers with unit tests.
- Non-functional: verify mobile layout, reduced motion, keyboard access, and
  route continuity through email -> welcome-gift -> paywall.
- Release: preserve rollback simplicity; this redesign should remain front-end only.

## Architecture

- Automated validation: `src/lib/quiz/steps.test.ts:4-60` plus any new pure-helper
  tests, then `npm run lint`, `npm test`, `npm run build`.
- Manual validation: direct route smoke on `/quiz/*`, `/email`, `/welcome-gift`,
  and `/paywall`; visual checks on 375px and 430px widths.
- Rollback: reverse-order front-end revert only because no migration or backend
  contract change is planned.

## Related Code Files

- Modify/update: `src/lib/quiz/steps.test.ts`
- Optional new pure-helper tests if code is extracted under `src/lib/` or
  `src/components/steps/`
- No doc update required unless scope or acceptance materially changes

## Implementation Steps

1. Update step-order tests for any additive route and new progress math.
2. Add pure-unit coverage for any extracted helpers:
   carousel paging math, modal trigger predicate, calculating timeline/stage reducer.
3. Run `npm run lint`, `npm test`, and `npm run build`.
4. Manual browser matrix:
   375px and 430px widths, touch + keyboard carousel control, reduced motion,
   modal focus trap/restore, retry path on calculating failure, `/email` error
   recovery, and `/welcome-gift -> /paywall` continuity.
5. Rollback plan:
   revert email page first, then calculating/reassurance, then quiz storytelling,
   then route-table changes. Because no backend migration exists, rollback stays
   bounded to the web repo.

## Success Criteria

- [ ] Lint, unit tests, and build pass.
- [ ] Manual mobile/accessibility checks pass without introducing new auth or payment regressions.
- [ ] Rollback remains front-end only and can be done without data repair.

## Risk Assessment

- Medium: repo-wide lint can fail on unrelated pre-existing issues. Mitigation:
  report scope honestly and separate touched-file evidence from repo-level noise.
- Medium: visual regressions may hide behind passing unit tests. Mitigation:
  keep the manual matrix mandatory.
- Low: rollback confusion. Mitigation: document reverse-order revert steps before
  release work starts.
