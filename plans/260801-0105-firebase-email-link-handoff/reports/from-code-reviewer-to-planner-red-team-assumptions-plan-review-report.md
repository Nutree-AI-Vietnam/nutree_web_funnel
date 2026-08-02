# Red-Team Assumption and Scope Review

## Scope

- Reviewed the canonical handoff document and all phase documents in the web, backend, and mobile coordinated plans.
- Verified plan claims against current instantiation/state sites in all three repositories.
- Locked choices preserved: mobile-first DOB and one-click Firebase custom-token sign-in.
- Review is plan-only; no lint, build, or tests run.

## State/Lifetime Inventory

| State | Current instantiation | Lifetime/owner | Plan collision |
| --- | --- | --- | --- |
| Web RevenueCat customer | `configureAnonymousRevenueCat()` creates a generated anonymous ID on paywall initialization (`nutree_web_funnel/src/lib/revenuecat/web.ts:45-50`) | Paywall/page SDK instance | Planned durable `funnel_lead_id` correlation is absent. |
| Web onboarding/lead | Zustand `persist` writes `data`, TDEE, and raw lead email (`nutree_web_funnel/src/lib/quiz/store.ts:42-50,69-89`) | Browser localStorage | Plan replaces this with DOB plus safe lead projection; migration must bridge existing persisted state. |
| Native pending link | `DeepLinkService._pendingDeepLink` is one in-memory slot (`nutree_ai/lib/core/services/deep_link_service.dart:18-20,35-61`) | Mobile process, keep-alive provider | Proposed initial-link barrier and claim coordinator introduce additional owners unless explicitly unified. |
| Native auth routing | `AuthFlowNotifier` and its Firebase listener own auth transition/routing (`nutree_ai/lib/features/auth/application/providers/auth_flow_notifier.dart:31-44,171-219`) | Mobile process, keep-alive Riverpod state | `ClaimHandoffStage` is planned as a second state machine without a concrete interlock. |
| Backend transaction | Each command handler enters and commits its own `AsyncUnitOfWork` (`mealtrack_backend/src/app/handlers/command_handlers/sync_user_command_handler.py:29-35,95-96`; `save_user_onboarding_command_handler.py:34-49,174-176`) | Request/handler transaction | Planned atomic claim cannot compose these handlers as written. |

## Critical Findings

### 1. Payment-to-lead correlation is asserted as an existing seam, but no such seam exists

The web plan says Paddle.js already sends `funnel_lead_id` in `customData` and tells implementation to preserve that path (`phase-02-prepare-web-email-link-handoff.md:35-36,84-91`). Current checkout is RevenueCat Web, not a direct Paddle.js custom-data flow: it creates a new anonymous RevenueCat App User ID (`src/lib/revenuecat/web.ts:45-50`) and purchase sends only package, customer email, locale, and success-page behavior (`src/app/paywall/paywall-page-client.tsx:120-140`). There is no `funnel_lead_id` in either call. Current backend then acknowledges anonymous userless events without attaching them to anything (`mealtrack_backend/src/api/routes/v1/webhooks.py:121-131`), while lookup only searches RevenueCat identifiers against existing users/subscriptions (`mealtrack_backend/src/api/routes/v1/webhooks.py:187-225`).

Impact: a successful web payment cannot deterministically select a lead, freeze its snapshot, reach `payment_verified`, or enqueue the magic email. This blocks the entire flow before custom-token work matters.

Required plan correction: replace the false “preserve existing customData” premise with one verified RevenueCat Web contract. Specify exactly how the backend-issued lead UUID becomes the RevenueCat customer/app-user identifier or how a verified provider transaction maps to it; include the actual SDK call shape, persisted browser lifetime across refresh, sandbox webhook fixture, and replay rule. Also remove the contradictory instruction “do not add a RevenueCat browser SDK” because the current checkout already depends on `@revenuecat/purchases-js` (`src/lib/revenuecat/web.ts:1,46-50`).

### 2. The planned backend RevenueCat association outbox has no current provider operation to execute

Backend Phase 5 requires a post-commit “RevenueCat association” worker (`mealtrack_backend/plans/260802-0135-paid-web-magic-link-claim-entitlement-backend/phase-05-atomic-profile-plan-claim-and-revenuecat-outbox.md:30-34,40-50,59-61`). The current backend RevenueCat port/adapter is read-only: it uses API v1 and only fetches `/subscribers/{app_user_id}` (`mealtrack_backend/src/infra/adapters/revenuecat_adapter.py:19-31,41-60`). The existing mobile seam merely calls `Purchases.logIn(firebaseUid)` for the RevenueCat identity already present on that device (`nutree_ai/lib/features/subscriptions/data/datasources/revenuecat_service.dart:296-350`). It does not prove that a web purchase owned by a lead UUID or a different device's anonymous ID transfers to the Firebase UID.

Mobile Phase 5 compounds the assumption by saying to reuse the existing refresh but never invoke native restore (`phase-05-plan-restoration-and-existing-revenuecat-refresh.md:21-32`). The current `getSubscriptionStatusFresh()` explicitly calls `Purchases.restorePurchases()` unless `skipRestore` is set (`nutree_ai/lib/features/subscriptions/data/datasources/revenuecat_service.dart:407-420,453-475`), and `refreshAfterPurchase()` uses that default (`nutree_ai/lib/features/subscriptions/application/providers/subscription_state_provider.dart:176-200`).

Impact: claim completion may commit a profile permanently while `standard` never moves to the Firebase UID, leaving every buyer pending. A seemingly reused mobile refresh can also trigger the prohibited native-receipt restore path.

