# Red-team plan review: Assumption Destroyer (Contract Verifier + Fact Checker)

Plan: `260916-2306-rc-hash-silent-login`
Role: hostile contract/fact check against `mealtrack_backend`, `nutree_ai`, `nutree_web_funnel`
Verification: Standard. No lint/build/test execution. Grep-verified only.

Verdict: **Do not cook as written.** Eight plan assumptions fail against live callers, JWT/preflight contracts, Dio interceptors, hash canonicalizers, kill-switch semantics, and MealTrack `User.email` uniqueness.

---

## Finding 1: Custom-token ID tokens are assumed to carry `email` + `email_verified`; preflight will 403 without them

- **Severity:** Critical
- **Location:** Phase 1, section "Requirements" / "Risk Assessment"; Phase 3, section "Tests After"
- **Flaw:** Preflight and finalize do not read Firebase Admin user records. They require `token["email"]` to be a string and `token["email_verified"]` to be truthy on the **verified JWT**. Phase 1 explicitly says "No extra claims required" and defers proof to Phase 3 SIT. Unit tests will stuff those keys into a fake dict; that does not prove Identity Toolkit puts them on a custom-token ID token. `update_user` after the fact does not write reserved JWT claims.
- **Failure scenario:** Flag on, session 200, `signInWithCustomToken` succeeds, `getIdToken(true)` returns a JWT with `firebase.sign_in_provider=custom` and missing `email` / `email_verified`. Preflight returns 403 "Verified email required". User is now signed in (so Phase 2 will not fall back to the email overlay). Redeem never runs. SIT in Phase 3 is too late; the producer path is already shipped to the app.
- **Evidence:**
  - `mealtrack_backend/src/api/routes/v1/web_funnel.py:320-329` (preflight: `uid`, `email`, `email_verified`, provider)
  - `mealtrack_backend/src/api/routes/v1/web_funnel.py:361-370` (finalize: same JWT fields)
  - `mealtrack_backend/src/infra/services/web_funnel_firebase_identity.py:54-60` (existing mint: extra claims are `wf_reservation` / `wf_generation` only — never `email`)
  - `plans/260916-2306-rc-hash-silent-login/phase-01-backend-session-and-identity.md:73-74` ("No extra claims required")
  - `plans/260916-2306-rc-hash-silent-login/phase-01-backend-session-and-identity.md:111-112` (admits JWT email is unproven; "fix" is `update_user`)
  - `plans/260916-2306-rc-hash-silent-login/phase-03-contracts-flags-and-sit.md:62-69` (SIT is the first real assertion; "if ID token lacks email: stop")
- **Suggested fix:** Make Phase 1's contract the JWT, not SIT theater. Either (a) preflight/finalize, when `sign_in_provider==custom`, load `auth.get_user(uid)` and require `record.email` / `record.email_verified` rather than JWT claims, or (b) add a failing integration test against real Firebase Auth that decodes a custom-token ID token **before** any mobile work. Do not claim `update_user` as a fallback; reserved claims are not additional-claims.

---

## Finding 2: `create_user` + custom token vs MealTrack `User.email` unique is a 409, not a silent attach

