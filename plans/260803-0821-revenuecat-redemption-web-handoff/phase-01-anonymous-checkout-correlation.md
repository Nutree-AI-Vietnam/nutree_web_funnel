---
phase: 1
title: "Anonymous Checkout Correlation"
status: pending
priority: P1
effort: "2d"
dependencies: []
---

# Phase 1: Anonymous Checkout Correlation

## Overview

Switch the Web SDK from the lead UUID to a RevenueCat-generated anonymous App
User ID and register a possession-bound, provider-verified, exactly-once lead
correlation that survives browser interruption.

## Requirements

- Keep `WebFunnelLead` creation, canonical onboarding snapshot, email capture, and `X-Lead-Access-Key` BFF ownership.
- Generate the anonymous ID with `Purchases.generateRevenueCatAnonymousAppUserId()`; do not invent a UUID or label a custom ID anonymous.
- Before checkout, create an access-key-bound server checkout attempt with a stable handoff mode, nonce/idempotency key, approved product/environment allow-list, and recovery identifier. The browser must not choose the authoritative product expectation.
- Bind only after checkout success. Backend verifies the candidate through its private RevenueCat client and atomically fences one lead, one RevenueCat customer, and the provider transaction/operation session.
- The backend contract defines a versioned request and whitelist-only response projection: all states, terminal/retryable semantics, idempotent `already_finalized`/conflict behavior, malformed/oversized request handling, generic error mapping, timeouts, rate limits, CSRF, and `no-store` behavior.
- The new handoff stays `correlation_pending` until the BFF acknowledges its provider-verified bind. A raw redemption capability is not rendered or enabled before that acknowledgement.

## Related Code Files

- Modify: `src/lib/revenuecat/web.ts`, its test, the paywall client that configures/purchases, `src/lib/api/client.ts`, `src/lib/quiz/types.ts`, and `src/lib/handoff/lead-projection.ts`.
- Modify: same-origin `src/app/api/web-funnel/*` BFF routes for checkout-attempt creation and the new correlation request.
- Coordinate: backend phase 1 contract; do not expose its private RevenueCat credentials to Next.js.

## Tests Before

- Lock the current lead-safe projection, no-access-key browser behavior, and market/offering selection tests.
- Add failing tests proving configuration receives an RC-generated ID rather than `lead_id`, correlation cannot be called without the BFF session, and every versioned backend state has a safe browser projection.
- Add failure/replay tests for a lost response, reload after payment, duplicate correlation, customer reuse across leads, mismatched product/environment, and a stale status response arriving after a newer terminal state.

## Refactor

1. Replace `configureRevenueCatForLead` with a narrowly named anonymous configuration helper. Keep its generated ID and initialization promise in a single-flight, page-lifetime ref so remounts, country resolution, and duplicate clicks cannot configure competing SDK instances.
2. Create the server checkout attempt before opening the SDK. On successful `purchase()`, send the opaque customer candidate plus provider transaction/operation-session facts and attempt idempotency proof through the same-origin BFF; the backend response remains a safe status projection.
3. Keep the browser's success state non-authoritative until the backend returns verified payment correlation. Retry/poll only with the server attempt and safe status; never persist customer, transaction, or redemption values in browser storage.

## Tests After

- Verify no lead ID becomes `appUserId`, failed/provider-pending correlations remain recoverable without a live browser capability, and raw customer/redemption values are not persisted.
- Verify initialization is stable under remount/country changes and correlation is exactly once for provider customer and transaction facts.

## Success Criteria

- [ ] Anonymous Web SDK configuration is deterministic per page and does not use `lead_id`.
- [ ] Correlation is access-key protected, server-verifies RevenueCat state, and atomically rejects customer/transaction reuse or mismatched attempt facts.
- [ ] Browser-safe correlation/status fixtures are versioned and recognize all coexistence states without exposing provider identifiers.
- [ ] Existing lead/session/reset safety tests pass.

## Risk Assessment

Web SDK purchase metadata and subscriber attributes are not authority. Treat the client candidate as a lookup hint only; server-issued attempt state and the backend's private RevenueCat read decide the state. A browser-only post-payment step is insufficient for recovery.

## Implementation Steps

1. Consume approved backend fixtures and add checkout-attempt/configuration/correlation tests before changing the Web SDK helper.
2. Implement stable anonymous configuration, the attempt creation route, and the BFF correlation request against the versioned backend contract.
