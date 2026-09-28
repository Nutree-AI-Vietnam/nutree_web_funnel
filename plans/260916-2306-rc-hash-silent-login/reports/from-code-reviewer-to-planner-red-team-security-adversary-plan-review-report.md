# Red-team plan review — Security Adversary + Fact Checker

**Plan:** `plans/260916-2306-rc-hash-silent-login/`
**Design:** `plans/reports/260916-2259-rc-hash-silent-login.md`
**Role:** Fact Checker (Standard, 3 phases) + Contract Verifier (unauthenticated session POST vs existing Dio interceptors)
**Stance:** Hostile. No praise. Findings only.

---

## Finding 1: Unauthenticated hash mint is standing Google/Apple takeover, not inbox possession

- **Severity:** Critical
- **Location:** Phase 1, sections "Requirements", "Architecture", "Security Considerations"; Design locked table "Existing same-email Google/Apple/email"
- **Flaw:** The plan treats `POST /v1/web-funnel/redemptions/session` as "inbox possession = login" and mints a Firebase custom token for **any** existing UID (Google/Apple/password) from only a 64-hex hash. That is **RC-link possession**, not live inbox possession. Today's signed-out producer requires a fresh Firebase email-link (`sendSignInLinkToEmail`). The only existing unauthenticated custom-token mint (`/claims/exchange`) refuses Google/Apple, consumes a TTL'd magic token, and serializes with a reservation. The new route copies none of those controls. `WebFunnelRedemption.redemption_link_hash` has no expiry column. Tests After 404 only on unknown / `finalized_uid` / unverified user — not on mint reuse.
- **Failure scenario:** Attacker obtains one RC redeem URL (forwarded mail, gateway archive, screenshot, device backup). They SHA-256 it the same way the app does and POST the digest. MealTrack mints a custom token for the checkout email's **existing Google UID**. Attacker `signInWithCustomToken`, receives a refresh token, and keeps that session after the buyer later finalizes. One request is durable account takeover of meal history, not merely purchase redeem. Rate-limit 5/minute does not matter; the first 200 is enough. Flag-on in staging with a real buyer email is the same bug with a smaller audience.
- **Evidence:**
  - New mint allows any provider: Phase 1 Requirements "mint that UID (any provider)"; `resolve()` today **rejects** non-password (`mealtrack_backend/src/infra/services/web_funnel_firebase_identity.py:44-45`).
  - Legacy unauth mint is reservation + TTL + consume + lead terminal states (`mealtrack_backend/src/app/services/web_funnel_claim_exchange.py:25-43`, `mealtrack_backend/src/app/services/web_funnel_claim_common.py:10-12` `CLAIM_TTL` 24h / `RESERVATION_TTL` 10m / `EXCHANGE_TTL` 5m).
  - Hash row has no TTL; uniqueness only (`mealtrack_backend/src/infra/database/models/web_funnel_claim.py:123-127`).
  - Current producer is Firebase email-link (`nutree_ai/lib/features/auth/data/repositories/auth_repository.dart:68`, `nutree_ai/docs/contracts.md:100-101`, `mealtrack_backend/docs/api-endpoints.md:273-275`).
  - App hash is SHA-256 of the canonical RC URL (`nutree_ai/lib/features/auth/application/services/web_purchase_redemption_coordinator.dart:843-844`, `995-998`).
  - Phase 1 Tests After item 3 omits mint reuse; Security Considerations only "404 on reuse of **finalized** hash".
- **Suggested fix:** Do not mint for Google/Apple from hash alone, or require a single-use server ticket with TTL (legacy reservation pattern): consume-on-mint or bind `jti` to the hash, reject `lead.status in {refunded, revoked, conflict}`, and revoke refresh tokens on finalize. If the product insists on Google attach, say so explicitly: this is a new magic-link identity, weaker than Firebase email-link, and ship App Check / ticket (design B) in this plan — not "defer until abused".

---

## Finding 2: Cited 5/minute limiter is attacker-keyable on an unauthenticated mint

