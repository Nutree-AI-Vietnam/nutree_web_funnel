---
phase: 2
title: Backend integrity and migrations
status: completed
priority: P1
effort: 3-4d
dependencies:
  - 1
---

# Phase 2: Backend integrity and migrations

## Overview

Make MealTrack finalization correct for expiry, repeat purchases, existing
accounts, retries, and lifecycle updates before client cutover.

## Context Links

- Contract: [Phase 1](./phase-01-contract-and-baseline.md)
- Routes: `/Users/alexnguyen/Desktop/Nut/mealtrack_backend/src/api/routes/v1/web_funnel.py`
- Model: `/Users/alexnguyen/Desktop/Nut/mealtrack_backend/src/infra/database/models/web_funnel_claim.py`
- Completion: `/Users/alexnguyen/Desktop/Nut/mealtrack_backend/src/infra/services/web_funnel_redemption_completion.py`

## Key Insights

- `expires_at=None` may become lifetime local access if lifecycle sync fails.
- Global UID uniqueness models one purchase per user, not one claim per purchase.
- Existing-account conflict is later than provider consumption.
- Preflight must recover abandoned identities without enabling reassignment.

## Requirements

- Persist authoritative expiry/lifecycle identity at finalization.
- Allow multiple purchase rows per Firebase UID; keep each purchase single-owner.
- Resolve MealTrack/Firebase email ownership during eligibility (preflight).
- Keep finalization atomic, idempotent, provider-reverified, and concurrency-safe.
- Prefer attaching correlation after successful purchase; add a pre-charge attempt
  record only if needed to block double-checkout on retry.
- Eligibility binds UID + email to the exact redemption row; finalize uses that
  row (hash + UID). **Defer** opaque short-lived receipt tokens and lease
  generation/CAS to a follow-up if abandoned-preflight races appear in staging.
- Email-only automatic reassignment remains forbidden.
- Split controls: new checkout admission vs paid recovery/finalize. No legacy
  column removal in this phase.

## Architecture

Migration drops global UID uniqueness on redemptions/leads and indexes
hash+preflight for finalize. Finalize selects exact row by
`redemption_link_hash` + `preflight_uid`. Subscription stores RC
`expires_at`. Checkout admission flag is independent of paid recovery.
Opaque receipts / lease-CAS / pre-charge attempt records remain deferred.

## Related Code Files

- Modify: `/Users/alexnguyen/Desktop/Nut/mealtrack_backend/src/infra/database/models/web_funnel_claim.py`
- Modify: `/Users/alexnguyen/Desktop/Nut/mealtrack_backend/src/infra/database/models/subscription.py`
- Modify: `/Users/alexnguyen/Desktop/Nut/mealtrack_backend/src/infra/services/web_funnel_redemption_service.py`
- Modify: `/Users/alexnguyen/Desktop/Nut/mealtrack_backend/src/infra/services/web_funnel_redemption_completion.py`
- Modify: `/Users/alexnguyen/Desktop/Nut/mealtrack_backend/src/app/services/web_funnel_redemption_verification.py`
- Modify: `/Users/alexnguyen/Desktop/Nut/mealtrack_backend/src/api/middleware/premium_check.py`
- Create: timestamped migration under `/Users/alexnguyen/Desktop/Nut/mealtrack_backend/migrations/versions/`
- Modify focused route/schema/service/premium tests under `/Users/alexnguyen/Desktop/Nut/mealtrack_backend/tests/unit/`.

## Implementation Steps

1. Add failing expiry, repeat-purchase, ownership-conflict, concurrent-finalize,
   refund, and webhook-lag tests.
2. Audit current schema/data for duplicates and null expiry.
3. Write reversible migration and validate upgrade/downgrade on a safe snapshot.
4. Move canonical email/account conflict into eligibility (preflight).
5. Keep simple UID bind on the redemption row; add CAS/lease only if needed.
6. Provider unknown: reconcile before retry consumption; no blind re-redeem.
7. Parse/store RevenueCat expiry; reject expired local cache despite webhook lag.
8. Finalize selects exact row; persist pending-refresh until client confirms
   active access when already modeled — avoid new state machines unless required.
9. Independent checkout-admission vs paid-recovery controls.
10. Run focused tests, Ruff, Mypy target, and Alembic head checks.

## Tests Before / After

- Before: prove null expiry, second purchase, and late ownership conflict fail.
- After: focused pytest, migration upgrade/downgrade, Ruff changed files, Mypy.

## Todo List

- [x] Migration reversible and data audit documented.
- [x] Conflict blocks before provider consumption.
- [x] Expired/refunded rows cannot remain premium.
- [x] Same UID can finalize a later distinct purchase.
- [x] Finalize cannot select “latest matching UID”; exact hash+UID selects one row.
- [x] Turning checkout off leaves paid recovery/finalize online.
- [x] Opaque preflight receipt / lease-CAS **not** required for this phase exit.

## Success Criteria

- [x] Finalize returns active only with current provider entitlement and expiry.
- [x] Duplicate retries return prior result without duplicate side effects.
- [x] Writes commit/rollback atomically through existing unit-of-work rules.

## Risk Assessment

Relaxed UID uniqueness could permit duplicate ownership. Retain unique purchase
identity/hash, row locking, and concurrent finalization tests.

## Security Considerations

Keep verified-email, fresh/revocation-checked token, provider fetch, and hash
matching. Simplify data shape, not ownership proof.

## Next Steps

Deploy backend/migration to staging before enabling Phase 3 or 4 clients.
