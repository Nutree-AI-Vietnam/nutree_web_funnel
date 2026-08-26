---
title: Web Purchase Home-Shell Redemption Reliability
description: >-
  Ship a feasible anonymous RC web-to-app redemption flow with a safe Home
  shell, thin correlation, and pre-redeem eligibility — release-first.
status: in-progress
priority: P1
effort: 8-12d code plus staged release observation
branch: detached-worktree
tags:
  - bugfix
  - refactor
  - payments
  - auth
  - frontend
  - backend
  - mobile
  - critical
blockedBy: []
blocks: []
created: '2026-08-25T15:11:15.455Z'
updated: '2026-08-25T16:02:00.000Z'
createdBy: 'ck:plan'
source: skill
revision: ship-first-simplify-2026-08-25
---

# Web Purchase Home-Shell Redemption Reliability

## Overview

Ship one customer path that matches RevenueCat’s documented Web SDK pattern:

survey email → anonymous RC checkout (`purchases-js`) → thin correlation →
show/email redemption link → open app Home shell → Firebase email verify →
eligibility check → redeem once → finalize MealTrack access → refresh →
`home_active`.

Only `home_active` exposes customer data and premium actions. Onboarding stays
suppressed. Scope is flow defects that block release, not unrelated repo debt.

## Ship-first simplification (2026-08-25)

Keep the **jobs**, cut the **protocol theater**.

| Keep | Why | Cut / defer |
|------|-----|-------------|
| Thin correlation | Anonymous pay must join lead ↔ RC app user + link digest after charge | Auto hash reconstruction; competing recovery products |
| Pre-redeem eligibility | Wrong email must not burn redeem-once | Opaque “preflight receipt” product, lease/CAS/rebind v1 |
| Idempotent finalize | Retries must not double-grant | Separate finalize receipt ceremony beyond row+UID+hash |
| Home shell + email prompt | UX + locked premium until refresh | Full dashboard mount while pending |
| Independent checkout kill switch | Rollback without stranding paid users | Broad flag matrices |

**Correlation (thin):** After `purchase()`, attach idempotently: lead id, anonymous
`app_user_id`, environment, redemption-link **digest** (never raw URL). Rely on
RC’s purchase email / 60‑minute redeem link resend for capability recovery when
the browser is gone. Browser-loss without digest → support + no second charge
(not automatic reconstruction).

**Eligibility (preflight job, simpler API):** Before RC redeem, backend confirms
verified Firebase email matches lead, UID can own this row, purchase not
expired/refunded. Prefer **one mobile sequence**: eligibility → redeem →
finalize (eligibility may remain `POST /preflight` internally). No v1
purchase-scoped opaque receipt protocol unless concurrency tests force it.

**RC facts used (docs):** Anonymous ID + Redemption Links; Web SDK returns
`PurchaseResult.redemptionInfo` (no hosted redemption page); optional
`customerEmail` on `purchase()`; redeem links ~60 min, RC can email a new one;
mobile must register RC custom scheme before enabling anonymous checkout.

## Target State Machine

`checkout_draft -> payment_verified -> link_received -> home_pending_auth -> email_link_sent -> verifying_identity -> eligible -> redeeming -> finalizing -> refreshing_access -> home_active`

(`eligible` = pre-redeem checks; may be one API call named preflight.)

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Contract and baseline](./phase-01-contract-and-baseline.md) | Completed |
| 2 | [Backend integrity and migrations](./phase-02-backend-integrity-and-migrations.md) | Completed |
| 3 | [Canonical web checkout and correlation](./phase-03-canonical-web-checkout-and-correlation.md) | Completed |
| 4 | [Mobile Home-shell activation](./phase-04-mobile-home-shell-activation.md) | Completed |
| 5 | [Native and provider configuration](./phase-05-native-and-provider-configuration.md) | Completed |
| 6 | [Legacy retirement and docs](./phase-06-legacy-retirement-and-docs.md) | Completed |
| 7 | [Automated cross-repo verification](./phase-07-automated-cross-repo-verification.md) | Completed |
| 8 | [Staging and production SIT and rollback](./phase-08-staging-and-production-sit-and-rollback.md) | In Progress |
| 9 | [Post-rollout legacy removal](./phase-09-post-rollout-legacy-removal.md) | Pending |

