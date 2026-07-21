# MoMo Hard Paywall Backend Contract Plan

Goal: keep the web funnel MoMo hard paywall direction documented while leaving
MealTrack backend code untouched for now.

Scope:

- Repo: `/Users/alexnguyen/Desktop/Nut/nutree_web_funnel`
- Backend implementation: deferred, no MealTrack files should be changed by this
  plan yet.
- Frontend direction: browser calls a backend-owned checkout contract and never
  stores MoMo credentials.
- Payment source of truth: verified server-to-server MoMo IPN, not the redirect
  back to `/momo/return`.

Existing-plan relationship:

- Supersedes the RevenueCat Web Billing portion of
  `docs/superpowers/plans/2026-07-07-web-to-app-funnel.md`.
- Does not supersede quiz, email capture, TDEE preview, Airbridge, or app claim
  handoff goals from that plan.

## Phase 1: Contract Freeze

Status: pending

Define the backend contract before touching MealTrack:

- `POST /v1/web-funnel/leads`
- `POST /v1/web-funnel/momo/subscription-checkouts`
- `GET /v1/web-funnel/payment-orders/{order_id}/status`
- `POST /v1/web-funnel/claim`
- `POST /v1/webhooks/momo/subscriptions`

Success criteria:

- Request/response schemas are documented.
- Error states are documented for unpaid, pending, failed, expired, and already-paid orders.
- Frontend does not require MoMo partner credentials.

## Phase 2: Backend Design

Status: pending

Design the MealTrack implementation without committing code yet:

- Tables: `web_funnel_leads`, `web_funnel_payment_orders`
- Verified IPN creates or links a user.
- Verified IPN writes a local active subscription.
- Subscription provider fields should not pretend MoMo is RevenueCat.
- Renewal/token handling stays deferred until the MoMo merchant contract is confirmed.

Success criteria:

- Migration shape is reviewed before implementation.
- Account-linking behavior is explicit for existing email users.
- Rollback path is clear: disable MoMo checkout creation without affecting app IAP.

## Phase 3: Frontend Alignment

Status: pending

Keep the web funnel compatible with the future backend:

- Hard paywall uses one monthly MoMo plan first.
- `/momo/return` polls backend status.
- `/success` stays locked until backend says paid.
- Vietnamese copy avoids free-trial and IAP language.

Success criteria:

- `npm run lint`
- `npm test`
- `npm run build`

## Phase 4: Production Readiness

Status: pending

Prepare the operational pieces after backend code is approved:

- MoMo sandbox and production env inventory.
- Public IPN URL and redirect URL.
- Confirmation email with claim-token fallback link.
- Support/admin view for pending or failed orders.
- Monitoring for checkout creation, IPN success, IPN signature failure, and status polling.

Success criteria:

- Sandbox MoMo payment confirms account creation.
- Failed and pending payments do not unlock app handoff.
- Production deploy can be rolled back by disabling checkout creation.

## Open Questions

- Does MoMo merchant support annual subscription cadence for this account, or should annual be one-time prepaid?
- Should backend-created MoMo users get Firebase custom-token login immediately, or should mobile claim attach after app auth?
- Should local `subscriptions` become provider-neutral before MoMo ships, or is a narrow compatibility record acceptable for v1?