- **Severity:** Critical
- **Location:** Phase 1, sections "Requirements" ("Rate-limit `5/minute`"), "Risk Assessment" ("same 404 + limiter"), "Refactor" step 4
- **Flaw:** The plan copies `@limiter.limit("5/minute")` from existing web-funnel routes. That limiter's `key_func` is `get_user_id_or_ip`, which **base64-decodes any Bearer JWT without verification** and keys on `sub`/`uid`. The function's own docstring states auth is already enforced by `verify_firebase_token`. The new session route is explicitly **unauthenticated**, so that assumption is false. Phase 1 never specifies `get_remote_address` (or a hash-bound key) for this route.
- **Failure scenario:** Attacker who already has a valid hash (Finding 1) or who is spraying hashes attaches `Authorization: Bearer <unsigned JWT with unique sub>` on every request. Each request is a new rate-limit identity. 5/minute never trips. They mint tokens, hammer `get_user_by_email` / `create_user` / `create_custom_token`, and distinguish 200 vs 404 at unlimited QPS. Same class of bypass already documented on guest-trial in this repo.
- **Evidence:**
  - Unverified JWT key (`mealtrack_backend/src/api/middleware/rate_limit.py:14-37`), comment at lines 17-19.
  - Shared limiter used on preflight/finalize (`mealtrack_backend/src/api/routes/v1/web_funnel.py:17`, `308-309`, `342-343`).
  - Session is unauthenticated by plan (Phase 1 Requirements "no auth on session POST"); preflight **does** use `Depends(verify_firebase_token_revocation_checked)` (`mealtrack_backend/src/api/routes/v1/web_funnel.py:313`).
  - Forged-sub guest bypass already called out (`mealtrack_backend/plans/260814-1048-red-team-security-parse-text-plan.md` findings on `rate_limit.py:14-34`).
- **Suggested fix:** Session route must not use `get_user_id_or_ip`. Bind SlowAPI to IP (and optionally to the hash) with a dedicated key function that **ignores** Authorization. Add an adversarial test: rotating unsigned JWT `sub` does not mint more than 5 tokens/minute.

---

## Finding 3: "Unauthenticated Dio POST / no Firebase bearer" is false against the interceptor the plan wires

- **Severity:** High
- **Location:** Phase 2, sections "Requirements", "Refactor" step 3, "Risk Assessment"; Related Code Files `web_purchase_redemption_provider.dart`
- **Flaw:** Phase 2 **requires** "Dio POST, no Firebase bearer on session" then names the existing provider, which uses `ref.read(dioProvider)`. That Dio is built with `AuthInterceptor` that **always** sets `Authorization: Bearer` when `FirebaseAuth.currentUser != null`. There is **no** `skipAuth` / extra flag anywhere in `lib/`. Coordinator `currentUserId` treats **anonymous** as signed-out (`null`) and will call session exchange while `currentUser` is still a real Firebase user — so the interceptor **will** attach that anonymous ID token. The Risk Assessment then contradicts the requirement ("anonymous/missing is OK"). Tests After never assert the session request has no Authorization header.
- **Failure scenario:** Signed-out Nutree user still has an anonymous Firebase session (normal). Silent-login POST goes out with a real ID token. (1) Backend rate limiter keys on that UID, not IP — Fine for one device, useless as a contract. (2) Attacker or a mis-copied `Depends(verify_firebase_token)` on the session route returns 401; if the anonymous token was refreshed on the way out (`markAuthRefresh`), `AuthInterceptor.onError` calls `onAuthFailure` → `authFlow.signOut()` and `CancelOnLogoutInterceptor` cancels in-flight work. (3) Contract verifier: callers of preflight/finalize today **must** send a bearer; the new endpoint must **not**; the plan's wiring uses the same Dio without an exclusion, so the contract is unenforceable and untested.
- **Evidence:**
  - Provider uses shared Dio for preflight/finalize (`nutree_ai/lib/features/auth/application/providers/web_purchase_redemption_provider.dart:30-44`, `75-90`).
  - Anonymous counts as signed-out (`nutree_ai/lib/features/auth/application/providers/web_purchase_redemption_provider.dart:25-28`).
  - Interceptor always attaches bearer (`nutree_ai/lib/core/network/interceptors/auth_interceptor.dart:33-54`); 401 after refresh-attempted triggers `_onAuthFailure` (`65-74`, `116-125`).
  - `onAuthFailure` signs the user out (`nutree_ai/lib/main.dart:416-428`).
  - Dio factory always installs AuthInterceptor (`nutree_ai/lib/core/network/dio_factory.dart:45-56`).
  - Grep `skipAuth|skipInterceptor` in `nutree_ai/lib`: no matches.
  - Auth interceptor tests lock "add Authorization when user is authenticated" (`nutree_ai/test/core/network/interceptors/auth_interceptor_test.dart:39-63`).
