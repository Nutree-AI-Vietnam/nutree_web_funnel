---
type: brainstorm
title: RC redeem hash silent login
status: approved
date: 2026-09-16
repos: [nutree_web_funnel, mealtrack_backend, nutree_ai]
supersedes: plans/reports/260916-2220-one-magic-login-web-funnel.md
source: brainstorm
---

# Brainstorm: RC redeem hash → silent Firebase login

## Summary

Keep quiz → email → guest RevenueCat Web Billing. Customer’s **one** post-pay email is **RC’s redeem link**. App hashes that URL (already does), MealTrack maps hash → `lead.email`, mints a Firebase custom token for **that email’s existing UID** (Google/Apple/password) or a new verified user, app `signInWithCustomToken`, then today’s preflight → redeem once → finalize.

No Nutree/Resend activation mail. Do **not** flip `WEB_FUNNEL_LEGACY_CLAIM_ENABLED`. Email never goes in the RC URL. This round: report only.

## Problem

Current producer (signed-out):

```
RC redeem email → Home shell → type email → Firebase email
  → preflight(hash) → Purchases.logIn → redeemWebPurchase → finalize
```

Signed-in non-anonymous UID already skips email and runs that same `_startActivation` chain (`web_purchase_redemption_coordinator.dart`). Gap is **signed-out only**: no hash→session API; preflight rejects `sign_in_provider: custom`. Live order is **preflight then RC logIn**, not the reverse.

## Locked requirements

| Item | Decision |
|---|---|
| Expected output this round | This report only. No `/ck:plan` until asked. |
| Activation email | RC redeem email only |
| Nutree/Resend magic mail | Out. Supersedes report A. |
| Existing same-email Google/Apple/email | Attach: mint/sign-in as **that** Firebase UID |
| Email in redeem URL | No |
| RC Web Billing / Paddle | Keep |
| `WEB_FUNNEL_LEGACY_CLAIM_ENABLED` | Stays false. Do not reuse. |
| Quiz / paywall prices / IAP / ordinary sign-in / Phase 9 delete / last-sub-wins | Out of scope |
| Kill switch | Current RC + in-app email path restorable |

Acceptance (when later implemented):

- Email typed only on web before pay.
- After pay: one RC email, one tap (install + reopen same mail if needed).
- No in-app email retype on happy path.
- Land `home_active` with `standard`; onboarding not replayed.
- Existing Google/Apple/email user for that address gets the purchase on that UID.
- Wrong signed-in Nutree user cannot steal the redeem (no auto account-switch).
- Flag off restores today’s passwordless email path.

## Evaluated approaches

### A — Hash POST → custom token → existing redeem (approved)

Reuse `_runActivation` order (do not invert):

```text
tap RC link
  → app hashes canonical URL (nested `url` unwrap, SHA-256)  [exists]
  → if signed in (non-anonymous): existing path
       preflight → alignRevenueCat/logIn → redeem once → finalize
       preflight ineligible → wrong-account stop (do not mint / do not switch)
  → if signed out: POST hash → custom token (no email in response)
       → signInWithCustomToken → force-refresh ID token
       → same _runActivation: preflight → logIn → redeem once → finalize
```

Identity (new helper; do **not** call `WebFunnelFirebaseIdentityService.resolve`):

- `get_user_by_email(lead.email)`
- If found, verified, not disabled: `create_custom_token(that uid)` — any provider.
- If not found: `create_user(email=..., email_verified=True)` (Firebase auto UID, not `wf_` prefix), then mint.
- If found but unverified/disabled: refuse (same class as today).

API:

- New unauthenticated `POST /v1/web-funnel/redemptions/session` (name TBD). Body: `redemption_link_hash`. Rate-limit. 404 for unknown/finalized. Return `{ custom_token }` only.
- Preflight/finalize: add `custom` to `_is_supported_redemption_provider`. Keep fresh token, `email_verified`, email == lead.email.
- Flag e.g. `WEB_FUNNEL_SILENT_LOGIN_ENABLED` (default off). Not the legacy claim flag.

Why A: hash already stored; RC already mails the capability; prefetch hits RC not MealTrack (exchange is app POST); smallest three-repo delta.

### B — Ticket + App Check before mint

Same as A plus opaque ticket + Play Integrity/DeviceCheck. Extra table/round-trip. Defer until exchange is abused.

### C — Nutree/Resend App Link (old report A)

Second customer email + encrypted redeem secret. Rejected: RC is the one tap.

## Customer flow

```text
quiz → email (lead) → guest RC pay → correlate hash
  → RC redeem email
  → tap link (Universal/App Link into Nutree)
  → silent session as that email’s UID (signed-out only; signed-in already skips email)
  → preflight → logIn → redeem once → finalize
  → home_active
```

App missing: store/TF install, reopen **same RC email**.

## Touchpoints (later plan — not this round)

| Repo | Change |
|---|---|
| `mealtrack_backend` | Session endpoint; lookup-or-create identity (any provider); allow `custom`; silent-login flag; tests |
| `nutree_ai` | Signed-out branch only: before `emailEntry`, exchange + `signInWithCustomToken`, then existing `_startActivation`. Keep wrong-account. |
| `nutree_web_funnel` | None required (hash + `customerEmail` already). `/postcheckout` still tells passwordless; copy out of this design. |

Do not reuse `WEB_FUNNEL_LEGACY_CLAIM_ENABLED`. Do not return raw email from the unauthenticated lookup.

## Risks

| Risk | Mitigation |
|---|---|
| Inbox possession = Nutree login for that email | Treat RC URL as magic link. POST only, rate-limit, no raw URL/hash in logs, 404 on reuse/finalize |
| Custom-token ID token missing `email` / `email_verified` | SIT must assert claims. If missing: `update_user` before mint |
| `create_custom_token` on unknown UID creates a user **without** email | Always `create_user` with email first |
| Signed-in wrong user | Never auto `signInWithCustomToken`; existing wrong-account UI |
| Mail prefetch | Exchange is POST from app; HTTPS GET of RC URL must not hit MealTrack |
| Current path SIT still open | Ship behind flag; keep email-entry producer |

## Success metrics (implementation later)

- Happy path: 1 web email field, 1 RC mail, 0 in-app email fields.
- Same-email Google/Apple: one tap, same UID, active web sub.
- Flag off = today’s flow.

## Next

1. This design is **approved (A)**.
2. `/ck:plan` later — auth + payments; lock current tests first (`--tdd`).
3. Do not implement until that plan exists.

## Unresolved

- Exact route name (`/redemptions/session` vs `/redemptions/identity`).
- Whether custom-token ID tokens include `email` on this Firebase project (prove in SIT).
- Flag default and remote-config vs backend-only.

## Scout notes (post-approval)

Confirmed live: web never puts email in the redeem URL; correlate is hash + anonymous `app_user_id`. MealTrack has no unauth hash→token route; legacy `claims/exchange` is magic_token + Google/Apple reject. App `signInWithCustomToken` is not in `lib/` (mocks/docs only). Deep links: RC custom scheme `rc-*`, then Home overlay.
