---
title: "Research: backend+web implementation plan for paid web onboarding handoff"
date: 2026-08-01
status: research-only
---

# Research Report: Backend+Web Paid Onboarding Handoff

## Executive Summary

Current web and backend code are already aligned on one important point: age is still a web-side UI input, while backend onboarding already accepts `birth_year` / `birth_month` / `birth_day` and computes age server-side. The gap is not the age math; it is the paid-claim path. The web funnel still ends in an anonymous RevenueCat checkout plus a client-side Firebase email-link send, while the backend only has Firebase sync, onboarding save, and RevenueCat webhook sync. There is no implemented `/v1/web-funnel/leads` or claim endpoint in backend code.

The safest plan is contract-first, then backend claim/state plumbing, then a compatible mobile client, then web activation. “Mobile-first” here should mean “compatible client before activation,” not “ship the mobile UI before the backend.” The backend owns identity, profile persistence, subscription projection, and replay safety; it must define the claim contract before the web funnel is turned on.

## Method

- Sources consulted: current web funnel code, backend FastAPI code, existing plan/docs, and unit/smoke tests.
- Credibility weighting: code > tests > repo docs/plans > memory notes.
- Recency: only current repo state and 2026-08-01 plan/docs were used.

## Key Findings

### 1. Current web state

- The quiz state persists `age` in `src/lib/quiz/store.ts`, and the step map still routes through an `age` screen in `src/components/steps/registry.tsx` and `src/lib/quiz/steps.ts`.
- The age UI is still directly rendered in `src/components/steps/number-input-step.tsx` and `src/components/steps/final-web-steps.tsx`; copy is still age-based in `src/lib/copy/en.ts` and `src/lib/copy/vi.ts`.
- The web TDEE client still sends `age` to `/v1/tdee/preview` from `src/lib/api/client.ts`.
- Checkout remains anonymous RevenueCat Web in `src/app/paywall/paywall-page-client.tsx`, with a client-side Firebase email-link send in `src/components/revenuecat-redemption-handoff.tsx` and `src/lib/firebase/email-link.ts`.
- The email-link flow stores only the email locally for same-device completion, and `/open-nutree` completes the link in-browser in `src/app/open-nutree/page.tsx`.

### 2. Current backend state

- Backend onboarding already accepts DOB fields in `src/api/schemas/request/onboarding_requests.py`.
- Backend computes age from DOB and saves both age and `date_of_birth` in `src/api/routes/v1/user_profiles.py`.
- `UserProfile` already has `date_of_birth` in `src/infra/database/models/user/profile.py`, and migration `036_add_date_of_birth.py` created it.
- Backend `users/sync` only syncs Firebase identity and optional profile metadata in `src/api/routes/v1/users.py`; it does not own web lead claim, payout claim, or onboarding restoration.
- RevenueCat webhook handling exists in `src/api/routes/v1/webhooks.py`, with user lookup, transfer handling, purchase/renewal/cancel/refund handling, and subscription cache projection. That is useful, but it is not the web claim flow.

### 3. Contract gap

- The current web funnel has no backend-owned claim record.
- The current backend has no web lead model, no claim token consumer, and no atomic “create user/profile/restored plan + associate subscription” endpoint.
- Existing tests show the intended safety posture:
  - web store migration strips legacy claim credentials in `src/lib/quiz/store.test.ts`.
  - Firebase link config forbids claim tokens in the continue URL in `src/lib/firebase/email-link.test.ts`.
  - RevenueCat web config tests enforce explicit package mapping in `src/lib/revenuecat/web.test.ts`.
  - backend smoke tests validate DOB rejection and Firebase UID ownership in `tests/unit/api/test_app_smoke_routes.py`.
  - webhook tests cover RevenueCat event replay, anonymous IDs, and transfer handling in `tests/unit/api/test_webhook_handler.py`.

### 4. Relevant existing plans/docs

- `plans/260801-0105-firebase-email-link-handoff/plan.md` already defines the cross-team handoff and delivery order.
- `plans/260801-0105-firebase-email-link-handoff/phase-01-freeze-cross-team-identity-contract.md` freezes the core identity boundary.
- `plans/260801-0105-firebase-email-link-handoff/phase-03-document-backend-fulfillment-and-claim.md` explicitly frames the backend contract as webhook inbox + claim email + Firebase UID association.
- `docs/firebase-email-link-identity-handoff.md` is the canonical contract: web lead -> RevenueCat fulfillment -> Firebase Email Link -> authenticated claim -> receipt association -> plan restore.
- `docs/email-first-funnel-backend-handoff.md` is the older/shorter version; it matches the same safe pattern.

## Trade-Off Matrix

| Option | Performance | Complexity | Maintenance | Risk | Fit |
| --- | --- | --- | --- | --- | --- |
| Contract-first, backend claim API, compatible mobile client, then web activation | Good; one atomic path | Medium | Good | Lowest | Best fit |
| Mobile UI first, backend later | Neutral | Medium | Poor | High; dead-end client states | Poor fit |
| Web activation first, backend catch-up later | Good short-term | Low short-term, high overall | Poor | Highest; claim drift and replay gaps | Worst fit |