- **Severity:** Critical
- **Location:** Phase 1, section "Requirements" ("Missing → `create_user` … then mint"); Phase 3 SIT "New email" / "Existing Google"
- **Flaw:** The plan treats Firebase `get_user_by_email` miss as "new user." MealTrack already refuses to bind a new Firebase UID to an email that owns another row. Finalize raises `EXISTING_ACCOUNT_REQUIRES_SIGN_IN`. Sync does the same via `FirebaseIdentityConflictError`. Phase 1 never mentions `finalize_redemption`'s `email_owner` check, `POST /v1/users/sync`, or `EmailAlreadyExistsError` on `create_user`. Legacy `resolve()` only catches `UidAlreadyExistsError` for deterministic `wf_` UIDs.
- **Failure scenario:** Checkout email exists on MealTrack (`users.email` unique) under Google UID G, but Firebase `get_user_by_email` misses (deleted Auth user, case drift, leftover `wf_` vs live Google split). Session `create_user` mints UID N. App signs in as N. Preflight binds N. Finalize sees `email_owner.firebase_uid == G != N` and 409s. Coordinator maps that to `ExistingAccountSignInRequired`. Silent login consumed a Firebase user and still dumps the buyer into "sign in to the existing account" — which they cannot do with the custom session they just got. Same collision if `authStateChanges` later hits `/v1/users/sync` with UID N and email X.
- **Evidence:**
  - `mealtrack_backend/src/infra/database/models/user/user.py:24` (`email = Column(..., unique=True, nullable=False)`)
  - `mealtrack_backend/src/infra/services/web_funnel_redemption_completion.py:175-181` (email owner UID mismatch → `existing_account_sign_in_required`)
  - `mealtrack_backend/src/app/handlers/command_handlers/sync_user_command_handler.py:47-52` (new UID + existing email → `FirebaseIdentityConflictError`)
  - `mealtrack_backend/src/api/routes/v1/users.py:132-137` (sync maps that to HTTP 409)
  - `mealtrack_backend/src/infra/repositories/user_repository_async.py:118-128` (unique email/uid IntegrityError → identity conflict)
  - `mealtrack_backend/src/infra/services/web_funnel_firebase_identity.py:32-40` (`create_user` only handles `UidAlreadyExistsError`, not `EmailAlreadyExistsError`)
  - `nutree_ai/lib/features/auth/application/providers/web_purchase_redemption_provider.dart:124-128` (409 `EXISTING_ACCOUNT_REQUIRES_SIGN_IN` → overlay, not retry as G)
- **Suggested fix:** Session identity must be: get_user_by_email → if miss, **also** refuse when MealTrack `find_by_email(lead.email)` exists (same 404 class as unverified). Catch `EmailAlreadyExistsError` and re-fetch. Never `create_user` for an email that already owns a Nutree row. Add an explicit test for "Firebase miss + MealTrack hit → 404, no mint."

---

## Finding 3: `createCustomToken` on an existing Google UID is the easy case; `create_user` / leftover `wf_` users break later Google sign-in

- **Severity:** High
- **Location:** Phase 1, section "Requirements" ("mint that UID (any provider)"); Phase 3 SIT "Existing Google same email"
- **Flaw:** The plan equates "mint custom token for Google UID G" (probably keeps `providerData` google.com) with "any provider including a newly created email-only user." `create_user(email=..., email_verified=True)` creates a **password** provider user with no password. Later `signInWithGoogle` for that email is `account-exists-with-different-credential`. Worse: `get_user_by_email` will mint leftover legacy `wf_` provisionals that `resolve()` created specifically because Google/Apple must not attach. The new helper inverts that isolation. SIT only checks "existing Google UID still works," not "new silent-login email can Google later" and not "do not mint `wf_`."
- **Failure scenario:** New checkout email, no Firebase user, session `create_user` → UID N (password provider). Buyer finishes redeem. Weeks later they tap Google with the same Gmail. Firebase refuses or creates a second account depending on project settings. Purchase sits on N; Google session is not N. Separately: a leftover `wf_<hash>` user for that email is found by `get_user_by_email` and minted, despite Phase 1's "Do not bind `wf_` UIDs for new users."
- **Evidence:**
  - `mealtrack_backend/src/infra/services/web_funnel_firebase_identity.py:28-45` (`resolve()`: create `wf_` UID; reject any provider other than `password`)
  - `mealtrack_backend/src/infra/services/web_funnel_firebase_identity.py:25-26` (`wf_` prefix)
  - `plans/260916-2306-rc-hash-silent-login/phase-01-backend-session-and-identity.md:27` (new helper: mint **any** provider, including found `wf_` / password)
  - `plans/260916-2306-rc-hash-silent-login/phase-01-backend-session-and-identity.md:113` ("Do not bind `wf_` UIDs for new users" — only on create, not on lookup)
  - `mealtrack_backend/src/infra/services/web_funnel_redemption_completion.py:62-67` (`custom` is not apple/password → stored as `AuthProvider.GOOGLE`)
  - `nutree_ai/lib/features/auth/data/repositories/auth_helpers.dart:59-67` (`determineAuthProvider`: not Apple/email-link → `"google"`)
  - `nutree_ai/lib/core/models/auth_provider.dart:4-17` (enum has no `custom`; unknown → google)
