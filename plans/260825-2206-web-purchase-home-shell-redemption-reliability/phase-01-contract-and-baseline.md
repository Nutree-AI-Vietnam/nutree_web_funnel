---
phase: 1
title: Contract and baseline
status: completed
priority: P1
effort: 1-2d
dependencies: []
---

# Phase 1: Contract and baseline

## Overview

Freeze one versioned cross-repository contract and capture failing regression
tests for every **ship-blocking** defect before changing runtime behavior.

## Ship-first (revision)

Contract is thin:
1. Lead email is ownership authority.
2. Correlation = lead + anon RC app user + redeem-link digest after pay.
3. Eligibility = verified Firebase email/UID may consume this row (before redeem).
4. Finalize = atomic MealTrack grant; idempotent by purchase/hash+UID.
5. Home pending = inert shell; Home active = unlocked after refresh.

Do **not** require opaque preflight receipts or lease/CAS in Phase 1 fixtures
unless Phase 2 concurrency proves they are necessary.

## Context Links

- Master plan: [plan.md](./plan.md)
- Web runtime: `/Users/alexnguyen/Desktop/Nut/nutree_web_funnel/src/app/paywall/paywall-page-client.tsx`
- Backend routes: `/Users/alexnguyen/Desktop/Nut/mealtrack_backend/src/api/routes/v1/web_funnel.py`
- Mobile coordinator: `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/features/auth/application/services/web_purchase_redemption_coordinator.dart`

## Key Insights

- Reuse existing hash correlation, preflight, redeem-once, idempotency, and
  cold-start recovery; do not rebuild them.
- Existing plans disagree on legacy claim email, Google/Apple, passwordless,
  full-screen activation, and Home routing. This contract is authoritative.
- Home before authentication means a non-authoritative shell, not guest access.

## Requirements

- Define normalized-email ownership, API fields/errors, state transitions,
  repeat-purchase identity, expiry source, retry ownership, and completion proof.
- Never persist raw redemption URLs in web/backend/logs/analytics. Mobile may keep
  the capability only in encrypted, device-only, non-migrating secure storage
  with a seven-day maximum TTL and immediate deletion after terminal completion.
- Define a server-side checkout attempt (lead + anon customer + package + env)
  reserved before charge when easy; otherwise attach correlation immediately
  after successful `purchase()` with digest. One idempotency key per purchase
  at finalize.
- Eligibility binds UID to the redemption row before redeem; finalize selects
  that row by hash+UID (not “latest matching UID”). Deferred: opaque receipt
  tokens and lease generation/CAS unless tests force them.

## Architecture

Backend owns purchase/access truth. Web owns lead, checkout, and correlation.
Mobile owns capability consumption and presentation. Shared fixtures cover:
lead email, anon RC app user, redeem-link digest, payment verified, eligibility
bind, provider unknown/reconciled, finalized, expired/refunded, and typed
errors. Opaque preflight receipts / lease-CAS are deferred.

## Baseline snapshot (2026-08-25, no secrets)

| Repo | Revision | Notes |
|------|----------|--------|
| mealtrack_backend | `dde363f6` | Alembic tip `20260823000002`; flags `WEB_FUNNEL_REDEMPTION_ENABLED`, `WEB_FUNNEL_LEGACY_CLAIM_ENABLED`, `WEB_FUNNEL_REVENUECAT_ENVIRONMENT` |
| nutree_ai | `5505f7b31` | Coordinator exists; router still → `/auth/activate-plan` |
| nutree_web_funnel | `d516c32` (`feature/simplify-webtomobile-redemption`) | `NEXT_PUBLIC_REVENUECAT_REDEMPTION_ENABLED` kill switch |

Defect gates (tests): backend xfail hash+UID finalize; mobile skip Home shell;
web recovery-without-digest covered.

## Related Code Files

- Modify: `/Users/alexnguyen/Desktop/Nut/nutree_web_funnel/docs/web-checkout-production-setup.md`
- Modify: `/Users/alexnguyen/Desktop/Nut/mealtrack_backend/docs/external-services.md`
- Modify: `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/docs/contracts.md`

## Implementation Steps

1. Record current revisions, migration heads, flags, and provider identifiers
   without copying secrets.
2. Freeze canonical email, digest correlation, eligibility bind, and finalize
   by hash+UID (defer opaque receipt / lease-CAS).
3. Define `home_pending_auth` versus `home_active` data/action boundaries.
4. Add defect-gate tests (xfail/skip) for Home routing and hash+UID finalize;
   keep passing safety nets for digest-only correlation and email eligibility.
5. Inventory legacy claim endpoints as compatibility-only (no deletion).

## Tests Before

- Web: `npm test` plus new paywall/postcheckout component regressions.
- Backend: repository-venv web-funnel/schema/premium tests.
- Mobile: regenerate sources, then coordinator/router/UI/link tests.

## Todo List

- [x] Contract and fixtures approved by all repository owners.
- [x] Every defect has a failing test or explicit provider/device gate.
- [x] Deployed/provider state remains unproven until Phase 8.

## Success Criteria

- [x] No phase relies on legacy/custom-token or Google/Apple claim behavior.
- [x] Every transition has one owner, durable key, and recovery path.
- [x] `git diff --check` passes in each touched repository.

## Risk Assessment

Tests may preserve stale behavior. Compare every test to traced runtime and
replace historical assertions rather than carrying contradictions forward.

## Security Considerations

Keep verified identity, ownership, server provider truth, redaction,
redeem-once, and idempotency. Simplify everything else.

## Next Steps

Phase 2 publishes backend migrations and fixtures before client cutover.
