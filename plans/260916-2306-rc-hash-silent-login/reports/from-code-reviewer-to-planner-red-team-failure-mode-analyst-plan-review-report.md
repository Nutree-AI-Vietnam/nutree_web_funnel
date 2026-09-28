# Plan Review: RC redeem hash silent login

Role: Failure Mode Analyst (Flow Tracer)
Verification: Standard
Verdict: Plan is not production-ready. The written control flow does not match the live coordinator, interceptor, or finalize identity gates. Several paths lose the purchase or switch accounts without a recovery.

Traced entry: `acceptLink` → `_acceptLink` → `_acceptParsedLink` → (`_startActivation` | email overlay) → `_runActivation` (identity → preflight → align → redeem → finalize).

---

## Finding 1: Silent login can bind `preflight_uid` to a mint-created UID that finalize can never accept
- **Severity:** Critical
- **Location:** Phase 1, section "Tests After" item 6; Phase 2, section "Architecture"
- **Flaw:** The plan treats "session does not set `preflight_uid`" as the eligibility-safety property. The live redeem chain immediately preflights after sign-in. `preflight` commits `preflight_uid` to whatever Firebase UID silent login just minted. `finalize` then refuses that UID when a Nutree `User` already owns the checkout email under a different `firebase_uid`. Preflight does not emit `EXISTING_ACCOUNT_REQUIRES_SIGN_IN`; only finalize does. After the 409, the real account cannot preflight either because the hash is already bound to the wrong UID. The plan never traces this branch and never tests it.
- **Failure scenario:** Checkout email is `buyer@gmail.com`. Nutree already has `User(email=buyer@gmail.com, firebase_uid=google-uid)`. Firebase `get_user_by_email` misses (Apple relay vs checkout email, unverified Google email, prior `wf_` leftover, or `create_user` race). Session `create_user` mints `new-uid`. App `signInWithCustomToken` → `_runActivation` → `preflight` writes `preflight_uid=new-uid`. Finalize sees `email_owner.firebase_uid != new-uid` and throws 409. Overlay shows wrong-account. Buyer signs into the real Google UID. Preflight now returns false because `preflight_uid != uid`. Purchase is stuck until an operator clears the column. Redeem was not consumed; eligibility was.
- **Evidence:** `mealtrack_backend/src/infra/services/web_funnel_redemption_service.py:28-41` (preflight binds UID before Nutree email-owner check); `mealtrack_backend/src/infra/services/web_funnel_redemption_completion.py:175-181` (email owner mismatch is finalize-only 409); `nutree_ai/lib/features/auth/application/services/web_purchase_redemption_coordinator.dart:570-572` (activation always preflights after identity); `nutree_ai/lib/features/auth/application/providers/web_purchase_redemption_provider.dart:124-128` (client maps EXISTING_ACCOUNT only from Dio body, which preflight never returns).
- **Suggested fix:** Do not preflight until Nutree email-owner == minted UID, or make session mint fail closed when a Nutree user exists for that email with a different Firebase UID. Add an explicit recovery that clears `preflight_uid` on EXISTING_ACCOUNT before the overlay asks the buyer to switch. Test: Nutree user A + mint-created UID B + same lead email → no durable bind to B, A can still preflight.

## Finding 2: "Signed-out only" is a lie for anonymous Firebase users — interceptor will attach their token and custom sign-in will replace them
- **Severity:** Critical
- **Location:** Phase 2, sections "Requirements", "Refactor" step 2, "Risk Assessment"
- **Flaw:** Coordinator `currentUserId()` returns null for anonymous users, so the new branch will call session + `signInWithCustomToken`. AuthInterceptor attaches a bearer whenever `FirebaseAuth.currentUser != null`, including anonymous. There is no per-request skip. `signInWithCustomToken` is a full sign-in, not `linkAnonymousWith*`. The established anonymous upgrade path exists specifically to keep the UID. Silent login will destroy it. The plan's interceptor note ("anonymous/missing is OK") is wrong: this is an account switch of a signed-in Firebase user, and the 401 handler can then `signOut()` the minted session.
- **Failure scenario:** First-open install still has an anonymous Firebase user (normal). Buyer taps RC mail. `currentUserId()` is null → session POST goes out with the anonymous ID token. Rate limiter keys on that uid. Custom token sign-in replaces the anonymous user. Auth listener `_bindStorage(newUid)` runs because `_signInActive` is false. Anonymous journal is rebound/purged. If session or the next preflight 401s, `onAuthFailure` signs everyone out. Buyer lands signed out with recovery persisted and the anonymous profile gone.
- **Evidence:** `nutree_ai/lib/features/auth/application/providers/web_purchase_redemption_provider.dart:25-28` (anonymous ⇒ null uid); `nutree_ai/lib/core/network/interceptors/auth_interceptor.dart:39-54` (any currentUser gets Authorization); `nutree_ai/lib/core/network/interceptors/auth_interceptor.dart:65-78` (401 + no user → `_triggerAuthFailure`); `nutree_ai/lib/main.dart:416-418` (`onAuthFailure` → `signOut()`); `nutree_ai/lib/features/auth/data/repositories/auth_repository.dart:540-552` (anonymous upgrade must link, not replace); `nutree_ai/lib/features/auth/application/providers/auth_flow_notifier.dart:187-215` (custom-token sign-in is not wrapped in `_signIn`, so the listener binds storage immediately).
- **Suggested fix:** Treat `firebaseAuth.currentUser != null` as signed-in, including anonymous. Either skip silent login and keep the email overlay, or link/replace only after an explicit upgrade helper. Session Dio must omit Authorization (dedicated unauthenticated client or interceptor skip). Tests: anonymous currentUser → exchange never called; if exchange is allowed, anonymous UID is linked not replaced; session POST has no Bearer.

