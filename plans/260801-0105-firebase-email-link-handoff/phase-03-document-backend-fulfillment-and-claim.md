---
phase: 3
title: "Synchronize backend verified fulfillment and atomic claim"
status: pending
priority: P1
effort: "1d coordination; implementation in backend plan"
dependencies: [1]
---

# Phase 3: Synchronize Backend Verified Fulfillment and Atomic Claim

## Context Links

- [Shared contract](./phase-01-freeze-cross-team-identity-contract.md)
- Backend plan: `/Users/alexnguyen/Desktop/Nut/mealtrack_backend/plans/260802-0135-paid-web-magic-link-claim-entitlement-backend/`

## Overview

Keep web projections and fixtures identical to the detailed backend plan: a
possession-bound DOB snapshot, verified RevenueCat fulfillment, direct magic-link
exchange, authenticated atomic completion, and post-commit RevenueCat outbox.

## Requirements

- Web lead create/status/resend never exposes raw email, browser key, magic token,
  custom token, exchange token, provider body, or account existence.
- RevenueCat webhook is durable wake-up; fetched active `standard` is payment/access truth.
- Exchange reserves the magic generation and mints a server-selected Firebase custom token.
- Exchange retry requires the same hashed client retry proof; Firebase custom claims
  bind post-sign-in recovery to the reservation without persistent device secrets.
- Completion requires fresh Firebase bearer plus `exchange_token`; it atomically
  restores user/profile/DOB/plan/onboarding and consumes the paid lead.
- Same UID replay returns committed result; different UID/conflict never silently merges.
- External Firebase/email/RevenueCat work is outside DB transactions with repair workers.
- RevenueCat v2 transfer moves source customer `lead_id` to target Firebase UID under
  unique outbox fencing; target `standard` fetch is required before active.

## Related Code Files

- No implementation files in web repo. Backend owns its linked six-phase plan.
- Update web API types/tests only when backend fixture is frozen.

## Implementation Steps

1. Compare field/state/error/link fixtures across backend/mobile/web before coding.
2. Verify backend flags allow dark deploy and independent stop of lead/email/exchange/complete.
3. Verify DOB validation and backend-derived age/calorie parity with native onboarding.
4. Verify webhook replay/order/refund, reservation, transaction rollback, outbox repair,
   conflict, same-user replay, and pending-access evidence.
5. Keep all web copy/status based on safe backend projection.

## Todo List

- [ ] Match exact fixtures and endpoint names.
- [ ] Prove verified payment and atomic claim boundaries.
- [ ] Prove independent scheduler/outbox recovery.
- [ ] Lock native webhook/access regression gates.

## Success Criteria

- [ ] Browser success never grants or claims payment.
- [ ] Duplicate events/exchanges/completions converge once.
- [ ] Partial DB state is impossible; external delay is recoverable pending.
- [ ] Existing native RevenueCat access remains unchanged.

## Risk Assessment

Provider/dashboard drift and cross-system timing require dated staging evidence;
local tests alone cannot mark fulfillment live-verified.

## Security Considerations

`funnel_lead_id` is correlation only. Token/email/provider canaries must be absent
from API logs, tracing, persistence plaintext, analytics, and error payloads.

## Next Steps

Mobile Phase 4 may integrate against dark staging; web activation still waits for mobile release.
Unresolved questions: none.