- **Suggested fix:** New Dio without `AuthInterceptor`, or an explicit `Options.extra` skip that AuthInterceptor honors, plus a provider test that the session POST has no `Authorization` header even when `currentUser` is anonymous. Delete the "anonymous token is OK" waffle; it contradicts the written requirement.

---

## Finding 4: Refunded/revoked/conflict hashes still mint a login; Tests After do not cover them

- **Severity:** High
- **Location:** Phase 1, sections "Requirements" vs "Tests After" item 3; compare legacy `exchange_claim` and `preflight`
- **Flaw:** Requirements say "Finalized/refunded/unknown hash → 404". Tests After only name unknown hash, `finalized_uid` set, and unverified Firebase user. Implementation steps never say to join `WebFunnelLead.status`. Existing `preflight()` and `exchange_claim()` both refuse `refunded` / `revoked` / `conflict`. A cook who only copies Tests After will ship mint-after-refund.
- **Failure scenario:** Buyer is refunded. `lead.status = refunded`, `finalized_uid` still null (preflight never completed, or refund webhook does not clear the hash). Attacker (or the same RC email sitting in the inbox) POSTs the hash, gets a custom token for that email's Google UID, and signs into Nutree with no purchase. Session has become an undead login credential independent of payment state.
- **Evidence:**
  - Preflight refuses those lead statuses (`mealtrack_backend/src/infra/services/web_funnel_redemption_service.py:28-36`).
  - Legacy exchange refuses them before mint (`mealtrack_backend/src/app/services/web_funnel_claim_exchange.py:39-43`).
  - Hash lookup in preflight is **not** read-only and does not return email (`mealtrack_backend/src/infra/services/web_funnel_redemption_service.py:19-42`).
  - Phase 1 Tests After item 3 list: "unknown hash / finalized_uid set / unverified user" — no `lead.status`.
- **Suggested fix:** Session lookup must apply the same lead terminal set as `exchange_claim` / `preflight`. Add identical 404 body tests for refunded, revoked, and conflict. Do not implement lookup by calling `preflight()`.

---

## Finding 5: Plan points cooks at a mutating preflight as "hash → lead.email"

- **Severity:** High
- **Location:** Phase 1, section "Context Links"; Architecture `mint_for_lead_email`; Tests After item 6
- **Flaw:** Claimed lookup path is `web_funnel_redemption_service.py`. That module has **no** hash→email reader. `preflight()` requires `uid` + `email`, compares email, and **writes `preflight_uid`**. Session is unauthenticated and has no Firebase UID yet. Reusing `preflight()` either cannot compile against the signature or binds eligibility to a dummy UID and consumes the one-flight preflight slot (Tests After 6 admits this must not happen, but Context Links still send the cook to the mutating method).
- **Failure scenario:** Cook implements session as `preflight(uid="session", email=?, hash=...)`. There is no email yet (that is the point of the lookup). They query the row, then call `preflight` with the minted UID — session then **does** set `preflight_uid` before the app signs in, racing a legitimate preflight from another device. Or they skip the join and mint from hash alone without lead status checks (Finding 4).
- **Evidence:**
  - `WebFunnelRedemptionService.preflight` signature and `preflight_uid` write (`mealtrack_backend/src/infra/services/web_funnel_redemption_service.py:19-42`).
  - No other method on that class returns `lead.email`.
  - Lead email lives on `WebFunnelLead` loaded by `lead_id` (`mealtrack_backend/src/infra/services/web_funnel_redemption_service.py:34-38`).
  - Phase 1 Context Links line: "Hash → lead.email: `src/infra/services/web_funnel_redemption_service.py`".