## Finding 3: Exchange is inserted after `awaitingAuthentication` + `notifyListeners`, so the email overlay is live for the whole network RTT
- **Severity:** High
- **Location:** Phase 2, sections "Architecture", "Refactor" step 2, "Risk Assessment"
- **Flaw:** Live `_acceptParsedLink` persists, captures `_initialUserId`, sets `_stage = awaitingAuthentication`, notifies, then maybe starts activation. The plan says "after persist, if signed out, await exchange then `_startActivation`" without changing that notify order. Home already mounts `ActivatePlanScreen` as a full-screen overlay. That screen falls through to email fields whenever state is not checking/activating. Risk Assessment mentions `checkingAccount` as a preference; Architecture, implementation steps, and Tests After do not require it. `_authenticate` only early-returns when `isActivating`. Exchange is outside `_bounded` (20s). Barrier wait is 20s total.
- **Failure scenario:** Signed-out tap. Overlay paints email field with autofocus and Send Link. Session hangs 8–30s. Buyer submits passwordless to a different inbox. Session then returns; `signInWithCustomToken` races `signInWithEmailLink` + `resumeAfterAuthentication`. Whichever UID wins preflights. The other account is signed over. If exchange never returns, `acceptLink` holds the deep-link future (`routing_providers` awaits it) and the barrier times out at 20s while auth validation continues mid-flight.
- **Evidence:** `nutree_ai/lib/features/auth/application/services/web_purchase_redemption_coordinator.dart:314-335` (stage + notify before signed-in activation); `nutree_ai/lib/features/auth/application/services/web_purchase_redemption_coordinator.dart:427-428` (`_authenticate` allowed while awaitingAuthentication); `nutree_ai/lib/features/auth/application/services/web_purchase_redemption_coordinator.dart:712-715` (20s timeout only inside `_runActivation`); `nutree_ai/lib/features/auth/presentation/screens/activate_plan_screen.dart:352-370` (fallback is always emailEntry); `nutree_ai/lib/features/auth/presentation/screens/activate_plan_screen.dart:164-166` (autofocus on email); `nutree_ai/lib/core/theme/shell_layout.dart:278-333` (pending recovery mounts ActivatePlanScreen over Home); `nutree_ai/lib/core/di/providers/routing_providers.dart:122-127` (`acceptLink` is awaited before routing Home); `nutree_ai/lib/features/auth/application/providers/auth_flow_notifier.dart:43` and `313-316` (barrier wait 20s then continues).
- **Suggested fix:** Before any notify, set `_stage = preparing` (`checkingAccount`), begin barrier, then await exchange with a hard timeout. On 404/timeout, then and only then set `awaitingAuthentication` and notify. Tests must assert `activationState == checkingAccount` and `signInWithGoogle` is a no-op for the entire exchange.

