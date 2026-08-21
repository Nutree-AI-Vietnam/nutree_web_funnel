---
phase: 2
title: "Implement Web Age-First Split"
status: pending
priority: P1
effort: "1d"
dependencies: [1, 3]
---

# Phase 2: Implement Web Age-First Split

## Overview

Replace the active DOB screen with a mobile-first age screen, keep the existing
`sex` step as the preceding screen, and migrate web-only age consumers away from
DOB-derived state without breaking legacy local resume.

## Context Links

- `src/components/steps/birth-date-step.tsx:12`
- `src/components/steps/metric-input.tsx:31`
- `src/lib/api/client.ts:37`
- `src/lib/tdee/calculator.ts:94`

## Key Insights

- The current active sex screen already auto-advances and fits the mobile quiz
  pattern (`src/components/steps/single-choice.tsx:33`).
- `BirthDateStep` is the only active step still collecting DOB in the live quiz
  (`src/components/steps/birth-date-step.tsx:17`).
- `MetricInput` and `MetricWheelPicker` already provide the intended mobile-first
  number-entry surface; the plan should reuse them instead of reviving the dead
  `BodyBasicsStep` (`src/components/steps/metric-input.tsx:31`).

## Requirements

- Functional: `/quiz/sex` and `/quiz/age` stay separate; `/quiz/age` stores numeric age only; TDEE preview, calculating screen, body review, local preview, and email lead creation still work.
- Non-functional: persisted-state migration handles old DOB-only sessions; route slugs, progress, and step-view analytics stay stable.

## Architecture

- State lifetime: `useQuizStore` persists `data` under `nutree_funnel_v1`, so adding `age` changes durable browser state, not per-route temp state (`src/lib/quiz/store.ts:9`, `src/lib/quiz/store.ts:42`).
- Migration path: derive `age` from legacy DOB during store migration only when `age` is absent, then keep legacy DOB reads as a compatibility fallback (`src/lib/quiz/store.ts:55`, `src/lib/quiz/dob.ts:12`).
- TDEE path: `CalculatingStep` calls both `computeTdeeResult()` and `previewTdee()`; both must prefer explicit age (`src/components/steps/calculating.tsx:44`, `src/components/steps/calculating.tsx:63`, `src/lib/api/client.ts:37`, `src/lib/tdee/calculator.ts:94`).
- Lead path: `EmailPage` submits raw `data` to `createLead()`, so the web payload switch must remain blocked on phase 3 backend support (`src/app/email/page.tsx:39`, `src/lib/api/client.ts:64`).

## Related Code Files

- Modify: `src/components/steps/birth-date-step.tsx`, `src/components/steps/registry.tsx`, `src/lib/quiz/types.ts`, `src/lib/quiz/store.ts`, `src/lib/quiz/dob.ts`, `src/lib/api/client.ts`, `src/lib/tdee/calculator.ts`, `src/components/steps/calculating.tsx`, `src/components/steps/final-web-steps.tsx`, `src/lib/local-preview.ts`, `src/lib/copy/en.ts`, `src/lib/copy/vi.ts`.
- Modify tests: `src/lib/api/client.test.ts`, `src/lib/quiz/store.test.ts`, `src/lib/quiz/dob.test.ts`, any focused age-step tests added for the new screen.

## Implementation Steps

1. Add `age?: number` to `OnboardingPayload` and persist it through the store migration without dropping legacy DOB fields immediately.
2. Replace the active DOB UI in `BirthDateStep` with a single age wheel screen using `MetricInput` bare mode; keep route slug `age` and continue to `/quiz/height`.
3. Update web age consumers to prefer explicit `age`: `previewTdee()`, `computeTdeeResult()`, the calculating screen preview, body review, and local preview fixtures.
4. Remove DOB-specific copy and error handling from the active age step; keep stale combined `body_basics` copy only if it remains unused.
5. Hold the final `toWebFunnelSnapshot()` request-shape switch until the backend additive contract from phase 3 is deployed.

## Success Criteria

- [ ] The live funnel still shows separate `sex` and `age` screens.
- [ ] The active `age` screen stores numeric age and no longer requires month/day/year input.
- [ ] TDEE preview and local fallback both compute from explicit age for new sessions.
- [ ] Legacy localStorage sessions with DOB still rehydrate and can continue.

## Risk Assessment

- High: persisted resume breaks because old sessions have no `age`. Mitigation: store migration derives age once from legacy DOB and keeps fallback readers.
- Medium: route or analytics drift if step slugs change. Mitigation: keep `sex` and `age` slugs unchanged.
- Medium: the dead `BodyBasicsStep` misleads implementation. Mitigation: reuse only `MetricInput` primitives; do not route users through `final-web-steps.tsx`.

## Security Considerations

- Numeric age is less sensitive than DOB, but browser storage rules remain the same.
- Do not widen browser persistence beyond existing safe `data`, `tdee`, and lead projection state.

## Rollback Plan

- Revert the active `BirthDateStep` UI and request payload switch independently of backend dual-read support.
- Keep store migration backward-compatible so rollback does not strand new sessions.

## Next Steps

- Phase 3 backend deploy is a hard release dependency for the lead payload switch.
- After backend staging is live, run the phase 3 validation matrix before production rollout.
