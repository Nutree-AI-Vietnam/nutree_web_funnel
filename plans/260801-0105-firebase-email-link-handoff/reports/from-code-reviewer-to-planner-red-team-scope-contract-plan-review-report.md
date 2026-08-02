# Red-Team Scope and Contract Plan Review

## Scope

- Reviewed the coordinated web/backend/mobile plans and canonical handoff document.
- Verified named interfaces and current consumers with `rg` and source reads.
- Plan review only; no lint, builds, tests, or plan edits.

## Critical Findings

### 1. The payment-correlation contract targets a nonexistent Paddle.js interface

**Contract trace:** web checkout caller -> RevenueCat SDK configuration -> purchase arguments -> webhook identity -> backend lead lookup.

The live web caller imports `@revenuecat/purchases-js`, generates a random anonymous RevenueCat App User ID, and purchases with package/email/locale only (`src/lib/revenuecat/web.ts:1,45-50`; `src/app/paywall/paywall-page-client.tsx:120-147`). No runtime `funnel_lead_id` or `customData` producer exists under `src/`.

Web phase 2 instead claims Paddle.js already sends `funnel_lead_id`, tells implementers to preserve its `customData`, and says not to add a RevenueCat browser SDK (`phase-02-prepare-web-email-link-handoff.md:31-36,84-89,164-165`). Backend fulfillment cannot execute without that value (`mealtrack_backend/.../phase-03-verified-payment-reconciliation-and-claim-email.md:26-30`), and the canonical flow assumes it exists (`docs/firebase-email-link-identity-handoff.md:34-38`).

**Impact:** The backend has no deterministic paid-subscriber-to-lead join. Implementers following the plan will either strand paid users or invent an unreviewed provider change.

**Required plan correction:** Replace all Paddle/custom-data assumptions with one verified RevenueCat Web SDK correlation contract. Specify exactly whether the lead UUID is the initial App User ID or a supported subscriber attribute, and prove it survives purchase, webhook, and fetched-subscriber lookup. This is a contract-freeze blocker.

### 2. Reusing `SyncUserCommand` violates both atomic completion and the locked no-silent-merge rule

**Contract trace:** `/claims/complete` orchestrator -> proposed `SyncUserCommand` reuse -> handler opens its own UoW -> email fallback mutates identity -> handler commits -> later profile/claim work can fail.

Backend phase 5 explicitly says to reuse `SyncUserCommand` and `SaveUserOnboardingCommand` inside one atomic claim UoW (`phase-05-atomic-profile-plan-claim-and-revenuecat-outbox.md:20-34,46-61`). The actual `SyncUserCommandHandler` creates/enters its own UoW and explicitly commits (`src/app/handlers/command_handlers/sync_user_command_handler.py:26-35,95-97`). Worse, when UID lookup misses, it looks up by email and silently replaces the existing Firebase UID (`:42-50`). The normal route sends this handler through the global event bus, which offers no caller-owned transaction injection (`src/api/routes/v1/users.py:98-120`; handler registration constructs `SyncUserCommandHandler()` in `src/api/dependencies/event_bus.py:662`).

`SaveUserOnboardingCommandHandler` likewise creates and enters its own UoW (`src/app/handlers/command_handlers/save_user_onboarding_command_handler.py:26-49`).

**Impact:** A later profile/plan/claim failure cannot roll back the already-committed user, and an email collision can silently overwrite an existing Google/Apple UID—the exact behavior the locked contract forbids.

**Required plan correction:** Do not invoke these commands/handlers from claim completion. Extract transaction-neutral domain operations that accept the caller-owned UoW, and define a claim-specific identity policy that never executes the email fallback. Add the existing handlers to regression-only scope, not the completion composition path.

## High Findings

### 3. The plans leave two obsolete paid handoff state machines wired into global mobile routing

**Consumer trace:** `DeepLinkService` -> Firebase Email Link callback / RevenueCat redemption callback -> two coordinators -> GoRouter refresh + splash UI + four auth-flow retries.

Current routing installs both legacy coordinators, includes both in `refreshListenable`, and dispatches links to both (`lib/core/di/providers/routing_providers.dart:31-57,66-82`). The router reads both to override navigation (`lib/features/auth/presentation/router/app_router_redirect.dart:58-67`), and splash still renders manual email entry or RevenueCat-redemption retry (`lib/features/auth/presentation/screens/splash_screen.dart:14-63`). `AuthFlowNotifier` invokes the old redemption coordinator at four separate lifecycle points (`lib/features/auth/application/providers/auth_flow_notifier.dart:84-88,117-120,214-218,443-446`). The email coordinator still uses `isSignInWithEmailLink` and `signInWithEmailLink` (`lib/features/auth/application/services/firebase_email_link_coordinator.dart:18-45`); the redemption coordinator still parses and redeems RevenueCat URLs independently (`web_purchase_redemption_coordinator.dart:16-18,52-97`).

