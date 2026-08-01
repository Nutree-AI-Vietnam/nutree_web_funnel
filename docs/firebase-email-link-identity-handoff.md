# Firebase Email Link identity handoff

## Decision

Nutree web remains an email-first acquisition funnel. Email typed on web is a
lead contact only. After a verified Paddle payment, MealTrack sends a Firebase
Email Link to that address. NutreeAI completes passwordless Firebase sign-in,
then calls MealTrack to claim the paid lead and its saved onboarding plan.

This replaces the requirement to use the same Google account as checkout. Google
and Apple remain optional existing mobile sign-in methods. Native IAP remains in
RevenueCat; a Paddle web entitlement remains backend-owned.

## Customer journey

```text
Web: quiz -> email -> lead -> Paddle Checkout
Paddle: verified transaction.completed webhook
Backend: mark paid -> create outbox -> send Email Link
Mobile: open link -> Firebase Email Link sign-in -> claim -> entitlement -> plan
```

The browser success redirect is not proof of payment and cannot grant access.

## Ownership

| Owner | Deliverable |
| --- | --- |
| Web funnel | Capture email, create lead, prefill Paddle, send `funnel_lead_id`, accurate copy |
| MealTrack backend | Lead/claim persistence, webhook fulfillment, email dispatch, token verification, entitlement |
| NutreeAI mobile | Email Link UX, App/Universal Link handling, Firebase sign-in, authenticated claim, entitlement refresh |
| Firebase/project owner | Enable providers, configure link domains and app identifiers per environment |

## Shared identifiers and states

| Value | Created by | Rule |
| --- | --- | --- |
| `lead_id` | MealTrack | Opaque high-entropy ID. Web/Paddle correlation only. |
| Paddle customer/subscription/transaction IDs | Paddle | Stored from verified webhook only. |
| `claim_token` | MealTrack | Opaque, single-use, short-lived. Store hash only. |
| Firebase UID | Firebase | Read from verified ID token only. Never accept from request JSON. |

Lead state: `draft -> checkout_started -> paid -> claim_email_sent -> claimed`.
Terminal/support states: `claim_expired`, `claim_revoked`, `claim_conflict`.

## API contract

### Create web lead

`POST /v1/web-funnel/leads` — unauthenticated and rate-limited.

```json
{
  "email": "person@example.com",
  "onboarding_payload": { "fitness_goal": "cut" },
  "source": "nutree_web_funnel"
}
```

```json
{
  "lead_id": "lead_...",
  "masked_email": "pe***@example.com"
}
```

Normalize email server-side. Repeated safe submissions may update the same draft
lead or return it, but must not create duplicate purchases. This endpoint does
not create a Firebase user or entitlement.

### Paddle Checkout metadata

```json
{
  "source": "nutree_web_paywall",
  "plan": "...",
  "funnel_lead_id": "lead_..."
}
```

Paddle custom data is correlation data, never price or access authority.

### Complete mobile claim

`POST /v1/web-funnel/claims/complete` — requires `Authorization: Bearer <Firebase ID token>`.

```json
{ "claim_token": "opaque-single-use-token" }
```

```json
{
  "claim_status": "claimed",
  "onboarding_payload": {},
  "entitlement": {
    "active": true,
    "provider": "paddle",
    "product_id": "pro_...",
    "expires_at": "2026-..."
  }
}
```

The server verifies the Firebase token, derives UID/email/verified-email state,
checks exact normalized email match with the paid lead, atomically consumes the
claim token, and upserts the existing app user before linking Paddle state. A
valid token with a different email returns `409 claim_email_mismatch`; it never
merges accounts automatically.

### Refresh entitlement

`GET /v1/me/entitlement` — Firebase-authenticated. Return active status,
provider (`paddle` or `revenuecat`), product/plan, expiry, and source revision.
The mobile client must call this after claim and must not infer a Paddle purchase
from RevenueCat customer info.

## Backend implementation checklist

1. Use the existing Firebase verifier in `src/api/dependencies/auth.py`.
2. Reuse the Resend adapter for a branded email; use Firebase Admin
   `generate_sign_in_with_email_link` to create the Firebase action URL.
3. Set action settings to use the selected Firebase Hosting/custom link domain,
   a production HTTPS continue URL, mobile platform identifiers, and in-app
   completion. Do not use Firebase Dynamic Links.
4. Execute verified webhook updates, payment state, and a deduplicated email
   outbox in one transaction. Dispatch mail after commit with retry metadata.
5. Make claim consumption transactional; lock or conditionally update the claim
   so concurrent opens cannot attach the lead twice.
6. Log event IDs/statuses only. Never log bearer tokens, action links, claims, or
   raw email in analytics/crash events.

## Mobile implementation checklist

1. Enable Firebase Email/Password and Email Link sign-in for each Firebase project.
2. Reuse `firebase_auth` and `app_links`; add Email Link methods to the auth
   repository and notifier, with resend and email re-entry UI.
3. Complete sign-in only after `isSignInWithEmailLink` succeeds. Firebase requires
   the original email to complete the link; do not place it in URL parameters.
4. Extend `DeepLinkService` before ordinary route mapping. Preserve only the
   transient opaque claim token while sign-in finishes.
5. Configure the chosen Firebase Hosting/custom domain as a browsable Android
   App Link and iOS Universal Link. The current Android manifest lacks a `VIEW`
   intent filter; iOS currently lists only `app.nutree.app`, so both need review.
6. Obtain a fresh Firebase ID token, claim server-side, hydrate onboarding, then
   refresh backend entitlement before routing through a hard paywall.
7. Keep Google/Apple provider conflicts explicit: sign into the existing account
   and link credentials, or use support recovery. Never create silent duplicates.

## Environment checklist

| Item | Preview/SIT | Production |
| --- | --- | --- |
| Firebase project | staging project | production project |
| Backend target | SIT backend | production backend |
| Paddle target | sandbox | live |
| Link domain | staging Firebase Hosting/custom domain | approved production Firebase Hosting/custom domain |
| iOS/Android identifiers | staging flavor IDs | production flavor IDs |
| Resend sender | test/approved staging sender | verified production sender |

Every link must stay within its environment. A production email link may not
open a staging app or call a staging backend.

## Required tests

- Verified Paddle payment produces exactly one claim email despite webhook replay.
- Failed, pending, refunded, or unsigned events produce no claim email/access.
- Same-device and cross-device Email Link completion both succeed.
- Expired, consumed, mismatched, and concurrent claims fail safely.
- Existing Google/Apple account with same/different email follows explicit conflict handling.
- A claimed Paddle purchase unlocks server entitlement even when RevenueCat has no web purchase.
- Android and iOS staging builds open the configured link domain.

## References

- [Firebase Email Link authentication for Flutter](https://firebase.google.com/docs/auth/flutter/email-link-auth)
- [Firebase action links with Admin SDK](https://firebase.google.com/docs/auth/admin/email-action-links)
- [Firebase Dynamic Links deprecation FAQ](https://firebase.google.com/support/dynamic-links-faq)