## Finding 4: Kill-switch 404 is not the only failure, and 429/5xx/hang will not restore the passwordless overlay
- **Severity:** High
- **Location:** Phase 2, sections "Requirements", "Refactor" step 3, "Tests After" items 2 and 4
- **Flaw:** Requirements say "Failure/404 → overlay". Provider step and Tests After only map 404. Flag-off and unknown hash are 404s. Rate-limit is 429 with `preview_rate_limited`. Slowapi still counts flag-off 404s. Exchange is not inside `_runActivation`'s try/catch. Tests After 4 only covers `signInWithCustomToken` throw after a 200. Deep-link `acceptLink` has no catch in the router.
- **Failure scenario:** Staging flag on, Firebase Admin blips, session returns 500. Or attacker/shared NAT burns `5/minute`, buyer gets 429. Provider rethrows. `_acceptParsedLink` already persisted recovery and may already have notified emailEntry — or the exception escapes `acceptLink`, the router never `go(home)`, overlay never appears, recovery sits in secure storage until next cold start. Buyer thinks the link did nothing. Next launch retries session, hits 429 again.
- **Evidence:** `mealtrack_backend/src/api/middleware/rate_limit.py:40-51` (429 envelope, not 404); `mealtrack_backend/src/api/routes/v1/web_funnel.py:309` (sibling routes already `5/minute`); `nutree_ai/lib/core/di/providers/routing_providers.dart:122-127` (unhandled acceptLink exception skips Home); `nutree_ai/lib/features/auth/application/services/web_purchase_redemption_coordinator.dart:255-280` (`_acceptLink` has finally, no catch); Phase 2 Tests After only name 404.
- **Suggested fix:** Treat any non-200 (404, 429, 5xx, timeout, parse error) as passwordless fallback, and wrap exchange+sign-in so `acceptLink` still returns true with recovery. Test 429 and timeout explicitly.

