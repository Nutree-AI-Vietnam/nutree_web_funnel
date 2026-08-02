# Paddle via RevenueCat: RevenueCat-First MVP Decision

Date: 2026-08-01
Status: approved revised direction
Scope: pre-deployment web checkout only

## Decision

Use Paddle.js solely for web billing and connect Paddle directly to RevenueCat.
Nutree backend receives RevenueCat webhooks and redeems the Paddle receipt through
RevenueCat after Firebase identity is proven. Nutree does not receive Paddle webhooks,
call Paddle for access, or grant from a Paddle subscription record in this MVP.

```text
Web onboarding -> Paddle Checkout -> RevenueCat temporary lead UUID
              -> RevenueCat webhook -> Firebase magic link
              -> Firebase UID -> RevenueCat receipt redemption -> `standard`
```

The opaque `funnel_lead_id` is the anonymous/temporary RevenueCat App User ID. It is
not an email, Firebase UID, or access credential. After claim, RevenueCat transfers
the verified purchase to the Firebase UID.

## Compatibility Contract

- Entitlement stays `standard`; Firebase UID remains the mobile RevenueCat identity.
- Existing Apple/Google sign-in, native purchase/restore, CustomerInfo providers,
  routes, and premium gates remain unchanged.
- Backend access remains RevenueCat cache/API only. New web purchases never create a
  direct Paddle access row.
- Existing RevenueCat webhook URL and authorization remain; HMAC rolls out through
  `observe -> accept_both -> required`.
- Current direct Paddle backend code is removed only after a clean environment audit
  proves it has no deployment, transaction, route-consumer, or portal dependency.
- Customer portal management is deferred to a later release; do not preserve a Paddle
  backend adapter merely for a future UI.

## Required Integration

1. Connect separate Paddle sandbox and production configurations in RevenueCat.
2. Attach Paddle prices to existing entitlement `standard`.
3. Enable automatic purchase and Paddle server-notification tracking.
4. Configure metadata field `funnel_lead_id` as RevenueCat App User ID.
5. Verify `Transfer to new App User ID` before release; do not change it silently.
6. Persist/dedupe each RevenueCat event, return `200`, then fetch current subscriber
   state before marking a lead paid or emailing the claim link.
7. Redeem stored `txn_...` or `sub_...` to RevenueCat under verified Firebase UID,
   then fetch `standard` and refresh existing CustomerInfo.
8. On authenticated cold start, recover a committed-but-pending claim through a
   non-secret UID-scoped backend projection before ordinary paywall routing.

## Release Sequence

1. Run the direct-Paddle cleanup audit. Any nonzero dependency blocks deletion and
   requires a separate legacy decision.
2. Prove anonymous UUID purchase, Firebase claim, receipt redemption, renewal,
   cancellation-through-expiry, refund, and pending recovery in sandbox.
3. Remove direct Paddle ingress/access fallback after the clean audit.
4. Run a small RevenueCat-only canary, then expand after privacy, latency, refund,
   crash-recovery, and native regression gates pass.

## Sources

- https://www.revenuecat.com/docs/web/integrations/paddle
- https://www.revenuecat.com/docs/platform-resources/server-notifications/paddle-server-notifications
- https://www.revenuecat.com/docs/integrations/webhooks
- https://www.revenuecat.com/docs/projects/restore-behavior

## Unresolved Questions

None. Exact dashboard IDs and the clean pre-deployment audit are release inputs.
