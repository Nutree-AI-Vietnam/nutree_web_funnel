---
phase: 3
title: "Document backend fulfillment and claim"
status: pending
priority: P1
effort: "2d"
dependencies: [1]
---

# Phase 3: Document backend fulfillment and claim

## Overview

Give MealTrack a complete, implementation-ready contract. The backend team owns
lead storage, verified Paddle fulfillment, Firebase Admin action-link generation,
Resend delivery, Firebase-token claim verification, and entitlement projection.

## Related Code Files

- Handoff reference: `docs/firebase-email-link-identity-handoff.md`
- Existing backend reference: `src/api/dependencies/auth.py`
- Existing backend reference: `src/api/routes/v1/users.py`
- Existing backend reference: `src/infra/adapters/resend_email_adapter.py`
- Existing Paddle branch reference: `codex/paddle-fulfillment`

## Implementation Steps

1. Add a dedicated web-funnel bounded route/service/repository path; do not make
   API routes import infrastructure directly.
2. Persist leads and claims with a forward-only migration. Use a unique lead ID,
   normalized email, Paddle references, a nullable Firebase UID, and hashed claim
   token metadata.
3. In the verified `transaction.completed` path, deduplicate the event, mark the
   lead paid, create one outbox record, and only then dispatch the Firebase Email
   Link through Resend.
4. Generate action links with Firebase Admin using the environment's configured
   Firebase Hosting/custom link domain. Do not use retired Firebase Dynamic Links.
5. Require a Firebase Bearer token for claim completion. Read `uid`, `email`, and
   verified-email state from the decoded token, validate exact normalized email,
   atomically consume the claim, sync/create the user, and link Paddle records.
6. Expose an authenticated, provider-neutral entitlement response that reports
   whether paid access comes from Paddle or RevenueCat.
7. Emit structured events without email addresses, raw tokens, or action URLs.

## Implementation Steps

<!-- Detailed steps -->

## Success Criteria

- [ ] Invalid or unsigned Paddle deliveries do not mutate leads or send email.
- [ ] Replayed `transaction.completed` sends at most one active claim email.
- [ ] An expired, consumed, mismatched, or already-linked claim cannot grant access.
- [ ] A valid Email Link Firebase session obtains the Paddle entitlement after claim.

## Risk Assessment

- Current main backend has no Paddle routes; the existing `codex/paddle-fulfillment`
  branch must be reviewed/merged or reimplemented before claim work can be validated.
- Email link generation does not replace payment verification. Preserve webhook
  verification and out-of-order/idempotent event processing.