- **Suggested fix:** Specify a new read-only `lookup_email_for_hash(hash) -> str | None` that does not write `preflight_uid`, joins lead, applies terminal statuses, and is the only session entry point. Remove the misleading context link.

---

## Finding 6: `useDifferentAccount` is undone by restore; silent login re-binds the checkout UID

- **Severity:** High
- **Location:** Phase 2, sections "Requirements" ("never call exchange" only when `currentUserId() != null`), "Architecture", "Refactor" step 2; Success Criteria "Wrong signed-in user cannot be displaced"
- **Flaw:** After persist, signed-out always hits session if the callback is non-null. `useDifferentAccount()` signs out and returns to `awaitingAuthentication`, but the recovery record still holds `linkHash`. `restorePendingLink()` re-enters `_acceptParsedLink`. Cold start with a signed-out user will silent-login again as the checkout email's UID. There is no recovery flag for "user refused silent login". Tests After item 3 only cover "signed-in uid → exchange never called", not post-sign-out restore.
- **Failure scenario:** User is silently signed in as Google UID A (checkout). They want UID B, tap use-different-account, sign out, start email-link as B. OS kills the app. Restore runs session mint for A, `signInWithCustomToken` replaces B's in-progress auth, and redeem may consume onto A. The "no auto account-switch" rule is inverted: the user's chosen account is displaced by the hash mint.
- **Evidence:**
  - Restore → `_acceptParsedLink` (`nutree_ai/lib/features/auth/application/services/web_purchase_redemption_coordinator.dart:341-391`).
  - `_acceptParsedLink` always persists hash then, if uid non-null, starts activation (`283-335`); plan adds exchange on uid null after this persist.
  - `useDifferentAccount` signs out and sets `awaitingAuthentication` without tombstoning the hash (`477-487`).
  - Recovery record stores `linkHash` (`294-298`).
- **Suggested fix:** Persist `silentLoginDeclined` (or tombstone silent-login) on `useDifferentAccount` / email overlay fallback. Restore and `_acceptParsedLink` must not call `exchangeSilentSession` when that bit is set. Add a coordinator test: decline → kill → restore → exchange not called.

---

## Finding 7: Allowlisting `custom` on preflight/finalize is not bound to the session mint

- **Severity:** High
- **Location:** Phase 1, sections "Requirements" ("preflight/finalize accept `sign_in_provider: custom` iff flag"), "Refactor" step 2; Phase 3 "Kill switch = session 404 + custom 403"
- **Flaw:** Flag-on adds `"custom"` to `_is_supported_redemption_provider` globally. Any Firebase custom-token session with verified matching email becomes eligible to preflight/finalize — not only tokens just minted by `/redemptions/session`. Legacy `create_custom_token` already exists and stamps `wf_reservation` / `wf_generation`; `recovery`/`complete` read those claims. The new helper mints **with no extra claims** (Phase 1 Refactor step 3), so there is no way to tell a silent-login token from any other custom token. Current allowlist is only `google.com` / `apple.com` / `password`.
- **Failure scenario:** Flag flipped on staging/prod. An old or independently minted custom token for a `wf_` or auto UID whose email equals `lead.email` passes preflight. Attacker who can mint custom tokens via a leaked Admin key, a leftover claim reservation, or this session endpoint from another device, redeems the purchase. Kill switch "custom 403" is all-or-nothing: you cannot disable silent-login tokens without also disabling every custom provider.
- **Evidence:**
  - Allowlist today (`mealtrack_backend/src/api/routes/v1/web_funnel.py:107-110`, used at `321-326` and `362-367`).
  - Legacy mint extra claims (`mealtrack_backend/src/infra/services/web_funnel_firebase_identity.py:54-58`); complete/recovery read them (`mealtrack_backend/src/api/routes/v1/web_funnel.py:504-510`).
  - Phase 1: "No extra claims required."
  - Finalize characterization uses `google.com` / `password` only (`mealtrack_backend/tests/unit/api/routes/test_web_funnel_lead_routes.py:278-410`); no preflight provider tests exist (grep `test_redemption_preflight` → no matches).