Required plan correction: name and verify the exact RevenueCat API/SDK operation that transfers or aliases the web customer to Firebase UID, its credentials/API version/idempotency and conflict semantics, and a staging proof that `GET subscriber(firebaseUid)` returns active `standard`. If association must occur on mobile, model the lead/web customer identifier required by that operation without exposing it as access authority. Add a dedicated no-restore CustomerInfo refresh method; do not route this flow through `getSubscriptionStatusFresh()` as currently implemented.

## High Findings

### 3. Process death after Firebase custom sign-in but before completion is not recoverable under the stated credential rules

The mobile plan keeps `exchange_token` only in memory (`phase-03-firebase-email-link-authentication.md:26-33`) and completion requires that token (`phase-04-claim-recovery-user-journey.md:23-26`). On restart, authenticated recovery is defined only for committed result/safe pending state (`mealtrack_backend/plans/260802-0135-paid-web-magic-link-claim-entitlement-backend/phase-05-atomic-profile-plan-claim-and-revenuecat-outbox.md:35-36`), and mobile success explicitly covers restart only after a committed claim (`phase-04-claim-recovery-user-journey.md:32-35,66-76`).

Failure window: exchange succeeds, `signInWithCustomToken` persists the Firebase session, the process dies before `/claims/complete`, and the in-memory exchange token disappears. The claim is uncommitted, so recovery has no committed result to return; the reservation can also reject immediate re-exchange. Current native auth boot will see a Firebase user and begin normal onboarding validation.

Required plan correction: add an authenticated, UID-bound recovery rule for a live uncompleted reservation, or explicitly allow fenced re-exchange/reissue from the same magic generation after process death. Freeze reservation TTL, same-device/other-device behavior, and the one recommended action before claiming process-death coverage. No bearer needs durable device storage.

### 4. The plan adds a second mobile state machine without assigning authority over existing auth/link/router state

Current link state is a single process-memory slot in `DeepLinkService` (`nutree_ai/lib/core/services/deep_link_service.dart:18-20,35-69`), instantiated as a keep-alive provider that waits on `authFlowProvider` (`nutree_ai/lib/core/di/providers/routing_providers.dart:66-92`). Independently, Firebase `authStateChanges` triggers `_validateAndGetState()` and downstream routing as soon as custom sign-in publishes a user (`nutree_ai/lib/features/auth/application/providers/auth_flow_notifier.dart:171-219`). The plan says to create a new claim coordinator/stage and merely “ensure auth listeners cannot route” (`phase-03-firebase-email-link-authentication.md:43-58`; `phase-04-claim-recovery-user-journey.md:44-56`). It never defines which provider is authoritative or how the existing listener is suppressed before `signInWithCustomToken` fires.

Impact: production timing can run normal backend onboarding checks, subscription routing, or `/users/sync` between Firebase sign-in and atomic claim completion, causing the exact onboarding/paywall flash and pre-completion user creation the plan forbids.

Required plan correction: freeze one process-lifetime owner and explicit transitions. The claim coordinator must acquire auth/router ownership before custom sign-in, expose that ownership to `AuthFlowNotifier` and `AppRouterRedirect`, suppress normal post-auth work, and release only after terminal completion/cancel with stale-result fencing. Define how cold-link initialization and the current `_pendingDeepLink` slot hand off exactly once.

### 5. “Reuse current commands in one UoW” is not compatible with their actual transaction ownership

Backend Phase 5 says one transaction owns all effects and lists `SyncUserCommand` plus `SaveUserOnboardingCommand` as reusable seams (`phase-05-atomic-profile-plan-claim-and-revenuecat-outbox.md:20-31,46-58`). Both handlers enter their supplied/default UoW and call `commit()` internally (`mealtrack_backend/src/app/handlers/command_handlers/sync_user_command_handler.py:29-35,95-96`; `mealtrack_backend/src/app/handlers/command_handlers/save_user_onboarding_command_handler.py:34-49,174-176`). `AsyncUnitOfWork` also acquires a non-reentrant instance lock on entry (`mealtrack_backend/src/infra/database/uow_async.py:97-110`). Reusing one UoW through these handlers either commits partial state early or deadlocks on nested entry.

Impact: injected failures can leave a user/profile committed while claim consumption or outbox insertion rolls back, violating the central atomicity promise and enabling duplicate/conflicting recovery.

Required plan correction: explicitly prohibit invoking these command handlers from the claim transaction. Extract/use non-committing domain operations or repository-level composition, with the claim orchestrator as the sole UoW context and sole commit owner. Keep cache invalidation and all event/external effects post-commit/outboxed, then test failure after every flush boundary.

## Required Plan Actions

1. Freeze a real, sandbox-evidenced RevenueCat lead-correlation contract.
2. Prove the web-customer-to-Firebase-UID entitlement association operation before implementation.
3. Add uncommitted reservation recovery for the post-auth process-death window.
4. Assign one mobile owner for link, auth-listener suppression, completion, and routing.
5. Replace handler reuse with explicit non-committing atomic composition.

## Unresolved Questions

- Which exact RevenueCat identifier is present on the verified web webhook, and which supported operation moves its `standard` entitlement to the Firebase UID?
- Can an authenticated UID recover/reissue its live exchange reservation after process death without reopening the email?

**Status:** DONE
**Summary:** Five Critical/High plan blockers verified across all three repositories; report saved without editing plan documents.
**Concerns/Blockers:** RevenueCat correlation/association and uncommitted process-death recovery must be refrozen before implementation.