- **Suggested fix:** Existing Google/Apple: mint that UID only if `provider_data` contains `google.com` / `apple.com` / `password` **and** UID does not start with `wf_`. New emails: do not `create_user` unless product accepts a password-provider trap; otherwise keep passwordless for true new emails. Add a unit test: found `wf_` user → 404, not mint. Add SIT: new-email silent login, then Google with same address, assert same UID — or document that Google is permanently broken for that inbox.

---

## Finding 4: Session POST is not unauthenticated on the client; interceptors attach anonymous (and 401 signs the device out)

- **Severity:** High
- **Location:** Phase 2, section "Requirements" / "Refactor" / "Risk Assessment"
- **Flaw:** Phase 2 says "Dio POST, no Firebase bearer on session" and "ensure 401 interceptor does not attach/refresh." Production wiring uses `dioProvider`. `AuthInterceptor.onRequest` attaches `Authorization: Bearer` whenever `FirebaseAuth.currentUser != null`. Coordinator `currentUserId` treats **anonymous** as signed-out (`null`) and **will** call session. There is no `options.extra` skip flag anywhere in `lib/core/network`. POSTs are `neverAutoRetry`; a 401 still calls `onAuthFailure` → `authFlow.signOut()`. Plan's "anonymous/missing is OK" is false: anonymous is another UID, and a 401 is a global logout.
- **Failure scenario:** Guest/anonymous Firebase user opens the RC link (web checkout is anonymous RC). Coordinator thinks signed-out, POSTs `/redemptions/session` with the **anonymous** ID token. If the route stays Depends-free, the header is ignored (lucky). If anyone later adds `Depends(verify_firebase_token)` or the anonymous token is expired/revoked, 401 → `signOut()` while exchange is in flight. CancelOnLogout then cancels in-flight requests. Fallback overlay may never run; the device is signed out mid-redeem.
- **Evidence:**
  - `nutree_ai/lib/features/auth/application/providers/web_purchase_redemption_provider.dart:25-28` (anonymous ⇒ `currentUserId == null` ⇒ session path)
  - `nutree_ai/lib/features/auth/application/providers/web_purchase_redemption_provider.dart:30-44` (preflight already uses the **same** `dioProvider`)
  - `nutree_ai/lib/core/network/interceptors/auth_interceptor.dart:33-54` (always attach bearer if `currentUser != null`)
  - `nutree_ai/lib/core/network/interceptors/auth_interceptor.dart:65-78` (401 + no user → `_triggerAuthFailure`)
  - `nutree_ai/lib/core/network/retry_policy.dart:71-77` (POST is never replayed)
  - `nutree_ai/lib/main.dart:416-428` (`onAuthFailure` → `signOut()`)
  - `nutree_ai/lib/core/network/interceptors/cancel_on_logout_interceptor.dart:10-24` (sign-out cancels all in-flight Dio)
  - Phase 2 risk: `phase-02-mobile-signed-out-silent-login.md:103` ("do not send another user's token on a signed-out device")
- **Suggested fix:** Do not use `dioProvider` for session. Use a bare Dio (no AuthInterceptor) or an explicit `options.extra['skipAuth']=true` that `AuthInterceptor` honors, with a test that anonymous `currentUser` produces **zero** `Authorization` header. Map 401/403 on session to overlay **without** calling `onAuthFailure`. Count interceptor tests: `auth_interceptor_test.dart` has no path exception.

---

## Finding 5: Signed-in skip exists in production; it is not tested, and the contract still requires the email prompt