Mobile phases vaguely say “modify/replace paid behavior” but never provide a remove/retain table for these providers, callbacks, listeners, splash branches, and auth-flow calls (`phase-03-firebase-email-link-authentication.md:43-58`; `phase-04-claim-recovery-user-journey.md:44-57`).

**Impact:** A partial implementation can leave three competing paid flows—Firebase Email Link, RevenueCat redemption, and backend magic/custom-token claim—with stale redirects or a second entitlement action.

**Required plan correction:** Add an explicit consumer migration table. For each legacy coordinator and every caller above, state delete, retain for a separate non-paid flow, or replace with the new claim coordinator. One paid link must have exactly one dispatcher and one state owner.

### 4. “Mobile is canonical DOB” does not identify the actual age-based mobile consumers that must change

**Consumer trace:** restored claim snapshot -> `OnboardingData` -> validity/resume/TDEE/macro consumers -> routing and read models.

`OnboardingData` contains DOB but still treats `age` as required for validity and resume (`lib/features/onboarding/domain/entities/onboarding_data.dart:29-39,140-151,160-177`). TDEE and macro providers dereference `data.age!` in several paths (`lib/features/onboarding/application/providers/combined_tdee_provider.dart:157,236,288`; `lib/features/onboarding/application/providers/macro_targets_provider.dart:13-25`). Mobile also names experience as JSON `experience_level` (`onboarding_data.dart:52-54`), while the backend completion request expects `training_level` (`src/api/schemas/request/onboarding_requests.py:44-47`) and the mobile API mapper translates it separately.

The mobile restoration phase names broad repositories/providers but only says to restore DOB/derived-age semantics; it does not list these concrete consumers or freeze whether age is persisted, derived on read, or supplied only in the backend result (`phase-05-plan-restoration-and-existing-revenuecat-refresh.md:25-35,44-57`).

**Impact:** Implementers can hydrate exact DOB yet still fail `isValid`, resume at the age screen, crash an age dereference, or serialize the wrong training-level field. That breaks the promised onboarding skip without changing the locked DOB decision.

**Required plan correction:** Freeze one mobile `ClaimProfileSnapshot -> OnboardingData` mapping including derived-age lifetime, then enumerate and update every age-based consumer and the `experience_level`/`training_level` boundary. Do not expand web fields beyond what this verified mapper actually needs.

### 5. Web phase 2 contains stale remediation work that should be cut from the MVP

**Contract trace:** persisted Zustand input -> migration allowlist -> rehydrated state -> vendor-visible state.

The plan claims current storage rehydrates legacy tokens, requires a generic recursive “secret-shaped” scrub, and schedules deletion of `src/lib/handoff/links.ts` plus its test (`phase-02-prepare-web-email-link-handoff.md:65-67,148-176`). In current code, persistence is already allowlisted to data/locale/TDEE/lead email, migration reconstructs only those fields, and checkout/claim properties are dropped (`src/lib/quiz/store.ts:42-66,83-88`). Existing tests explicitly prove legacy `claim_token`, `claimToken`, purchased state, and checkout data are not restored (`src/lib/quiz/store.test.ts:60-110`). The named `src/lib/handoff/links.ts` and test do not exist; `src/lib/handoff/` is empty.

**Impact:** The phase spends scarce MVP time implementing a heuristic recursive scrub that can delete legitimate future fields, while its red-test premise and deletion list are stale. This obscures the actual necessary store change: replace persisted raw email with safe lead projection and add DOB migration.

**Required MVP cut:** Keep the existing explicit allowlist approach. Change only the typed persisted projection/migration required for DOB and `{lead_id, masked_email, safe_status}`; add focused regression cases for known secret keys. Remove generic secret-name recursion and nonexistent link-file deletion from scope.

## Required Contract Refreeze

1. Verify the real RevenueCat lead-correlation field end to end.
2. Replace CQRS command reuse with transaction-neutral claim operations.
3. Publish a complete mobile legacy-consumer migration table.
4. Freeze the DOB/derived-age and training-level wire mappings.
5. Cut already-solved/nonexistent web remediation from the MVP.

## Unresolved Questions

- Which RevenueCat Web SDK identifier will equal or carry `funnel_lead_id`?
- Is the old RevenueCat redemption flow deleted entirely for paid web claims or retained for another product flow?
- Is derived age persisted in the mobile read model, recalculated from DOB, or returned only in `claim_result_v1`?

**Status:** DONE_WITH_CONCERNS
**Summary:** Five contract/scope defects found; two block implementation and three require explicit consumer migration or MVP cuts.
**Concerns/Blockers:** Payment correlation and claimed CQRS reuse do not match current callable interfaces.
