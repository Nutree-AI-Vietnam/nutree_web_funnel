---
phase: 1
title: "Paid Customer Correlation"
status: in-progress
priority: P1
effort: "2d"
dependencies: []
---

# Phase 1: Paid Customer Correlation

## Overview

Retain canonical checkout email/lead state, configure RevenueCat Web with a generated anonymous ID, then correlate that paid customer through the existing backend BFF route.

## Requirements

- Keep checkout email and snapshot in the possession-bound lead flow.
- Use Purchases.generateRevenueCatAnonymousAppUserId(), never lead ID, for Web SDK configuration.
- After purchase, same-origin BFF forwards app_user_id to the backend correlation route with server-only credentials.
- Correlation is pending until backend acknowledgement. Do not create imaginary checkout-attempt APIs or expose private keys.

## Tests Before

- Generated ID, BFF secrecy, correlation replay, reload, and provider-unverified-customer tests.

## Implementation Steps

1. Audit existing lead/session BFF path and retain access-key ownership.
2. Make Web SDK initialization single-flight for checkout page lifetime.
3. Call BFF only after purchase and render only backend safe projection.

## Success Criteria

- [ ] One authorized lead is correlated with one paid anonymous customer.
- [ ] Checkout email cannot be replaced by browser/provider data.
- [ ] Browser sees no private backend credentials.
