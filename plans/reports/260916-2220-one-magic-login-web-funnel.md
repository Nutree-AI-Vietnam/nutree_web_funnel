---
title: One magic login after guest web pay
status: superseded
superseded_by: plans/reports/260916-2259-rc-hash-silent-login.md
date: 2026-09-16
repos: [nutree_web_funnel, mealtrack_backend, nutree_ai]
source: brainstorm
---

# One magic login after guest web pay

## Summary

Keep quiz → email → anonymous RevenueCat pay. After pay, Nutree sends **one App/Universal Link**. Tap opens Nutree already signed in; app silently redeems the web purchase. Same checkout email attaches to an existing Google/Apple/email account. Do **not** flip `WEB_FUNNEL_LEGACY_CLAIM_ENABLED`.

This round: design report only. No `/ck:plan` until approved.

## Problem

Current producer path (Phase 6 contract):

```
RC redeem email → Home shell → type email → Firebase email → preflight → redeem → finalize
```

Buyer pays as guest, then does two emails and a re-type. Desired consumer path:

```
quiz → email once → guest pay → one Nutree email → app logged in + plan on
```

That UX is the retired magic-claim path (`docs/firebase-email-link-identity-handoff.md`). It was turned off because custom tokens created email-only users and refused Google/Apple (`providers - {"password"}` in `web_funnel_firebase_identity.py`). Reviving the flag repeats that hole.

## Locked requirements

| Item | Decision |
|---|---|
| Expected output this round | Brainstorm report only |
| Customer email after pay | One Nutree-signed App/Universal Link |
| RC customer redeem email | Hide; not the handoff |
| Existing same-email account | Attach; land as that Firebase UID |
| Quiz / paywall / IAP / ordinary sign-in | Out of scope |
| RC Web Billing / Paddle | Keep |
| Phase 9 destructive legacy delete | Out of scope |
| Last-subscription-wins rules | Unchanged |

Acceptance (when later implemented):

- Email entered only on web before pay.
- After pay, one Nutree email, one tap on phone (install + reopen same email if needed).
- No email re-type in app on happy path.
- Home is `home_active` with `standard` entitlement; onboarding not replayed.
- Existing Google/Apple/email user with that address gets the purchase on that UID.
- Wrong signed-in account cannot steal the redeem.
- Kill switch can restore current RC-email + passwordless path.

## Evaluated approaches

### A — Login-first Nutree link + server-held redeem (recommended)

After `purchase()` + hash correlation (existing):

1. Backend stores encrypted one-time RC redeem capability (today we persist **hash only**).
2. Outbox sends Nutree App/Universal Link with a **login** secret (hashed at rest, ~60 min, single use).
3. App `POST` exchange → Firebase **custom token for `get_user_by_email` UID**, or new verified email user if none.
4. `signInWithCustomToken` → force-refresh ID token.
5. Authenticated `GET` pending redeem → `parseAsWebPurchaseRedemption` → existing preflight / redeem once / finalize.

Pros: true one tap on fresh install; reuses preflight/finalize; existing-account attach is mint-for-that-UID, not merge; kill-switchable new producer.

Cons: persist redeem secret (policy change); custom token = inbox possession = account; must suppress RC’s own redeem email or buyers get two emails.

### B — Wrapper link (RC URL nested in Nutree link)

One email carries login secret + RC redeem URL. No server-held raw RC URL.

Pros: closer to current “capability is the link”.

Cons: RC token in mail clients/logs; longer links; still need custom-token login for no re-type; scanners may prefetch/burn.

### C — Flip `WEB_FUNNEL_LEGACY_CLAIM_ENABLED`

Old claim_email → exchange → complete. Fastest code path.

Reject. Completes **lead UUID claim**, not `redeemWebPurchase`. Identity service still conflicts Google/Apple. Competes with current producer (why Phase 6 existed).

## Recommended solution

**Approach A.** New producer beside current path. Flag e.g. `WEB_FUNNEL_MAGIC_LOGIN_ENABLED` (name TBD). Default off until SIT.

Identity rule (replaces “email-only providers only”):

- Lookup Firebase by checkout email.
- If found (any provider, verified, not disabled): mint custom token for **that UID**.
- If not found: create verified email user, mint for new UID.
- Finalize keeps current attach: `email_owner.firebase_uid == uid` else `EXISTING_ACCOUNT_REQUIRES_SIGN_IN` (should not fire if mint targeted the owner).

Redeem still only after authenticated preflight. Opening the email does not consume RC.

## Customer flow

```text
quiz → email (lead owner) → guest RC pay → correlate hash
  → Nutree magic email
  → tap App/Universal Link
  → silent sign-in as that email’s UID
  → silent preflight → redeem once → finalize
  → home_active
```

If app missing: store/TF install, reopen **same Nutree email**.

## Touchpoints (later plan)

- Web: `postcheckout-page-client.tsx`, paywall success copy, `/welcome` guidance; stop telling users to type email after RC mail.
- Backend: new outbox job (not gated `claim_email`); encrypted redeem capability; exchange that mints **owner UID**; keep `/v1/web-funnel/redemptions/preflight|finalize`.
- Mobile: `WebPurchaseRedemptionCoordinator` accept Nutree login link then fetch pending redeem; skip email prompt on this path.
- RC dashboard: disable customer redemption-link email if available; keep `customerEmail` for receipt.

Do not reuse `WEB_FUNNEL_LEGACY_CLAIM_ENABLED` as the ship switch.

## Risks

| Risk | Mitigation |
|---|---|
| Custom token = takeover of existing account if inbox compromised / mail forwarded | 60 min TTL, single use, revoke older generations, rate limit, no raw secrets in logs |
| RC still emails redeem link | Confirm dashboard/API suppress before cutover; otherwise UX is worse |
| Server stores redeem secret | Encrypt at rest, TTL, delete after redeem/expire; never return to unauthenticated clients |
| Phase 8 current-path SIT still open | Ship behind flag; do not delete current producer |
| Prefetch of magic link | Nonce + user-agent / app-only scheme; Universal Link must open app not a burnable HTTPS GET |

## Success metrics (implementation later)

- Happy path: 1 checkout email field, 1 Nutree activation email, 0 in-app email fields.
- Existing same-email Google/Apple: one tap, same UID, active web sub.
- Current path remains restorable via flag.

## Next

1. Approve this design (or reject A for B).
2. Then `/ck:plan --hard` — payments + auth + existing-account attach.
3. Do not implement until that plan is red-teamed.

## Unresolved

- Can RevenueCat Web Billing disable the customer redemption email while keeping `customerEmail` receipts?
- Exact secret storage: new column vs encrypted outbox payload.
- Whether HTTPS fallback page may render anything except “open Nutree” (must not complete login in browser).
