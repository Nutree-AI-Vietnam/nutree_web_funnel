# Red-Team Security Plan Review

## Scope and method

- Reviewed every `plan.md` and `phase-*.md` in the coordinated web, backend, and mobile plan folders, plus `docs/firebase-email-link-identity-handoff.md`.
- Fact-check sampled at least 15 path/symbol/route/config/behavior claims per phase (240+ checks across 16 phase documents) using `rg` and direct source reads. No lint, build, or tests run.
- Two-pass result: 3 blocking Critical findings and 2 High findings. Locked choices (mobile-first DOB, custom-token path, no silent merge, existing RevenueCat/native behavior) are preserved.

## Critical findings

### 1. Payment-to-lead correlation is based on a checkout contract that does not exist

The web plan says Paddle.js already sends `funnel_lead_id` in `customData` and says to keep the current Paddle.js path ([phase-02:35](/Users/alexnguyen/Desktop/Nut/nutree_web_funnel/plans/260801-0105-firebase-email-link-handoff/phase-02-prepare-web-email-link-handoff.md:35), [phase-02:86](/Users/alexnguyen/Desktop/Nut/nutree_web_funnel/plans/260801-0105-firebase-email-link-handoff/phase-02-prepare-web-email-link-handoff.md:86)). Live code instead uses the RevenueCat browser SDK, generates a new random anonymous App User ID ([web.ts:45](/Users/alexnguyen/Desktop/Nut/nutree_web_funnel/src/lib/revenuecat/web.ts:45)), and purchases with only package, email, and locale—no lead UUID/custom data ([paywall-page-client.tsx:131](/Users/alexnguyen/Desktop/Nut/nutree_web_funnel/src/app/paywall/paywall-page-client.tsx:131)). The current backend explicitly ignores anonymous RevenueCat events when no local user resolves ([webhooks.py:121](/Users/alexnguyen/Desktop/Nut/mealtrack_backend/src/api/routes/v1/webhooks.py:121), [webhooks.py:179](/Users/alexnguyen/Desktop/Nut/mealtrack_backend/src/api/routes/v1/webhooks.py:179)), while the backend plan requires resolving `funnel_lead_id` from fulfillment ([backend phase-03:26](/Users/alexnguyen/Desktop/Nut/mealtrack_backend/plans/260802-0135-paid-web-magic-link-claim-entitlement-backend/phase-03-verified-payment-reconciliation-and-claim-email.md:26)).

Impact: verified purchases cannot be safely joined to a lead. Implementation pressure will either strand paid buyers or fall back to email/provider metadata matching, which violates the plan's own non-authoritative identity boundary and can bind a purchase to the wrong lead.

Required plan fix: replace all Paddle/customData assumptions with one provider-verified RevenueCat Web contract. Freeze how the backend-issued lead UUID becomes the checkout App User ID (or another RevenueCat-supported immutable identifier), which webhook/API field returns it, and negative tests proving random anonymous IDs, email, and unrecognized aliases never fulfill a lead.

### 2. “Same-reservation retry” is replayable because the exchange request has no device/reservation proof

The exchange request contains only public `lead_id` plus bearer `magic_token` ([handoff doc:90](/Users/alexnguyen/Desktop/Nut/nutree_web_funnel/docs/firebase-email-link-identity-handoff.md:90)). The backend plan promises bounded retry of the same reservation while rejecting another device ([backend phase-04:26](/Users/alexnguyen/Desktop/Nut/mealtrack_backend/plans/260802-0135-paid-web-magic-link-claim-entitlement-backend/phase-04-single-use-magic-link-exchange-and-firebase-identity.md:26), [backend phase-04:32](/Users/alexnguyen/Desktop/Nut/mealtrack_backend/plans/260802-0135-paid-web-magic-link-claim-entitlement-backend/phase-04-single-use-magic-link-exchange-and-firebase-identity.md:32)), and mobile sends no client nonce/key beyond those two values ([mobile phase-03:26](/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/plans/260801-1137-firebase-email-link-claim-handoff-mobile/phase-03-firebase-email-link-authentication.md:26)). There is therefore no observable fact by which the server can distinguish “same device recovering a lost response” from a second holder replaying the stolen/forwarded link.