- **Severity:** High
- **Location:** Phase 2, section "Tests Before" item 4; Phase 3, section "Refactor" item 1; parent plan "Dependencies"
- **Flaw:** Parent plan: "Signed-in non-anonymous UID already skips email. This plan is signed-out only." Phase 2 tells the implementer to add characterization "if missing" or "name them in the PR." Grep of the coordinator test file: every `acceptLink` that leads to activation first sets `currentUserId` to **null**, then `signInWithGoogle` / `continueWithCurrentAccount`. The restore test with `isSignedIn: () => true` asserts `restoredEvents` is **empty** (does **not** start activation). `docs/contracts.md` still describes `home_pending_auth` as a **required email prompt**. Phase 3 then plans to document "signed-in skip already true" without a test that locks it.
- **Failure scenario:** Implementer follows Tests Before item 1 ("signed-out → `isAwaitingAuthentication`") and Phase 2's new signed-out exchange branch. They never add the missing signed-in characterization. A regression in `_acceptParsedLink` (`_initialUserId != null` → `_startActivation`) ships. Signed-in buyers sit on email overlay; or the new exchange is accidentally called for signed-in users and switches accounts — exactly what Phase 2 claims it will never do. Gate does not catch it.
- **Evidence:**
  - `nutree_ai/lib/features/auth/application/services/web_purchase_redemption_coordinator.dart:317-335` (skip **does** exist: `_initialUserId != null` → `unawaited(_startActivation)`)
  - `nutree_ai/test/features/auth/application/services/web_purchase_redemption_coordinator_test.dart:117-123` (signed-out `acceptLink` → `isAwaitingAuthentication`)
  - `nutree_ai/test/features/auth/application/services/web_purchase_redemption_coordinator_test.dart:617-619` (`acceptLink` then `signedIn = true` then `continueWithCurrentAccount` — not skip-on-accept)
  - `nutree_ai/test/features/auth/application/services/web_purchase_redemption_coordinator_test.dart:725-727` (same pattern)
  - `nutree_ai/test/features/auth/application/services/web_purchase_redemption_coordinator_test.dart:785-793` (`isSignedIn: () => true` restore → **no** activation events)
  - `nutree_ai/docs/contracts.md:100` (`home_pending_auth` = "required email prompt")
  - `plans/260916-2306-rc-hash-silent-login/plan.md:46` ("Signed-in non-anonymous UID already skips email")
- **Suggested fix:** Tests Before is not optional. Add `acceptLink` with `currentUserId` already non-null: `isAwaitingAuthentication == false`, `preflight` then `align`, **exchange never called**. Name that test in Phase 2. Do not write "already true" into contracts until that test exists. Gate must include it.

---

## Finding 6: Web vs mobile hash canonicalization is not identical; session 404 is indistinguishable from "flag off"

- **Severity:** High
- **Location:** Parent overview ("App already SHA-256s the canonical URL"); Phase 1 "same schema as preflight"; Phase 2 architecture
- **Flaw:** Two different canonicalizers, no shared golden. Web returns the **raw** nested query string (or the original redeem URL **unmodified**). Dart parses then **re-serializes** via `Uri.toString()`. JS `URL.canParse` ≠ Dart `Uri.tryParse` on custom-scheme RC links. Neither repo tests the other's digest. Phase 1/2 add a new **unauthenticated** lookup keyed only on that digest. A mismatch already broke preflight for some clients; now it also looks like the kill switch (session 404 → email overlay), then preflight 404s too.
- **Failure scenario:** Web correlates SHA-256 of RC's inner `rc-490b49db28://redeem_web_purchase?redemption_token=…` as returned by `searchParams.get('url')`. iOS delivers a `Uri` whose `toString()` percent-encodes differently or treats `redeem_web_purchase` as host vs path. Session 404. App shows passwordless overlay (plan calls this success/fallback). Buyer types email, preflight misses the same hash, redeem never eligible. SIT "unknown hash → overlay" passes while paid recovery is dead.
- **Evidence:**
  - `nutree_web_funnel/src/lib/revenuecat/redemption-handoff.ts:66-77` (nested raw string or original `redeemUrl`; Web Crypto SHA-256)
  - `nutree_web_funnel/src/lib/revenuecat/redemption-handoff.test.ts:20-32` (HTTPS unwrap + one HTTPS golden; **no** Dart vector)
  - `nutree_ai/lib/features/auth/application/services/web_purchase_redemption_coordinator.dart:843-845` (`sha256(utf8.encode(canonicalRedemptionLinkForHash(uri)))`)
  - `nutree_ai/lib/features/auth/application/services/web_purchase_redemption_coordinator.dart:995-998` (nested `Uri.tryParse` then `.toString()`, else `uri.toString()`)
  - `nutree_ai/test/features/auth/application/services/web_purchase_redemption_coordinator_test.dart:11-22` (unwrap equality only; **no** hex golden, **no** web parity)
  - `mealtrack_backend/src/api/routes/v1/web_funnel.py:53-54` (server hashes opaque strings it is given; does not canonicalize URLs)
