---
phase: 3
title: "Backend Snapshot Compatibility and Validation"
status: pending
priority: P1
effort: "1.5d"
dependencies: [1]
---

# Phase 3: Backend Snapshot Compatibility and Validation

## Overview

Add a dual-read backend snapshot contract for web leads, preserve legacy DOB
rows, and validate the full quiz -> TDEE -> lead -> passwordless redemption
chain before the web payload switch ships.

## Context Links

- `/Users/alexnguyen/Desktop/Nut/mealtrack_backend/src/api/schemas/request/web_funnel_claim_requests.py:10`
- `/Users/alexnguyen/Desktop/Nut/mealtrack_backend/src/api/routes/v1/web_funnel.py:130`
- `/Users/alexnguyen/Desktop/Nut/mealtrack_backend/src/app/services/web_funnel_claim_completion.py:28`
- `/Users/alexnguyen/Desktop/Nut/mealtrack_backend/src/infra/services/web_funnel_redemption_completion.py:178`

## Key Insights

- `WebFunnelOnboardingSnapshot` currently inherits `OnboardingCompleteRequest`, so DOB is required by construction (`/Users/alexnguyen/Desktop/Nut/mealtrack_backend/src/api/schemas/request/web_funnel_claim_requests.py:10`, `/Users/alexnguyen/Desktop/Nut/mealtrack_backend/src/api/schemas/request/onboarding_requests.py:22`).
- `/v1/web-funnel/leads` stores the request snapshot JSON directly and stamps `web_onboarding_snapshot_v1` today (`/Users/alexnguyen/Desktop/Nut/mealtrack_backend/src/api/routes/v1/web_funnel.py:157`, `/Users/alexnguyen/Desktop/Nut/mealtrack_backend/src/api/routes/v1/web_funnel.py:162`).
- Claim completion and redemption completion both recompute age from DOB and set `date_of_birth` into `UserProfile` (`/Users/alexnguyen/Desktop/Nut/mealtrack_backend/src/app/services/web_funnel_claim_completion.py:28`, `/Users/alexnguyen/Desktop/Nut/mealtrack_backend/src/infra/services/web_funnel_redemption_completion.py:178`).

## Requirements

- Functional: accept both legacy DOB snapshots and new age-only web snapshots; keep passwordless redemption and safe lead projection behavior unchanged; leave `/v1/tdee/preview` contract untouched.
- Non-functional: forward-only rollout, no synthetic DOB, focused regression coverage in both repos, deploy order explicit.

## Architecture

- Input: same-origin web BFF posts an onboarding snapshot to `/v1/web-funnel/leads` (`src/lib/api/client.ts:76`, `/Users/alexnguyen/Desktop/Nut/mealtrack_backend/src/api/routes/v1/web_funnel.py:130`).
- Transform: backend validator accepts either legacy DOB or explicit age for web leads, then persists versioned snapshot JSON in `web_funnel_leads.snapshot` (`/Users/alexnguyen/Desktop/Nut/mealtrack_backend/src/infra/database/models/web_funnel_claim.py:35`).
- Output: claim completion and redemption finalization populate `UserProfile.age`, TDEE-derived macros, and weekly budgets from `snapshot.age` when present; `date_of_birth` is only set for truthful legacy DOB snapshots (`/Users/alexnguyen/Desktop/Nut/mealtrack_backend/src/infra/database/models/user/profile.py:38`).
- Backwards compatibility: keep v1 rows readable, keep v1 tests green, and deploy backend before the web request-shape switch.

## Related Code Files

- Modify backend: `/Users/alexnguyen/Desktop/Nut/mealtrack_backend/src/api/schemas/request/web_funnel_claim_requests.py`, `/Users/alexnguyen/Desktop/Nut/mealtrack_backend/src/api/routes/v1/web_funnel.py`, `/Users/alexnguyen/Desktop/Nut/mealtrack_backend/src/app/services/web_funnel_claim_completion.py`, `/Users/alexnguyen/Desktop/Nut/mealtrack_backend/src/infra/services/web_funnel_redemption_completion.py`.
- Modify backend tests: `/Users/alexnguyen/Desktop/Nut/mealtrack_backend/tests/unit/api/schemas/test_web_funnel_claim_requests.py`, `/Users/alexnguyen/Desktop/Nut/mealtrack_backend/tests/unit/api/routes/test_web_funnel_lead_routes.py`, `/Users/alexnguyen/Desktop/Nut/mealtrack_backend/tests/unit/app/services/test_web_funnel_claim_completion.py`, `/Users/alexnguyen/Desktop/Nut/mealtrack_backend/tests/unit/infra/services/test_web_funnel_redemption_service.py`.
- Modify web tests after backend readiness: `src/lib/api/client.test.ts`, `src/lib/quiz/store.test.ts`.

## Implementation Steps

1. Replace the inherited web snapshot schema with a dedicated validator or additive union that accepts either `{ age }` or `{ birth_year, birth_month, birth_day }` plus the existing onboarding fields.
2. Stamp `web_onboarding_snapshot_v2` for age-only payloads while continuing to read and process legacy `web_onboarding_snapshot_v1` rows.
3. Refactor shared age resolution so claim completion and redemption completion prefer `snapshot.age`, fall back to legacy DOB, and write `date_of_birth=None` for age-only web-origin profiles.
4. Add backend regression coverage for schema validation, lead creation, claim completion, and redemption completion across both snapshot versions.
5. Run cross-repo verification in this order: backend tests, web tests, then staging SIT across `/quiz/sex` -> `/quiz/age` -> `/quiz/calculating` -> `/email` -> `/paywall` -> passwordless handoff.

## Success Criteria

- [ ] Backend accepts both legacy DOB and new age-only web snapshots.
- [ ] Lead creation succeeds for the new web payload without safe-projection changes.
- [ ] Claim completion and redemption completion compute the same persisted age/macros without writing fabricated DOB.
- [ ] Staging SIT proves the end-to-end passwordless redemption flow still works after the payload change.

## Test Matrix

- Web unit: `src/lib/api/client.test.ts`, `src/lib/quiz/store.test.ts`, focused age-step and fallback-TDEE tests.
- Backend unit: schema validation, lead-route request validation, claim completion, redemption completion.
- Manual SIT: browser quiz completion, TDEE result, email lead creation, RevenueCat checkout correlation, passwordless mobile completion.

## Risk Assessment

- High: backend contract fork drifts from mobile onboarding. Mitigation: keep non-age field names identical and dual-read only the age/DOB difference.
- Medium: downstream code expects DOB to exist. Mitigation: audit nullable `date_of_birth` consumers and add regression coverage around mapping/response paths.
- Medium: mixed snapshot versions in staging rows mask bugs. Mitigation: versioned snapshot writes and dual-read tests for both versions.

## Security Considerations

- Same-origin BFF secret, lead access key, and safe projection contract stay unchanged.
- Do not log or echo full snapshots during 422 or staging diagnostics.

## Rollback Plan

- Backend rollback: keep dual-read support even if the web rollout is reverted; do not delete support for v1 rows.
- Web rollback: restore DOB capture while backend dual-read remains deployed; no data repair needed for existing v2 rows because they are age-based and self-contained.

## Next Steps

- After SIT passes, optionally align stale spec text (`body_basics`) in a separate docs-only cleanup.
- If product later requires DOB for web-origin users, design that as an explicit mobile follow-up, not as hidden data fabrication here.
