---
phase: 1
title: Freeze cross-team identity contract
status: completed
priority: P1
effort: 4h
dependencies: []
---

# Phase 1: Freeze cross-team identity contract

## Overview

Freeze the identity boundary: email capture is a lead, Firebase Email Link is
authentication, and the verified Paddle webhook is the only payment authority.

## Requirements

- No web password or mandatory login before checkout.
- Email link must prove ownership of the checkout email before a lead is claimed.
- The backend must derive Firebase UID and email from a verified ID token.
- Native RevenueCat IAP remains independent; a Paddle web purchase must come from
  a backend entitlement, not from a fabricated RevenueCat receipt.

## Architecture

```text
web email -> lead_id -> Paddle customData -> verified Paddle webhook
  -> one claim email -> Firebase Email Link -> mobile Firebase session
  -> verified backend claim -> provider-neutral entitlement -> saved plan
```

## Related Code Files

- Create: `docs/firebase-email-link-identity-handoff.md`
- Reference: `docs/email-first-funnel-backend-handoff.md`
- Reference: `src/app/paywall/paywall-page-client.tsx`

## Implementation Steps

1. Agree on one environment-specific Firebase link domain and matching mobile app identifiers.
2. Adopt the request, response, state, security, and ownership contract in the handoff.
3. Record that the single-use claim token is opaque, short-lived, stored hashed,
   and absent from analytics, browser persistence, and logs.
4. Define support recovery for expired links, cross-device completion, and an
   already-linked Firebase account.

## Implementation Steps

<!-- Detailed steps -->

## Success Criteria

- [ ] Teams agree that the browser success redirect never grants access.
- [ ] Teams agree on staging and production Firebase projects/link domains.
- [ ] Each lead has at most one claimed Firebase UID without explicit recovery.
- [ ] Contract has no raw Paddle API key, Firebase UID, or claim token from an untrusted client.

## Risk Assessment

- Firebase action links and claim links are separate capabilities. Mitigate by
  completing Firebase Email Link first, then calling the backend with the short-lived claim token.
- Email delivery is retried. Mitigate with an outbox/idempotency key rather than
  emitting mail directly inside a webhook retry path.