- **Suggested fix:** Add a cross-repo fixture (inner RC scheme, HTTPS redirect, encoded token, trailing slash) with identical hex on TS and Dart **before** session work. Hash the canonical **string**, not `Uri.toString()`. Until that test exists, do not advertise session 404 as a clean fallback.

---

## Finding 7: Backend flag is not a kill switch without an app update; signed-in custom sessions cannot fall back

- **Severity:** High
- **Location:** Phase 3, section "Architecture" ("Kill switch = backend flag … No mobile remote-config")
- **Flaw:** After the app that calls session is shipped, `WEB_FUNNEL_SILENT_LOGIN_ENABLED=false` only 404s **session** and 403s **custom** on preflight. Phase 2: if `currentUserId() != null`, exchange is **never** called and `_startActivation` runs. A user already signed in via custom token stays signed in. Preflight then 403s because `custom` is not allowlisted. Overlay does not show. Flag off also does **not** stop the client from POSTing hashes to an unauthenticated route (rate-limit 5/min is the only brake). You cannot unship that POST.
- **Failure scenario:** Staging/prod flag flipped on for one buyer, then off as "kill switch." That buyer (or anyone who completed session before the flip) is signed in with `sign_in_provider=custom`. Next cold start / retry: signed-in skip → preflight 403 → identity/recoverable failure, not passwordless. New taps still POST the hash. Passwordless SIT for Phase 8 is poisoned for any device that already silent-logged-in.
- **Evidence:**
  - `plans/260916-2306-rc-hash-silent-login/phase-03-contracts-flags-and-sit.md:37` (kill switch = session 404 + custom 403; no remote config)
  - `plans/260916-2306-rc-hash-silent-login/phase-02-mobile-signed-out-silent-login.md:27` (non-null uid → never exchange)
  - `nutree_ai/lib/features/auth/application/services/web_purchase_redemption_coordinator.dart:332-335` (signed-in → `_startActivation`, no overlay)
  - `mealtrack_backend/src/api/routes/v1/web_funnel.py:107-110` (allowlist today: `google.com|apple.com|password` only; flag-off custom → 403)
  - `phase-01-backend-session-and-identity.md:28` (custom allowed iff flag on; still requires JWT email)
- **Suggested fix:** Kill switch must be client-visible: if session 404 **or** preflight 403-with-custom, sign out the custom session and force `emailEntry`. Gate custom sign-in on a remote config **in addition to** the backend flag, or keep the new POST behind an app version that is not shipped until flag strategy includes "sign out custom and restore overlay." Document that flag-off does not retract minted Firebase users.

---

## Finding 8: Coordinator constructor "optional callbacks, tests stay valid" undercounts callers and omits them from the gate

