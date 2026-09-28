---
title: SIT checklist — RC hash silent login
status: pending
plan: 260916-2306-rc-hash-silent-login
created: '2026-09-17'
---

# SIT checklist — RC hash silent login

Staging only. Do **not** set `WEB_FUNNEL_SILENT_LOGIN_ENABLED=true` in production.
Do **not** run this in the same staging slot as `260825` Phase 8 passwordless SIT.
Use a throwaway inbox. Never paste custom tokens or ID tokens into this file.

## Preconditions

- [ ] Staging MealTrack: `WEB_FUNNEL_REDEMPTION_ENABLED=true`,
      `WEB_FUNNEL_SILENT_LOGIN_ENABLED=true`,
      `WEB_FUNNEL_LEGACY_CLAIM_ENABLED=false`.
- [ ] Staging app build includes Phase 2 coordinator (session + AuthFlow custom).
- [ ] Fresh Firebase user or known existing Google/Apple account for attach cases.
- [ ] Device starts **signed out** (`FirebaseAuth.currentUser == null`), not anonymous.

## Shared hash goldens (local, before staging)

Same 64-hex in Vitest and Dart:

| Input | Expected SHA-256 |
|-------|------------------|
| `https://redeem.test/token` | `e0b11b09be73ee47d9380b59eef9590fb4eb42fa10734fca6cfbcb8cecf9d25b` |
| `rc-test://redeem_web_purchase?redemption_token=opaque` | `becc43a70131005e53d56a70e1f75bf7dfcd5d05f9b994f04966a15309d5882f` |
| HTTPS RC redirect wrapping the inner `rc-test://` URL | same as inner (`becc43a7…882f`) |

- [x] `npm test -- src/lib/revenuecat/redemption-handoff.test.ts` (web funnel) — 6 passed 2026-09-17
- [x] `flutter test test/features/auth/application/services/web_purchase_redemption_coordinator_test.dart` — plus session/scheme, 47 passed 2026-09-17

## Flag-on happy paths

### 1. New email, silent login

- [ ] Complete web checkout with a new throwaway email; tap the RC redeem mail on a signed-out device.
- [ ] App does **not** show the email overlay. No email fields.
- [ ] Decode the **ID token** (not the custom-token blob): `email` = lead email,
      `email_verified` = true, `sign_in_provider` = `custom`, claim `wf_silent_login` present.
      If any claim is missing, **stop** — patch identity; do not add email to the session JSON.
- [ ] Lands `home_active` with `standard` (or current paid offering). Onboarding is **not** replayed.
- [ ] Pass / Fail / notes:

### 2. Existing Google/Apple, same UID

- [ ] Checkout with an email that already has Google or Apple on Firebase.
- [ ] Signed-out redeem → silent custom sign-in of **that** UID (not a new `wf_` user).
- [ ] Pass / Fail / notes:

### 3. New-email silent, then later Google (same UID)

- [ ] After case 1 succeeds, sign in with Google using that Gmail.
- [ ] Firebase UID must stay the same (link/attach, not a second user).
- [ ] Pass / Fail / notes:

### 4. Different signed-in Nutree user

- [ ] Sign in as user B. Open user A's redeem link.
- [ ] No auto-switch. Redeem not consumed. Overlay / recoverable mismatch.
- [ ] Pass / Fail / notes:

### 5. Anonymous user

- [ ] `currentUser != null` and anonymous. Open redeem link.
- [ ] Overlay, **not** custom-token replace of the anonymous UID.
- [ ] Pass / Fail / notes:

### 6. Unknown or refunded hash

- [x] Open a non-correlated or refunded redeem URL while signed out.
- [x] Overlay. No custom token. Session 404.
- [x] Pass / Fail / notes: **Pass (device, 2026-09-17).** Staging flavor on
      `Alex local` simulator, signed-out Get Started screen. Opened
      `rc-6eb1beb650://redeem_web_purchase?redemption_token=sit-unknown-token`.
      UI: “Checking your account…” then email overlay (“Enter your checkout
      email…”, Email field, Send sign-in link). Live MealTrack OpenAPI (preprod /
      preview / prod) does **not** list `POST /redemptions/session` yet — 404 is
      missing-route, which still falls back to overlay. Happy-path mint needs a
      backend deploy + flag on.

## Kill switch and fallback

### 7. Flag off after a successful silent login

- [ ] Complete case 1 so the device has a custom session.
- [ ] Set staging `WEB_FUNNEL_SILENT_LOGIN_ENABLED=false` (do not also flip legacy claim).
- [ ] Retry redeem **and** a cold start into pending recovery (ID token
      `sign_in_provider=custom` must unstick even if `_usedSilentLogin` was
      lost). App **signs out** the custom session and shows the email overlay.
      Must **not** skip-to-preflight and stick on 403.
      Google/Apple 403 must stay signed in (recoverable).
- [ ] Pass / Fail / notes:

### 8. Flag off, never-silent device (Phase 8 passwordless)

- [ ] Separate staging slot from this flag-on run.
- [ ] `WEB_FUNNEL_SILENT_LOGIN_ENABLED=false`. Signed-out device with no prior custom session.
- [ ] Passwordless email-link still reaches preflight → redeem → finalize.
- [ ] Pass / Fail / notes:

## Stop conditions

- Missing ID-token claims after mint → identity bug; do not return email from session.
- Hash mismatch (session 404 on a real correlated purchase) → Dart/TS canonicalization; fix Dart, do not rewrite production web hashes.
- Anonymous or signed-in Google user signed out by this flow → coordinator probe / 403 mapping bug.
