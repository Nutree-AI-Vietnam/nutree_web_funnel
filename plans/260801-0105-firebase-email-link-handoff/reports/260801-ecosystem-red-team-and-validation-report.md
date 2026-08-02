# Nutree RevenueCat-First Web Checkout Review

Date: 2026-08-01
Decision: approved development direction; not deployed

## Approved Flow

```text
Web onboarding -> personalized result -> paywall -> email capture
              -> Paddle payment -> RevenueCat temporary lead UUID
              -> verified RevenueCat webhook -> Firebase magic link
              -> Firebase UID -> RevenueCat receipt redemption -> `standard` active
```

Paddle owns the charge and billing lifecycle. RevenueCat owns entitlement lifecycle.
Nutree backend enforces RevenueCat-derived access and sends/reconciles the claim.
No direct Paddle-to-Nutree webhook, Paddle access cache, or second access authority
ships in this MVP.

## Compatibility Guarantees

- Keep entitlement `standard`, Firebase UID identity, existing Apple/Google auth,
  native purchase/restore, CustomerInfo providers, routes, and premium gates.
- New web purchases use opaque `funnel_lead_id` as temporary anonymous RevenueCat ID;
  after Firebase proof, the backend redeems the receipt into the Firebase UID.
- Do not create direct Paddle subscription rows for the new funnel or preserve a
  Paddle fallback in protected endpoints.
- Before removing the current direct Paddle backend implementation, run a clean
  environment audit. Any active transaction, config, portal consumer, or customer
  dependency blocks cleanup and requires a separate legacy decision.
- A committed pending claim has a non-secret UID-scoped recovery projection, so app
  crash/reinstall cannot send a paid buyer to the normal paywall or ask for repayment.
- Email-only customers receive generic returning Email Links after logout/reinstall;
  strict-to-dual identity rollback keeps this login available.

## Product Scope

- Paddle customer portal management is deferred. Do not retain a Nutree Paddle API
  merely for a future management screen; later UX must send web buyers to Paddle and
  native buyers to their original store.
- The browser never receives claim credentials, receipt tokens, Firebase UID, or a
  payment-success assertion before fetched RevenueCat state.

## Release Gates

1. Audit direct Paddle backend usage in every environment; only a clean report allows removal.
2. Sandbox: temporary UUID purchase, webhook/email, Firebase UID redemption,
   CustomerInfo refresh, renew, cancel-through-expiry, refund, replay, and outage.
3. Mobile: same-device, signed-out, app-absent, crash before/after redemption,
   reinstall, returning Email-only, and native Apple/Google regression paths.
4. Privacy: no email/token/link in browser storage, paths/queries, logs, analytics,
   crash reports, or support artifacts.
5. Production: small RevenueCat-only canary, then expand against latency/pending/
   refund SLOs. Normal release rollback preserves issued claims without enabling a
   direct Paddle access path.

## Validation

- Strict plan validation and local Markdown-link checks are rerun after this pivot.
- No source code, database migration, dashboard configuration, provider webhook, or
  production deployment was changed by this review.

## Unresolved Questions

None. The direct-Paddle audit and exact RevenueCat/Firebase/Paddle environment IDs
are required release inputs.
