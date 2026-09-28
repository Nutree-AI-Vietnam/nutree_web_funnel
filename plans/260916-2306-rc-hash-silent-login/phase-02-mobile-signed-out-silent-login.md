---
phase: 2
title: Mobile signed-out silent login
status: completed
priority: P1
effort: 5h
dependencies:
  - 1
---

# Phase 2: Mobile signed-out silent login

## Overview

Lock coordinator tests. When **`currentUser == null`**, session POST (no Authorization) → AuthFlow custom-token sign-in (`_signInActive`) → `getIdToken(true)` → `_startActivation`. Any failure → `emailEntry`. Never exchange for anonymous or signed-in users. Never auto-switch.

## Context Links

- Coordinator: `lib/features/auth/application/services/web_purchase_redemption_coordinator.dart`
- Wiring: `lib/features/auth/application/providers/web_purchase_redemption_provider.dart`
- Interceptor: `lib/core/network/interceptors/auth_interceptor.dart:33-78` (always attaches Bearer if `currentUser != null`)
- `currentUserId` today treats anonymous as null (`web_purchase_redemption_provider.dart:25-28`)
- AuthFlow: `auth_flow_notifier.dart` `_signInActive` around Google/Apple/email-link — **no** production `signInWithCustomToken` in `lib/`
- `useDifferentAccount`: coordinator `477-487` (sign out, keep pending link)
- Overlay: `activate_plan_screen.dart`; Home: `shell_layout.dart`
- Coordinator constructors: **12** sites (1 provider + 7 coordinator_test + 2 redirect + welcome + activate_plan)

## Requirements

> **Red team #2:** Signed-out means `FirebaseAuth.currentUser == null`. If `currentUser != null` (incl. anonymous), **never** call session / `signInWithCustomToken`. Anonymous stays on email overlay (do not replace anonymous UID).

> **Red team #2/#4:** Session HTTP uses a Dio **without** `AuthInterceptor` (or explicit skip). Test: even with an anonymous user, session POST has **no** `Authorization`. Session 401 must **not** call `onAuthFailure` / global `signOut`.

> **Red team #10:** Do not `notifyListeners` into `emailEntry` before exchange. Set `preparing`/`checkingAccount`, begin barrier, await exchange with a hard timeout (inside `_bounded`), then notify. Google/email send no-ops during exchange.

> **Red team #11:** 404, 429, 5xx, timeout, parse error → passwordless overlay. `acceptLink` still returns true with recovery. Not only 404.

> **Red team #8:** Persist declined-silent (or tombstone) when `useDifferentAccount` runs. `restorePendingLink` must not call exchange. Add that test.

> **Red team #3/#14:** If `currentUser.email` is null after custom sign-in, or preflight 403s `custom` (flag off / missing claims): **sign out** and force `emailEntry`. Do not `_startActivation` without email.

> **Red team #15:** Custom sign-in goes through AuthFlow (`_signInActive`, claim barrier). Do not raw `firebaseAuth.signInWithCustomToken` from the redemption provider. Expand the shared test factory (`coordinator_test.dart` ~line 69). Regression gate includes redirect / welcome / activate-plan tests.

- Functional: signed-in non-null **non-anonymous** UID: existing skip; exchange never called.
- Do not invert preflight → align → redeem → finalize.

## Architecture

```text
acceptLink → persist recovery
  if currentUser != null (incl. anonymous): existing skip or email overlay; no exchange
  if currentUser == null:
    stage=checkingAccount (no email fields yet)
    POST session (bare Dio)
      200 + email on user → AuthFlow custom sign-in → getIdToken(true) → _startActivation
      any other outcome → emailEntry (passwordless)
```

## Related Code Files

- Modify: `web_purchase_redemption_coordinator.dart`
- Modify: `web_purchase_redemption_provider.dart`
- Modify: `auth_flow_notifier.dart` / `auth_repository.dart` (custom-token sign-in API)
- Modify: Dio factory or a tiny unauthenticated client
- Modify: tests: coordinator (factory + all call sites), `app_router_redirect_test.dart`, `welcome_screen_test.dart`, `activate_plan_screen_test.dart`
- Create: optional `web_purchase_redemption_session.dart` if files exceed 200 LOC
- Delete: none

## Tests Before

1. Signed-out `acceptLink` → `isAwaitingAuthentication`.
2. Wrong account recoverable (`ExistingAccountSignInRequired`).
3. Order: identity → preflight → align.
4. **Mandatory characterization:** `acceptLink` with non-null non-anonymous `currentUserId` → activation starts, exchange never called.

```bash
cd /Users/alexnguyen/Desktop/Nut/nutree/nutree_ai
flutter test test/features/auth/application/services/web_purchase_redemption_coordinator_test.dart
```

## Refactor

1. Optional exchange callback; default null = emailEntry.
2. After persist: branch on `currentUser == null` only.
3. Bare Dio session; AuthFlow custom sign-in.
4. Fallback + declined-silent + overlay timing as above.

## Tests After

1. Signed-out + 200 token → one custom sign-in → not `emailEntry` → preflight then align.
2. 404 / 429 / timeout → `emailEntry`, no custom sign-in, no preflight.
3. Anonymous `currentUser` → exchange never called.
4. Signed-in uid → exchange never called.
5. `signInWithCustomToken` throws → identity failure, no redeem.
6. `useDifferentAccount` then `restorePendingLink` → no exchange.
7. Session POST header assertion: no `Authorization`.
8. After custom sign-in, missing email → sign out + overlay, no preflight.

## Implementation Steps

1. Tests Before including signed-in skip.
2. Failing Tests After.
3. Coordinator + AuthFlow + bare Dio until green.
4. Re-run Tests Before + extra test files.

## Success Criteria

- [x] Session 404/429/timeout restores overlay.
- [x] Happy signed-out path: 0 email fields, then existing redeem chain.
- [x] Anonymous and wrong-account users are not displaced.
- [x] Custom sign-in uses `_signInActive`.

## Regression Gate

```bash
cd /Users/alexnguyen/Desktop/Nut/nutree/nutree_ai
flutter test \
  test/features/auth/application/services/web_purchase_redemption_coordinator_test.dart \
  test/features/auth/application/services/revenuecat_redemption_scheme_test.dart \
  test/features/auth/presentation/router/app_router_redirect_test.dart \
  test/features/auth/presentation/welcome_screen_test.dart \
  test/features/auth/presentation/screens/activate_plan_screen_test.dart
```

## Risk Assessment

Auth listener vs barrier: hold `_signInActive` until after custom sign-in returns; do not fetch onboarding until finalize (existing redemption deferral).

## Security Considerations

Do not log Dio body/token. Do not persist custom token. Session 401 must not globally sign out.