- **Severity:** High
- **Location:** Phase 2, section "Related Code Files" / "Refactor" item 1 / "Regression Gate"
- **Flaw:** Plan lists three files to modify and claims default-null callbacks keep existing tests valid. Grep finds **12** `WebPurchaseRedemptionCoordinator(` sites, not 3. Phase 2 regression gate runs only `web_purchase_redemption_coordinator_test.dart` and `revenuecat_redemption_scheme_test.dart`. It does not run router/welcome/activate-plan construction tests. Dart named optionals will compile, but any change to `_acceptParsedLink` signed-out timing (await exchange before first `notifyListeners`, `checkingAccount` vs `emailEntry`) breaks UI/router tests that the gate never runs. `_signInActive` is **not** set around raw `firebaseAuth.signInWithCustomToken`, so `authStateChanges` will re-validate during silent login (onboarding 404 → `onboarding` state) — none of those tests exist in the listed file.
- **Failure scenario:** Implementer adds the callbacks as planned, only re-runs the Phase 2 gate. `app_router_redirect_test` / `welcome_screen_test` / `activate_plan_screen_test` still construct coordinators at the old signature and assert email overlay on `acceptLink`. Exchange-before-first-frame (Phase 2 risk: overlay flash) changes `isAwaitingAuthentication` timing; redirect tests flake or lock users on the wrong shell. `signInWithCustomToken` fires `authStateChanges` (`_signInActive` still false) → `_fetchOnboardingStatus` 404 → `AuthFlowState.onboarding` **before** finalize writes `onboarding_completed=True`. Phase 3 SIT "onboarding not replayed" fails in production, green in the gate.
- **Evidence (all constructor call sites):**
  1. `nutree_ai/lib/features/auth/application/providers/web_purchase_redemption_provider.dart:17`
  2. `nutree_ai/test/features/auth/application/services/web_purchase_redemption_coordinator_test.dart:27`
  3. `nutree_ai/test/features/auth/application/services/web_purchase_redemption_coordinator_test.dart:69` (shared factory used by most tests)
  4. `nutree_ai/test/features/auth/application/services/web_purchase_redemption_coordinator_test.dart:285`
  5. `nutree_ai/test/features/auth/application/services/web_purchase_redemption_coordinator_test.dart:312`
  6. `nutree_ai/test/features/auth/application/services/web_purchase_redemption_coordinator_test.dart:592`
  7. `nutree_ai/test/features/auth/application/services/web_purchase_redemption_coordinator_test.dart:631`
  8. `nutree_ai/test/features/auth/application/services/web_purchase_redemption_coordinator_test.dart:700`
  9. `nutree_ai/test/features/auth/presentation/router/app_router_redirect_test.dart:548`
  10. `nutree_ai/test/features/auth/presentation/router/app_router_redirect_test.dart:607`
  11. `nutree_ai/test/features/auth/presentation/welcome_screen_test.dart:59`
  12. `nutree_ai/test/features/auth/presentation/screens/activate_plan_screen_test.dart:26`
  - `nutree_ai/lib/features/auth/application/providers/auth_flow_notifier.dart:187-188` (`_handleAuthStateEvent` returns immediately only if `_signInActive`)
  - `nutree_ai/lib/features/auth/application/providers/auth_flow_notifier.dart:436-442` (onboarding GET 404 → new user / onboarding)
  - `mealtrack_backend/src/infra/services/web_funnel_redemption_completion.py:195` (onboarding completed only at **finalize**)
  - Phase 2 gate: `phase-02-mobile-signed-out-silent-login.md:97` (two test files only)
- **Suggested fix:** List all 12 call sites in Phase 2. Expand the factory at `:69` with the new optional deps (default null). Regression gate **must** include `app_router_redirect_test.dart`, `welcome_screen_test.dart`, `activate_plan_screen_test.dart`. Wrap `signInWithCustomToken` in the same `_signInActive` / barrier path as Google/Apple (`auth_flow_notifier.dart:524`), or route it through `AuthRepository` so sync/onboarding cannot race finalize.

---

## Finding 9: `signInWithCustomToken` is not on the production path today; provider wiring will race auth + onboarding