## Finding 5: Unauthenticated mint is rate-limited with an unverified JWT `sub`, so 5/minute is not a limiter
- **Severity:** High
- **Location:** Phase 1, sections "Non-functional", "Architecture", "Security Considerations"
- **Flaw:** Session is explicitly unauthenticated. The shared limiter decodes `Authorization` without verifying the signature and uses `sub`/`uid` if present. Combined with Finding 2, the app will often send a real (anonymous) token. Combined with a client that omits the header, an attacker who has one hash attaches a forged Bearer and rotates `sub` every request. Plan says "same 404 + limiter" against enumeration. Hash space is not the issue. Firebase `get_user_by_email` / `create_user` / `create_custom_token` cost is. App Check is out of scope.
- **Failure scenario:** Stolen RC URL (forwarded mail, screenshot). Bot posts `/redemptions/session` with a new unsigned JWT every call. Each request is a fresh limiter identity. Firebase Admin quota is burned; each call can `create_user` for a missing email. Legitimate buyer then hits email-already-exists or rate-limit when they tap.
- **Evidence:** `mealtrack_backend/src/api/middleware/rate_limit.py:14-37` (`get_user_id_or_ip` unverified JWT); `mealtrack_backend/src/api/routes/v1/web_funnel.py:308-313` (preflight is auth'd + 5/minute; session will copy the decorator without the auth dependency); Phase 1 "no auth on session POST".
- **Suggested fix:** Session limiter must ignore Authorization and key on IP (and/or a server-side hash of the redemption hash with a global cap). Fail closed if limiter storage is down. Test rotating unsigned `sub` does not mint more than N tokens/minute.

## Finding 6: Refunded/revoked/conflict hashes are not in the session test matrix, so a dead purchase still becomes a Firebase login
- **Severity:** High
- **Location:** Phase 1, sections "Requirements" vs "Tests After" item 3
- **Flaw:** Requirements say finalized/refunded/unknown → 404. Tests After only list unknown hash, `finalized_uid` set, and unverified Firebase user. Preflight already rejects `lead.status in {refunded, revoked, conflict}`. If session only checks `finalized_uid`, a refunded lead still mints a custom token for `lead.email`. That is a full login, not a redeem. Inbox possession was justified as "login for that checkout email" while the purchase is live; it is not justified after refund/revoke.
- **Failure scenario:** Buyer refunds. RC mail/link still exists. Attacker (or the same inbox) posts the hash, gets a custom token, signs into the checkout email's Firebase user. Preflight then 404s. They are still signed in. If that email already had a Nutree account, the attacker is in it without redeeming anything.
- **Evidence:** `mealtrack_backend/src/infra/services/web_funnel_redemption_service.py:34-36` (preflight checks lead status); `mealtrack_backend/src/infra/database/models/web_funnel_claim.py:123-127` (hash lives on the redemption row independent of lead status); Phase 1 Tests After item 3 omits refunded/revoked/conflict.
- **Suggested fix:** Session lookup must join lead and 404 on the same terminal statuses as preflight, with identical bodies. Tests for refunded, revoked, conflict, and `finalized_uid` set.

## Finding 7: `create_user` + `sign_in_provider: custom` has no identity completion path
- **Severity:** High
- **Location:** Phase 1, sections "Functional" / "Risk Assessment"; Phase 3, section "Tests After"
- **Flaw:** New emails get `create_user(email=..., email_verified=True)` with an auto UID and no password/Google/Apple provider. Finalize stores `User.provider` via `_auth_provider`, which maps anything that is not Apple/password to `GOOGLE`. Concurrent session posts: legacy `resolve()` only handles `UidAlreadyExistsError`, not `EmailAlreadyExistsError`. Phase 3 SIT proves existing Google same UID, not "new email then later Google/Apple". After this mint, Google sign-in is the Firebase account-exists-with-different-credential failure.
- **Failure scenario:** First-time web buyer, no Firebase user. Session creates `auto-uid`. Redeem succeeds. Next week they tap Google with the same Gmail. Firebase refuses. App shows a generic sign-in error. Nutree row says provider=GOOGLE so support tells them to use Google. They cannot. Passwordless email-link may or may not attach to the same UID; the plan does not specify or test it.
- **Evidence:** `mealtrack_backend/src/infra/services/web_funnel_redemption_completion.py:62-67` (`custom` → GOOGLE); `mealtrack_backend/src/infra/services/web_funnel_redemption_completion.py:184-191` (new Nutree user persisted with that provider); `mealtrack_backend/src/infra/services/web_funnel_firebase_identity.py:32-40` (create race only handles UID collision); `mealtrack_backend/src/api/routes/v1/web_funnel.py:107-110` (today's allowlist has no `custom`).
- **Suggested fix:** Map `custom` to an explicit Nutree provider (or EMAIL_LINK). On `EmailAlreadyExistsError`, `get_user_by_email` and mint that UID. SIT: new-email silent login, sign out, Google with same email — must be same UID or a documented, tested linking path.

## Finding 8: Custom-token ID token email is a production gate deferred to staging SIT, while preflight already requires it
- **Severity:** High
- **Location:** Phase 1, section "Risk Assessment"; Phase 2, section "Non-functional"; Phase 3, section "Tests After"
- **Flaw:** Preflight/finalize already 403 unless the **ID token** has `email` string + `email_verified` + allowed provider. Client identity is built from `User.email` / `emailVerified` after `reload`, not from token claims. Phase 1 ships mint without `update_user`. Phase 3 says stop if SIT sees missing email — after mobile already calls `_startActivation`. Missing email is a 403, not 404, so the Phase 2 kill switch does not apply. Coordinator maps that to recoverable identity failure while the custom-token user remains signed in (`_initialUserId` was captured as null, so cancel will sign them out; retry will not).
- **Failure scenario:** Flag on. Mint succeeds. `signInWithCustomToken` succeeds. `User.email` is null until a later refresh (or token lacks `email`). `_validatedIdentity` throws or preflight 403s. Overlay: recoverable failure, not email fields. Buyer retries; still signed in as custom; still no email claim. Passwordless fallback never appears because `currentUserId() != null`.
- **Evidence:** `mealtrack_backend/src/api/routes/v1/web_funnel.py:97-104` (fresh iat ≤ 600s); `mealtrack_backend/src/api/routes/v1/web_funnel.py:320-329` (email + email_verified + provider or 403); `nutree_ai/lib/features/auth/application/providers/web_purchase_redemption_provider.dart:109-121` (identity from User, then another `getIdToken(true)`); `nutree_ai/lib/features/auth/application/services/web_purchase_redemption_coordinator.dart:317` (`_initialUserId` captured before silent login → stays null); `nutree_ai/lib/features/auth/application/services/web_purchase_redemption_coordinator.dart:664-672` (null/unverified email throws).
- **Suggested fix:** Phase 1 must mint only after the Admin record has email+verified, and a unit test on the decoded custom-token **ID token** (not the custom token blob) asserts those claims. Mobile must not `_startActivation` unless `currentUser.email` is non-empty; otherwise sign out and fall back to overlay.

## Finding 9: `signInWithCustomToken` is a second auth producer that races AuthFlow, storage bind, and RC `logIn`
- **Severity:** High
- **Location:** Phase 2, section "Architecture"; Phase 3, section "Architecture" ("two producers, one redeem chain")
- **Flaw:** Passwordless goes through `AuthFlowNotifier.signInWithEmailLink` → `_signIn` (`_signInActive = true`, post-auth RC `logIn`, backend user sync with `allowBackendSyncFailure`). Silent login calls Firebase from the redemption provider and then `_startActivation` → `alignRevenueCat` → `Purchases.logIn`. The auth listener is not suppressed. It binds account storage before the claim barrier wait. Barrier timeout is 20s, then onboarding fetch runs for a user that finalize has not created. Phase 3 says `home_pending_auth` may skip the email prompt; it does not say AuthFlow must treat custom-token sign-in as an in-progress claim. Causation the plan assumes ("session 200 ⇒ same redeem chain") is only correlation if AuthFlow and RC identity run in parallel.
- **Failure scenario:** Custom sign-in fires `authStateChanges`. Listener binds storage to `auto-uid` and waits 20s. Activation still in preflight/RC redeem. Barrier times out. `_fetchOnboardingStatus` 404s, cache defaults to authenticated (`cached ?? true`). `redemptionNeedsAuthSurface` still fences routes to Home, but subscription/user-sync providers that only check AuthFlowState start hitting APIs as a user that does not exist yet. `alignRevenueCat` `logIn` races the listener's later state write. After finalize, `refreshAfterWebPurchase` may see a different lease epoch and skip `_setState`. Buyer is on Home with `home_active` UI and no backend user, or stuck `onboarding` after a successful redeem (SIT "onboarding not replayed" fails).
- **Evidence:** `nutree_ai/lib/features/auth/application/providers/auth_flow_notifier.dart:53-58` (`_signInActive` only set in `_signIn`); `nutree_ai/lib/features/auth/application/providers/auth_flow_notifier.dart:187-216` (listener binds storage then validates); `nutree_ai/lib/features/auth/application/providers/auth_flow_notifier.dart:229-236` and `300-316` (20s barrier then continues); `nutree_ai/lib/features/auth/application/providers/auth_flow_notifier.dart:290-296` (onboarding fetch failure defaults authenticated); `nutree_ai/lib/features/auth/application/providers/web_purchase_redemption_provider.dart:72-74` (RC align is a second `logIn`); `nutree_ai/lib/features/auth/data/repositories/auth_repository.dart:572-602` (passwordless already logs into RC inside `_postAuthSetup`); `nutree_ai/lib/features/auth/application/providers/firebase_email_link_handlers.dart:19-40` (passwordless is the coordinated producer the new path skips).
- **Suggested fix:** Route silent login through a notifier API that sets `_signInActive`, skips duplicate RC `logIn`, and keeps the barrier until finalize. Tests must include an `authStateChanges` fake during exchange, not only coordinator fakes.

---

## Flow trace (claimed vs actual)

```text
CLAIMED (Phase 2 Architecture)
  acceptLink → persist
    signed in  → _startActivation
    signed out → POST session → signInWithCustomToken → getIdToken(true) → _startActivation
    404        → emailEntry

ACTUAL entry (coordinator)
  acceptLink [in-flight lock]
    → _acceptLink
        early false: bad scheme, parse null, tombstone, cancelled recovery
    → _acceptParsedLink
        persist recovery          [stage written from _stage, still idle]
        _initialUserId = currentUserId()   [anonymous ⇒ null]
        _stage = awaitingAuthentication
        notifyListeners()         [ActivatePlanScreen emailEntry + autofocus]
        beginBarrier()
        if _initialUserId != null: unawaited(_startActivation)
        # plan inserts await exchange HERE while overlay is already emailEntry

ACTUAL activation
  _startActivation → preparing → _runActivation
    ensureIdentity (reload + getIdToken(true))
    preflight(hash)           [Dio + AuthInterceptor bearer]
    alignRevenueCat(uid)      [Purchases.logIn]
    redeem once
    finalize                  [EXISTING_ACCOUNT only here]
```

Middleware / listeners the plan does not list:
- `AuthInterceptor.onRequest` / `onError` (401 → signOut)
- `ErrorHandlingInterceptor` (maps 5xx before coordinator sees status)
- `AuthFlowNotifier` `authStateChanges` listener
- `ClaimFlowBarrier` 20s timeout
- `DeepLinkService.onRevenueCatRedemptionLink` awaiting `acceptLink`
- Home `ActivatePlanScreen` overlay via `shell_layout.dart`

Causality vs correlation: "hash → custom token → same preflight" is correlated only if the minted UID is the Nutree email owner and the ID token carries email. The code does not enforce that before binding `preflight_uid`.

---

## Plan status recommendation

Do not cook. Phase 1 identity/session tests and Phase 2 coordinator steps must be rewritten against the traces above. Highest-priority plan edits:
1. Fail closed when Nutree email-owner UID ≠ mint UID, before preflight bind.
2. Define signed-out as `currentUser == null`, not `currentUserId() == null`.
3. Make checkingAccount + timeout + catch-all fallback the signed-out control flow, not a risk footnote.