Impact: during the retry window, an attacker with the link can obtain a fresh Firebase custom token and exchange token for the buyer identity. This defeats the claimed single-use and another-device-fails-closed guarantees.

Required plan fix: freeze either (a) strict one-shot exchange with resend/recovery after response loss, or (b) a device-generated possession key/client nonce bound atomically to the reservation and required on retries. Define concurrency outcomes and tests for first-response loss, forwarded-link replay, two-device races, and retry after reservation expiry.

### 3. Process death after Firebase sign-in bypasses the atomic claim boundary

Mobile keeps `exchange_token` only in memory ([mobile phase-03:28](/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/plans/260801-1137-firebase-email-link-claim-handoff-mobile/phase-03-firebase-email-link-authentication.md:28)), but completion requires that token ([mobile phase-04:25](/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/plans/260801-1137-firebase-email-link-claim-handoff-mobile/phase-04-claim-recovery-user-journey.md:25)). Recovery is specified only for committed results/safe pending state ([backend phase-05:35](/Users/alexnguyen/Desktop/Nut/mealtrack_backend/plans/260802-0135-paid-web-magic-link-claim-entitlement-backend/phase-05-atomic-profile-plan-claim-and-revenuecat-outbox.md:35)). If the app dies after `signInWithCustomToken` but before completion, Firebase remains signed in but the only completion credential is gone and no committed result exists. On restart, current auth startup treats a Firebase user as normal and calls backend onboarding status ([auth_flow_notifier.dart:223](/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/features/auth/application/providers/auth_flow_notifier.dart:223)); normal post-auth also logs into RevenueCat then calls `/users/sync` ([auth_repository.dart:368](/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/features/auth/data/repositories/auth_repository.dart:368), [auth_repository.dart:415](/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/features/auth/data/repositories/auth_repository.dart:415)).

Impact: a Firebase identity can escape into ordinary sync/onboarding without consuming the paid claim, producing partial identity/profile state outside the promised atomic transaction and potentially associating RevenueCat to the wrong lifecycle state.

Required plan fix: define an authenticated pre-completion recovery state keyed by the Firebase UID and active reservation, and make the startup barrier query it before every normal auth side effect. Specify whether recovery can complete server-side without replaying a client secret or must revoke/sign out the provisional Firebase session. Add kill points after exchange response, custom sign-in, ID-token refresh, completion send, commit, and response return.

## High findings

### 4. Firebase UID/email provisioning and verification semantics are not frozen

The backend plans say the server selects/provisions a UID, mints a custom token, and later requires the Firebase bearer to match exact UID/email ([backend phase-04:28](/Users/alexnguyen/Desktop/Nut/mealtrack_backend/plans/260802-0135-paid-web-magic-link-claim-entitlement-backend/phase-04-single-use-magic-link-exchange-and-firebase-identity.md:28), [backend phase-05:26](/Users/alexnguyen/Desktop/Nut/mealtrack_backend/plans/260802-0135-paid-web-magic-link-claim-entitlement-backend/phase-05-atomic-profile-plan-claim-and-revenuecat-outbox.md:26)). The existing Firebase service only gets/deletes/revokes users and has no create/update/custom-token policy ([firebase_auth_service.py:11](/Users/alexnguyen/Desktop/Nut/mealtrack_backend/src/infra/services/firebase_auth_service.py:11)). Existing local sync requires an email and provider in the request ([user_requests.py:14](/Users/alexnguyen/Desktop/Nut/mealtrack_backend/src/api/schemas/request/user_requests.py:14)), while bearer verification merely returns Firebase claims ([auth.py:96](/Users/alexnguyen/Desktop/Nut/mealtrack_backend/src/api/dependencies/auth.py:96)). The plans never freeze how a new Firebase record receives canonical email/email-verified state, how provider metadata is represented, or what happens for disabled/deleted/unverified/provider-linked records.