## Threats / Failure Modes

### Race and replay

- RevenueCat webhooks are retryable, so backend claim/reconciliation must be idempotent and conflict-safe.
- Browser success is not proof of access; the client can only show pending states until backend-confirmed state exists.
- A claim token must be single-use and hashed at rest; no browser storage, URL query, analytics, or logs.

### PII leakage

- Email must remain out of analytics, URLs, and persisted browser state except for the local same-device Firebase completion hint.
- Claim state should never be recoverable from ordinary client storage.

### Identity confusion

- Web checkout email, Firebase UID, and RevenueCat App User ID are different identities. The contract must keep them separate until the backend atomically links them.
- The current `users.sync` email fallback in backend is not a safe claim mechanism; it is too broad for paid-claim identity mutation.

## Exact Files

### Web repo, likely to change

- `src/lib/quiz/types.ts`
- `src/lib/quiz/store.ts`
- `src/lib/quiz/steps.ts`
- `src/components/steps/registry.tsx`
- `src/components/steps/number-input-step.tsx`
- `src/components/steps/final-web-steps.tsx`
- `src/lib/copy/en.ts`
- `src/lib/copy/vi.ts`
- `src/lib/api/client.ts`
- `src/app/email/page.tsx`
- `src/app/paywall/paywall-page-client.tsx`
- `src/components/revenuecat-redemption-handoff.tsx`
- `src/lib/firebase/email-link.ts`
- `src/app/open-nutree/page.tsx`
- `src/app/checkout/page.tsx`
- Tests: `src/lib/quiz/store.test.ts`, `src/lib/firebase/email-link.test.ts`, `src/lib/revenuecat/web.test.ts`, `src/lib/api/client.test.ts`

### Backend repo, likely to change

- `src/api/routes/v1/user_profiles.py`
- `src/api/routes/v1/users.py`
- `src/api/routes/v1/webhooks.py`
- `src/api/schemas/request/onboarding_requests.py`
- `src/api/schemas/request/user_requests.py`
- `src/api/schemas/response/user_responses.py`
- `src/app/handlers/command_handlers/save_user_onboarding_command_handler.py`
- `src/app/handlers/command_handlers/sync_user_command_handler.py`
- `src/infra/database/models/user/profile.py`
- `src/infra/database/models/user/user.py`
- `src/infra/database/models/subscription.py`
- Existing migrations: `036_add_date_of_birth.py`, `045_add_onboarding_redesign_fields.py`, `20260801000002_remove_paddle_fulfillment_schema.py`
- Tests: `tests/unit/api/test_webhook_handler.py`, `tests/unit/api/test_app_smoke_routes.py`, `tests/unit/api/test_routes_with_mocked_event_bus.py`, `tests/unit/handlers/command_handlers/test_sync_user_command_handler.py`, `tests/unit/handlers/command_handlers/test_user_command_handlers.py`

## Recommended Delivery Order

1. Freeze the shared contract in docs and backend plan first: claim payload, returned states, and recovery states.
2. Add backend claim-state persistence and atomic claim completion next.
3. Update mobile to consume the new contract and complete Firebase sign-in before claim activation.
4. Swap web onboarding age -> DOB fields and route web checkout into the new backend-issued claim path.
5. Turn on backend/web activation only after the compatible mobile client exists.

## Ranked Recommendation

1. Contract-first backend implementation, then mobile compatibility, then web activation. Best fit because backend is the source of truth for identity, plan restoration, and replay safety.
2. Mobile-first UI only if reinterpreted as “compatibility first,” not as a separate release order. Useful only when the client must be able to consume the contract before launch.
3. Web-first activation. Not recommended; it creates the highest risk of dead ends, fake success, and claim drift.

## Why backend-first wins here

- The backend owns the atomic boundary: create/update user, restore onboarding data, associate subscription, and emit safe status.
- The backend already owns DOB validation and RevenueCat subscription projection; the new claim flow should extend those same invariants.
- The web funnel is currently only a consumer of backend state; it should not become the authority for claim success.

## Limitations

- I did not implement or verify the missing `/v1/web-funnel/leads` or claim endpoint because they are not present in the checked-in backend code.
- I did not run live end-to-end payment or Firebase sandbox flows.
- I did not inspect the mobile repo in this pass, so the mobile file list is inferred from the current contract docs and should be rechecked before implementation.

## Unresolved Questions

- Exact claim endpoint path/name: docs currently mention `POST /v1/web-funnel/claims/complete`, but the old web plans also mention shorter `/v1/web-funnel/claim`.
- Whether the backend should persist a separate lead table or fold claim state into an existing subscription/identity projection model.
- Whether the mobile repo already has a compatible Firebase Email Link completion seam ready for the new contract.