- **Suggested fix:** Do not globally allow `custom`. Mint with a dedicated claim (e.g. `wf_silent_login=1`) and accept `custom` **only** when that claim is present, token `iat` is fresh, and email matches. Tests: custom without claim still 403 when flag on.

---

## Finding 8: `_validatedIdentity` / backend JWT email contract is unverified and can leave a signed-in user stuck

- **Severity:** Medium
- **Location:** Phase 1 Risk Assessment ("Custom token without email on JWT"); Phase 2 Refactor step 4; Phase 3 Tests After "If ID token lacks email: stop… follow-up"
- **Flaw:** The plan ships mint + `signInWithCustomToken` + existing `_runActivation` in phases 1–2, and only **proves** `email` / `email_verified` / `sign_in_provider=custom` in Phase 3 SIT. Backend preflight reads **JWT** `token.get("email")` and `email_verified`, not the Firebase User object. Mobile `_validatedIdentity` reads `User.email` / `emailVerified` after `reload()`. Those can diverge for custom-provider tokens. Phase 1 says "No extra claims required" and "existing users must already have email" — not `update_user` before mint. If SIT fails, the cook is told not to return email from session, but the user is **already signed in**.
- **Failure scenario:** Flag on. Session 200, custom sign-in succeeds, `User.email` is set so mobile passes `_validatedIdentity`, preflight 403 "Verified email required" because the ID token lacks `email`. Coordinator maps generic 403 via `ErrorHandlingInterceptor` to `AuthException` / recoverable identity failure — not email overlay. User is now the Google UID on device with no redeem and no signed-out fallback unless they manually sign out. `useDifferentAccount` exists but is not the 403 path.
- **Evidence:**
  - Preflight requires JWT email + `email_verified` + provider (`mealtrack_backend/src/api/routes/v1/web_funnel.py:319-329`).
  - Mobile identity uses User record after `getIdToken(true)` (`nutree_ai/lib/features/auth/application/providers/web_purchase_redemption_provider.dart:109-121`).
  - `_validatedIdentity` requires non-anonymous + verified email (`nutree_ai/lib/features/auth/application/services/web_purchase_redemption_coordinator.dart:664-672`).
  - 403 mapping (`nutree_ai/lib/core/network/dio_factory.dart:191-195`); ExistingAccount mapping is a **detail code**, not generic 403 (`web_purchase_redemption_provider.dart:124-128`).
  - Design Unresolved: "Whether custom-token ID tokens include `email` on this Firebase project (prove in SIT)."
- **Suggested fix:** Make `update_user(email=..., email_verified=True)` before `create_custom_token` a Phase 1 requirement, not a SIT follow-up. Add a backend test with a FakeFirebase user whose ID-token payload omits `email` and assert mint path repairs it. Phase 2: on preflight 403 after silent login, sign out and fall back to email overlay.

---

## Fact-check ledger (sampled ~10 claims / phase)

### Phase 1

| Claim | Result |
|---|---|
| `_is_supported_redemption_provider` in `web_funnel.py` | **VERIFIED** `mealtrack_backend/src/api/routes/v1/web_funnel.py:107-110` (`google.com`/`apple.com`/`password` only) |
| `WebFunnelFirebaseIdentityService.resolve` exists; rejects Google/Apple | **VERIFIED** `web_funnel_firebase_identity.py:21-28`, `44-45` |
| Hash → lead.email lookup in `web_funnel_redemption_service.py` | **FAILED** — `preflight()` needs uid+email and writes `preflight_uid` (`19-42`) |
| Hash Field 64 lowercase hex, same as preflight | **VERIFIED** `web_funnel_claim_requests.py:90-97` |
| `WEB_FUNNEL_REDEMPTION_ENABLED` / `WEB_FUNNEL_LEGACY_CLAIM_ENABLED` default false | **VERIFIED** `settings.py:219-221`, `.env.example:197-199` |
| `WEB_FUNNEL_SILENT_LOGIN_ENABLED` already in settings | **FAILED** (absent; planned add only) |
| Finalize tests: google OK, passwordless OK, anonymous 403 | **VERIFIED** `test_web_funnel_lead_routes.py:278`, `330`, `370` |
| Gap: no preflight provider tests | **VERIFIED** (no `test_redemption_preflight*` ) |
| `web_funnel.py` over 200-line target | **VERIFIED** file is 512 lines; standard at `docs/code-standards.md:29-36` |
| `main.py` includes only `web_funnel_router` today | **VERIFIED** `src/api/main.py:78`, `329` |
| Rate-limit 5/minute already on redemption POSTs | **VERIFIED** `web_funnel.py:308-309`, `342-343` |
| Unauth `/redemptions/session` exists | **FAILED** (not in `web_funnel.py` or `api-endpoints.md`) |

