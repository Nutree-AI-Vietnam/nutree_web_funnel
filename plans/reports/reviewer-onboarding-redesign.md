# Code Review Summary

## Scope

- Files: quiz route table/registry, age/TDEE flow, impression/progress screens, modal/carousel, email page, localized copy; affected backend contract inspected read-only.
- LOC: 529 additions / 58 deletions across 20 tracked files, plus new untracked onboarding components.
- Focus: current uncommitted onboarding redesign; route order, localization, accessibility, mobile layout, backend compatibility, animation/cleanup.
- Scout findings: affected consumers include `toWebFunnelSnapshot()`, the v1 backend snapshot validator/completion paths, `QuizShell` overflow, and all new modal/carousel consumers.

## Overall Assessment

Not ready to land. Tests and production build pass, but the age flow silently writes false birth dates and several requested mobile/accessibility/error-path gates are incomplete.

## Critical Issues

- `src/components/steps/birth-date-step.tsx:25-26`, `src/lib/api/client.ts:83-101`: the new age screen converts an entered age to January 1 of `currentYear - age`; `toWebFunnelSnapshot()` still omits `age` and sends the fabricated DOB. The current backend requires DOB (`mealtrack_backend/src/api/schemas/request/web_funnel_claim_requests.py:10-39`) and persists it into `UserProfile.date_of_birth` during claim/redemption completion. This is silent profile data corruption, not a compatible age-only rollout. Fix: keep truthful DOB capture until the backend v2 age snapshot/dual-read contract is deployed, then send age-only and leave DOB null.

## High Priority

- `src/lib/quiz/steps.ts:23-27`, `src/components/steps/tdee-targets.tsx:132-135`: `progress` is appended after `result`, so the user sees result -> progress -> email. The redesign plan freezes `result -> /email` and places the Flutter-style progress transition before calculating. Fix: integrate/move this screen before calculating or remove it, then test every adjacent route.

- `src/components/quiz-shell.tsx:44`, `src/components/steps/calculating.tsx:127-246`, `src/components/steps/progress.tsx:21-85`: `QuizShell` uses `overflow-hidden`, while the new calculating/progress screens have large fixed content and no vertical scroll region. At 375px/430px heights the checklist/chart or CTA can be clipped. Fix: provide a `min-h-0 overflow-y-auto` content region or allow page scrolling and verify both mobile widths.

- `src/components/steps/calculating.tsx:59-79`, `:254-260`: the failure CTA labeled “Try again” navigates to `/quiz/name_ask`; it does not retry TDEE or restart the calculating effect. A real API+fallback failure sends the user to the wrong step. Fix: reset the calculation state and rerun the request, retaining the user on calculating.

- `src/components/steps/calculating.tsx:59`, `src/components/steps/impression-steps.tsx:15-194`, `src/components/steps/progress.tsx:40-48`, `src/components/exit-intent-modal.tsx:76-172`: reduced-motion users still wait the full artificial 10 seconds, and Motion animations have no reduced-motion guard. The calculation timeout is also not cleared on unmount; only the RAF is cancelled. Fix: bypass/shorten the delay under reduced motion, use `useReducedMotion` for Motion transitions, and clear the timer in cleanup.

## Medium Priority

- `src/components/exit-intent-modal.tsx:11-185`, `src/components/slideshow.tsx:105-133`, `src/components/steps/birth-date-step.tsx:44-47`, `src/app/email/page.tsx:112`: user-visible and ARIA strings remain hardcoded in Vietnamese/English (`ExitIntentModal`, carousel controls, age error, `Private`, `vi-VN` formatting). English users will see Vietnamese exit UI and Vietnamese users see mixed-language email copy. Fix: add these strings to the typed `Copy` contract and format numbers from the active locale.

- `src/components/steps/multi-choice.tsx:38-46`, `:91-117`: the care modal now focuses its CTA and handles Escape, but it does not trap focus or restore focus to the triggering control; Escape leaves focus on an unmounted button. The modal also offers no edit action, and the trigger fires for every non-`none` preference, including vegan/halal rather than only cautionary selections. Fix: implement focus trap/restore and explicit edit/proceed actions; restrict the predicate to cautionary keys.

- `src/components/steps/birth-date-step.tsx:15-17`, `src/lib/quiz/store.ts:55-61`, `src/lib/quiz/dob.ts:12-24`: legacy persisted sessions containing only a real DOB do not prefill the new age field, so resume requires re-entry and then replaces truthful data with a synthetic DOB. `deriveAge()` also returns any integer `age` without the 18-100 validation used by the UI. Fix: migrate/read legacy DOB into age and validate explicit age at the TDEE/payload boundary.

## Low Priority

None recorded; style-only whitespace was excluded.

## Edge Cases Found by Scout

- API/backend dependency: current backend is v1 DOB-only; web age-only support is not present in this worktree.
- Long-screen dependency: the shell’s global overflow policy affects calculating/progress differently from Science, which added its own scroll container.
- Async dependency: calculating cancels the RAF and guards the promise, but leaves the minimum-delay timer alive and offers no in-place retry.

## Positive Observations

- `npm test` passes: 26 files, 91 tests.
- `npm run build` passes on the current tree, including TypeScript and static generation.
- Copy modules are shape-checked through `Copy`; slideshow intervals and calculation RAFs have cleanup paths; lead creation and the strict v1 snapshot mapper were not widened with browser secrets.

## Recommended Actions

1. Block the web age UI until the backend age snapshot contract is deployed and cross-repo tests prove truthful profile persistence.
2. Fix route order, mobile scrolling, calculation retry, and reduced-motion timing before manual 375px/430px validation.
3. Complete localized copy and modal focus behavior; add unit tests for snapshot shape, legacy migration, modal predicate, retry, and route adjacency.

## Metrics

- Type coverage: not configured; `npm run build` TypeScript phase passed.
- Test coverage: not measured; 91/91 Vitest tests passed.
- Linting issues: repo `npm run lint` reports 27 errors (12 hook-rule errors in touched `registry.tsx`, 15 unrelated `.codex` script errors); touched-file lint reports the 12 `registry.tsx` errors.

## Unresolved Questions

- Should `progress` be an intentional post-result screen, or was it meant to replace/integrate the pre-calculation `preview` transition? The current route differs from the frozen redesign plan.
- Has the backend v2 age-only snapshot contract been approved and deployed? No evidence of it exists in the inspected backend source.

**Status:** DONE_WITH_CONCERNS
**Summary:** Review completed and saved. The current implementation builds and tests pass, but the synthetic-DOB path is a release-blocking data-integrity defect; route, mobile, retry, localization, and accessibility issues remain.
**Concerns/Blockers:** Backend age-only contract is absent; do not ship the new age UI until the cross-repo contract and SIT are complete.
