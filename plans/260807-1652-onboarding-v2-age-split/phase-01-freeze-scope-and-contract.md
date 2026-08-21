---
phase: 1
title: "Freeze Scope and Contract"
status: pending
priority: P1
effort: "4h"
dependencies: []
---

# Phase 1: Freeze Scope and Contract

## Overview

Freeze one additive contract before implementation: keep separate `sex` and
`age` routes in the web funnel, collect numeric age instead of DOB on web, and
introduce a backend age-capable web snapshot contract that does not fabricate
birth dates.

## Context Links

- `plans/reports/scout-260807-onboarding-v2-age-split.md`
- `src/components/steps/registry.tsx:73`
- `src/components/steps/birth-date-step.tsx:17`
- `/Users/alexnguyen/Desktop/Nut/mealtrack_backend/src/api/schemas/request/web_funnel_claim_requests.py:10`

## Key Insights

- Live routing is already split; the real active bug is that the `age` route
  still renders DOB fields (`src/components/steps/registry.tsx:73`,
  `src/components/steps/birth-date-step.tsx:17`).
- The stale onboarding-v2 `BodyBasicsStep` cannot be reused directly because it
  stores age in `birth_year` (`src/components/steps/final-web-steps.tsx:30`,
  `src/components/steps/final-web-steps.tsx:64`).
- TDEE preview already uses numeric age, so the preview contract itself does
  not require backend change (`src/lib/api/client.ts:37`,
  `/Users/alexnguyen/Desktop/Nut/mealtrack_backend/src/api/schemas/request/tdee_requests.py:55`).
- Lead creation, claim completion, and redemption completion still require DOB
  in the stored snapshot today (`src/lib/api/client.ts:94`,
  `/Users/alexnguyen/Desktop/Nut/mealtrack_backend/src/api/routes/v1/web_funnel.py:157`,
  `/Users/alexnguyen/Desktop/Nut/mealtrack_backend/src/app/services/web_funnel_claim_completion.py:28`).

## Requirements

- Functional: separate mobile-first sex and age screens; no DOB question on web;
  preserve TDEE preview, lead creation, and passwordless redemption handoff.
- Non-functional: do not fabricate DOB; preserve resume for legacy localStorage
  sessions; keep safe lead projection and same-origin BFF behavior unchanged.

## Architecture

- Data in: `SingleChoiceStep` writes `gender` into persisted Zustand state and
  auto-advances (`src/components/steps/single-choice.tsx:33`,
  `src/lib/quiz/store.ts:75`).
- Data transform: the new `age` screen writes explicit age; TDEE preview and
  local fallback must prefer explicit age and only fall back to legacy DOB reads
  for migrated sessions (`src/lib/api/client.ts:37`,
  `src/lib/tdee/calculator.ts:94`, `src/lib/quiz/dob.ts:12`).
- Data out: lead creation moves from DOB-triplet snapshots to an additive
  age-capable snapshot v2 at `/api/web-funnel/leads` -> `/v1/web-funnel/leads`
  (`src/lib/api/client.ts:74`,
  `/Users/alexnguyen/Desktop/Nut/mealtrack_backend/src/api/routes/v1/web_funnel.py:130`).
- Backend persistence: new web rows store `age`; legacy rows keep DOB; claim and
  redemption completion set `UserProfile.date_of_birth=None` for age-only web
  profiles because the column is nullable
  (`/Users/alexnguyen/Desktop/Nut/mealtrack_backend/src/infra/database/models/web_funnel_claim.py:32`,
  `/Users/alexnguyen/Desktop/Nut/mealtrack_backend/src/infra/database/models/user/profile.py:38`).

## Related Code Files

- Modify web: `src/components/steps/birth-date-step.tsx`, `src/components/steps/registry.tsx`, `src/lib/quiz/types.ts`, `src/lib/quiz/store.ts`, `src/lib/api/client.ts`, `src/lib/tdee/calculator.ts`, `src/lib/quiz/dob.ts`, `src/lib/copy/en.ts`, `src/lib/copy/vi.ts`.
- Modify backend: `/Users/alexnguyen/Desktop/Nut/mealtrack_backend/src/api/schemas/request/web_funnel_claim_requests.py`, `/Users/alexnguyen/Desktop/Nut/mealtrack_backend/src/api/routes/v1/web_funnel.py`, `/Users/alexnguyen/Desktop/Nut/mealtrack_backend/src/app/services/web_funnel_claim_completion.py`, `/Users/alexnguyen/Desktop/Nut/mealtrack_backend/src/infra/services/web_funnel_redemption_completion.py`.
- Modify tests: `src/lib/api/client.test.ts`, `src/lib/quiz/store.test.ts`, backend `tests/unit/api/schemas/test_web_funnel_claim_requests.py`, `tests/unit/api/routes/test_web_funnel_lead_routes.py`, `tests/unit/app/services/test_web_funnel_claim_completion.py`, `tests/unit/infra/services/test_web_funnel_redemption_service.py`.

## Implementation Steps

1. Freeze the route decision: keep live `sex` and `age` slugs; do not rename to `body_basics` / `body_metrics` in this request.
2. Freeze the data decision: use an additive backend age-capable web snapshot contract; do not dual-write synthetic DOB.
3. Freeze the validation decision: keep the paid web-funnel gate at `18-100` unless product explicitly changes it; document why it is narrower than general profile APIs.
4. Freeze rollout order: backend deploy first, web deploy second, staging SIT third.

## Success Criteria

- [ ] Every producer and consumer of age or DOB is enumerated in the plan.
- [ ] No implementation step relies on fabricated DOB.
- [ ] Cross-repo owner and deploy order are explicit before coding starts.

## Risk Assessment

- High: fabricated DOB corrupts persisted profile truth. Mitigation: explicit age field and nullable DOB for web-origin profiles.
- Medium: stale spec/component names send implementation toward the dead `BodyBasicsStep`. Mitigation: keep live slugs and reuse only the mobile input primitive.
- Medium: web and backend age gates drift and cause lead-validation failures. Mitigation: align the new web snapshot validator before shipping frontend changes.

## Security Considerations

- Keep safe lead projection unchanged; do not expose snapshot contents to the browser.
- Keep lead access keys, redemption hashes, and raw redemption URLs on their existing narrow paths.

## Rollback Plan

- If product rejects age-only web profiles, stop before phase 2 and retain DOB capture.
- If the backend contract is not approved, no frontend payload changes ship.

## Next Steps

- Phase 2 can start after this contract is frozen.
- Phase 3 backend work must land before the web request-shape switch deploys.