### Phase 2

| Claim | Result |
|---|---|
| Coordinator / provider / test paths | **VERIFIED** `web_purchase_redemption_coordinator.dart`, `web_purchase_redemption_provider.dart`, `web_purchase_redemption_coordinator_test.dart` |
| `_startActivation` / `_runActivation` / `_acceptParsedLink` | **VERIFIED** coordinator `:283`, `:542`, `:559` |
| `currentUserId()` is a callback; anonymous → null | **VERIFIED** provider `:25-28` |
| `checkingAccount` / `emailEntry` / `isAwaitingAuthentication` | **VERIFIED** coordinator `:49-50`, `:184-215`; overlay `activate_plan_screen.dart:362-370` |
| Order identity → preflight → align | **VERIFIED** `_runActivation` `:564-574` |
| `signInWithCustomToken` already in `lib/` | **FAILED** (0 matches under `nutree_ai/lib`; design scout note agrees) |
| Provider can issue Dio POST with no bearer | **FAILED** — `dioProvider` + `AuthInterceptor` always attach (`auth_interceptor.dart:39-54`) |
| Overlay path `activate_plan_screen.dart` | **VERIFIED** |

### Phase 3

| Claim | Result |
|---|---|
| `nutree_ai/docs/contracts.md` § Web purchase redemption | **VERIFIED** `:95-123` (passwordless only; no silent producer) |
| `docs/external-services.md` flag block | **VERIFIED** `:226-230` (no silent flag yet) |
| `docs/api-endpoints.md` paid web redemption | **VERIFIED** `:269-277` (passwordless; no session route) |
| `.env.example` silent flag | **FAILED** (not present; Phase 1/3 add it) |
| Production flag not in this plan | **UNVERIFIED** (process claim; no prod env in repo to grep) |

### Contract verifier (session vs interceptors)

| Contract | Result |
|---|---|
| Preflight/finalize callers send Firebase bearer via shared Dio | **VERIFIED** `web_purchase_redemption_provider.dart:30-44`, `75-90` + `AuthInterceptor.onRequest` |
| New session POST must not send bearer (Phase 2 requirement) | **FAILED** against named wiring; no skip path in `lib/` |
| 401 interceptor must not refresh/sign-out on session | **UNVERIFIED** in plan tests; code **will** refresh if `currentUser != null` (`auth_interceptor.dart:65-91`); POST is `neverAutoRetry` (`retry_policy.dart:71-76`) so replay is skipped, but refresh-attempted 401 still calls `onAuthFailure` (`auth_interceptor.dart:70-73`) |
| Backend session has no `Depends(verify_firebase_token*)` | **UNVERIFIED** (route does not exist); preflight **does** (`web_funnel.py:313`) |

---

## Plan-quality verdict (blocking)

Do not cook Phase 1 as written. The session endpoint as specified is an unauthenticated, reusable, unlimited custom-token oracle for existing Google/Apple UIDs, protected only by a limiter that this codebase already knows is bypassable, called from a Dio stack that will attach a Firebase bearer the plan forbids. Fix consume/TTL/lead-status, IP-only rate limit, skip-auth Dio, and `custom` claim binding before implementation.