## Dependencies

- Backend integrity (Phase 2) before client cutover.
- Mobile Home shell + native scheme (Phases 4–5) before production web checkout.
- Staging SIT before production enablement; checkout kill switch independent of
  paid recovery.
- Historical plans `260801-0105`, `260803-0821`, `260803-1228`,
  `260804-1700`, `260804-2200`, `260809-1525`, and `260810-1137` are
  superseded inputs. Reuse existing correlation/preflight/idempotency code;
  do not rebuild.

## Repository Ownership and Order

| Order | Repository | Owned phases |
|---:|---|---|
| 1 | `mealtrack_backend` | Completed |
| 2 | `nutree_ai` | Completed |
| 3 | `nutree_web_funnel` (Desktop workspace; not Codex worktree paths) | Completed |

## Release Boundary

**Code cook (Phases 1–7):** local/CI proof only.  
**Market release (Phases 8–9):** deployed revisions, RC email/webhook, DB
finalization, physical iOS/Android, store-install reopen-same-email, rollback
rehearsal. Phase 9 destructive cleanup stays post-observation.

## Red Team Review

### Session — 2026-08-25

**Findings:** 12 (12 accepted, 0 rejected); 4 Critical, 8 High.

| # | Finding | Severity | Applied To |
|---:|---|---|---|
| 1 | Pre-charge attempt and browser-loss recovery | Critical | Completed |
| 2 | Purchase-scoped preflight receipt/finalize | Critical | Completed |
| 3 | Explicit encrypted mobile capability policy | Critical | Completed |
| 4 | Inert Home shell, not hidden live dashboard | Critical | Completed |
| 5 | Email continuity must be decided before charge | High | Completed |
| 6 | Runtime flavor allowlist before persistence | High | Completed |
| 7 | Authoritative provider-unknown reconciliation | High | Completed |
| 8 | Cancellation cannot abandon consumed purchase | High | In Progress |
| 9 | Durable finalized-pending-refresh state | High | 2, 4, 7 |
| 10 | Independent checkout/recovery/legacy controls | High | 2, 3, 8 |
| 11 | Explicit preflight lease/CAS/rebind policy | High | 1, 2 |
| 12 | Destructive legacy cleanup only post-rollout | High | 6, 9 |

### Whole-Plan Consistency Sweep

- Files reread: `plan.md` and Phases 1-9.
- Decision deltas checked: 12 accepted findings.
- Reconciled: capability persistence, purchase identity, Home isolation,
  rollback controls, email authority, preflight recovery, cleanup order.
- Unresolved contradictions: 0.

## Validation Log

### Session 1 — 2026-08-25

**Trigger:** Hard-mode post-red-team validation using confirmed user decisions.

### Verification Results

- Tier: Full (9 phases; Fact Checker, Flow Tracer, Scope Auditor, Contract Verifier).
- Claims checked: 38.
- Verified: 38; Failed: 0; Unverified: 0.
- Verified current paths include web checkout/correlation, backend
  preflight/finalize/schema/flags, and mobile router/dashboard/recovery/refresh.

### Confirmed Decisions

- Link opens a safe Home shell with required email prompt; onboarding never appears.
- Protected data/actions remain locked until matching-UID entitlement refresh.
- Resolve flow defects needed to ship; post-rollout legacy cleanup stays Phase 9.
- Store-install fallback is reopen-the-same-email; no custom deferred-link service.
- **Revision:** keep thin correlation + eligibility; defer opaque preflight
  receipt / lease-CAS product until a real concurrency failure forces it.

### Whole-Plan Consistency Sweep

- Rechecked target state, dependencies, API/data identity, capability lifetime,
  phase ownership, test gates, rollout, rollback, and Phase 9 cleanup.
- Unresolved questions: 0.