Impact: new custom-token users may have no trustworthy email claim for completion, or implementation may copy lead email into trusted claims without a defined verification transition. Existing Google/Apple collisions may accidentally become direct login rather than the locked explicit conflict path.

Required plan fix: add an explicit identity decision table before minting: no Firebase user, same-email email-provider user, linked Google, linked Apple, disabled, deleted, and ambiguous/multiple-provider cases. Freeze UID creation, email verification, provider value, allowed token claims, rollback/revocation for abandoned provisioning, and exact generic errors. Completion must compare normalized Firebase record data and reservation data, not client body claims.

### 5. RevenueCat purchase transfer from the web identity to Firebase UID has no executable provider contract

Web currently purchases under a generated RevenueCat anonymous ID ([web.ts:45](/Users/alexnguyen/Desktop/Nut/nutree_web_funnel/src/lib/revenuecat/web.ts:45)). Mobile `Purchases.logIn(uid)` only transfers/aliases the mobile SDK's current RevenueCat identity ([auth_repository.dart:383](/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/features/auth/data/repositories/auth_repository.dart:383)); it has no web lead/anonymous ID. The plan nevertheless assumes a backend “RevenueCat association outbox” followed by mobile login ([backend phase-05:40](/Users/alexnguyen/Desktop/Nut/mealtrack_backend/plans/260802-0135-paid-web-magic-link-claim-entitlement-backend/phase-05-atomic-profile-plan-claim-and-revenuecat-outbox.md:40), [mobile phase-05:31](/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/plans/260801-1137-firebase-email-link-claim-handoff-mobile/phase-05-plan-restoration-and-existing-revenuecat-refresh.md:31)). The current backend adapter exposes only subscriber GET/status operations, no association/transfer operation ([revenuecat_adapter.py:26](/Users/alexnguyen/Desktop/Nut/mealtrack_backend/src/infra/adapters/revenuecat_adapter.py:26), [revenuecat_adapter.py:31](/Users/alexnguyen/Desktop/Nut/mealtrack_backend/src/infra/adapters/revenuecat_adapter.py:31)). Backend premium enforcement then fetches RevenueCat by Firebase UID ([premium_check.py:62](/Users/alexnguyen/Desktop/Nut/mealtrack_backend/src/api/middleware/premium_check.py:62)).

Impact: payment may be correctly verified under a lead identity yet never become visible under the Firebase UID used by backend/mobile gates. A loosely implemented alias/transfer can also move an entitlement away from another legitimate source or attach it to the wrong Firebase user.

Required plan fix: name the exact supported RevenueCat API/SDK operation, source ID, target UID, transfer policy, idempotency key, expected webhook sequence, and rollback/refund behavior. Obtain staging proof before implementation approval. Tests must cover target UID already entitled, source already transferred, two targets racing, refund during transfer, alias propagation delay, and preserving another active `standard` source.

## Fact-check disposition

- Blocking factual mismatch: “current Paddle.js/customData” versus live RevenueCat Web SDK/random anonymous ID.
- Invalid cited path: backend phase 4 cites `src/infra/external/firebase/`; live Firebase auth code is under `src/infra/services/firebase_auth_service.py` and `src/api/dependencies/auth.py`.
- Plan approval recommendation: reject until all five contracts above are frozen consistently across web/backend/mobile fixtures and phase files.

## Unresolved questions

1. Which RevenueCat-supported identifier/transfer operation has been verified in the actual web project and staging environment?
2. Is retry UX allowed to trade response-loss recovery for strict one-shot magic exchange, or must a device-bound possession key be added?

**Status:** DONE
**Summary:** Completed hostile, source-verified review of all coordinated plan documents; found three Critical and two High blockers in payment correlation, replay safety, provisional identity recovery, Firebase provisioning, and RevenueCat transfer.
**Concerns/Blockers:** Plans should not proceed to implementation until the five cross-repo contracts are corrected and refrozen.