- **Severity:** Medium
- **Location:** Phase 2, section "Success Criteria" ("No `signInWithCustomToken` in production path except this branch"); parent plan "Dependencies"
- **Flaw:** Parent plan claims Flutter already has `signInWithCustomToken`. True on the plugin; **false** as an app production path. Grep of `nutree_ai/lib` finds **zero** `signInWithCustomToken` calls (mocks/docs only). Phase 2 will add a raw Firebase call in the provider, not `AuthFlowNotifier.signInWithGoogle` / `signInWithEmailLink` (those set `_signInActive` and call `_syncUserToBackend`). Silent login therefore skips user-sync and unblocks the auth listener. Combined with Finding 2 (unique email) and Finding 1 (JWT email), this is an integration assumption presented as a one-line wiring task.
- **Failure scenario:** Session 200, custom sign-in, listener runs `_validateAndGetState` while `_runActivation` is in `firebase_identity` / preflight. Onboarding 404 sets `AuthFlowState.onboarding`. Router leaves Home shell. Finalize later sets `onboarding_completed=True`, but the listener already routed the user into onboarding. SIT "onboarding not replayed" is a manual hope, not a test.
- **Evidence:**
  - `plans/reports/260916-2259-rc-hash-silent-login.md:148` (scout: `signInWithCustomToken` not in `lib/`)
  - `nutree_ai/lib/features/auth/application/providers/web_purchase_redemption_provider.dart` (no custom-token API; only Dio preflight/finalize)
  - `nutree_ai/lib/features/auth/data/repositories/auth_repository.dart:86-98` and `:627` (email-link **does** sync)
  - `nutree_ai/lib/features/auth/application/providers/auth_flow_notifier.dart:466-476` (email-link goes through repository)
  - `nutree_ai/lib/features/auth/application/providers/auth_flow_notifier.dart:58,187-188,524` (`_signInActive` only around those flows)
- **Suggested fix:** Treat custom sign-in as a first-class auth flow: set `_signInActive`, wait on `ClaimFlowBarrier`, do **not** sync until after finalize (or sync with the knowledge that unique-email 409 must not fire). Add a provider/notifier test; coordinator fakes will not catch this.

---

## Assumption map (requested destroy list)

| # | Assumption | Result |
|---|---|---|
| 1 | Custom-token ID tokens include `email` + `email_verified` | **Destroyed.** Preflight/finalize require JWT fields; mint adds no claims; proof deferred to SIT. |
| 2 | `createCustomToken` on existing Google UID does not break later Google | **Partially intact for true Google UIDs; destroyed for `create_user` / `wf_` lookup.** Plan tests the easy case only. |
| 3 | Dio session POST is unauthenticated | **Destroyed.** Shared Dio + AuthInterceptor; anonymous is signed-out for coordinator and authenticated for interceptor. |
| 4 | Signed-in skip already exists and is tested | **Exists, not tested.** Contract still requires email prompt. |
| 5 | Hash canonicalization web vs mobile is identical | **Destroyed.** Different serializers; no shared golden. |
| 6 | `WEB_FUNNEL_SILENT_LOGIN_ENABLED` is enough without app update | **Destroyed.** Flag-off 403s custom while signed-in skip refuses overlay; client still POSTs. |
| 7 | Optional coordinator callbacks do not break tests | **Compile-true, contract-false.** 12 call sites, gate runs 2 files; auth listener race untested. |
| 8 | Firebase `create_user` vs MealTrack `User.email` unique | **Destroyed.** Finalize/sync 409; `EmailAlreadyExistsError` unhandled. |

---

## Plan follow-ups (do not cook until)

1. Lock JWT-or-Admin email contract in Phase 1 with a real Firebase test, not FakeFirebase dicts.
2. Session identity must consult MealTrack `users.email` / refuse `wf_` before mint.
3. Bare Dio (or skip-auth extra) for session; interceptor test with anonymous user.
4. Mandatory signed-in `acceptLink` characterization; expand Phase 2 gate to all 12 constructor sites.
5. Cross-repo hash golden before any session route.
6. Kill switch = sign out custom + overlay; remote config or do not ship the client POST.
7. Custom sign-in must participate in `_signInActive` / barrier; do not race onboarding GET 404 with finalize.
