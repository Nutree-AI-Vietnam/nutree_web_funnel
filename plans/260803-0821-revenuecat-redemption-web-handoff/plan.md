---
title: "RevenueCat Redemption Web Handoff"
description: "Replace new-buyer magic-link email activation with an anonymous RevenueCat Web SDK purchase and Redemption Link handoff."
status: pending
priority: P1
branch: "delivery"
tags: [feature, frontend, auth, payments, critical, tdd]
blockedBy: []
blocks: []
created: "2026-08-03T01:21:24.480Z"
createdBy: "ck:plan"
source: skill
---

# RevenueCat Redemption Web Handoff

## Overview

Replace the new-buyer magic-claim email path with RevenueCat's anonymous Web
SDK purchase and Redemption Link. The web funnel retains its lead snapshot and
possession-bound BFF; it never grants app access or trusts browser payment data.

This supersedes the new-buyer portions of `260801-0105-firebase-email-link-handoff`.
Existing issued magic links remain supported until their configured expiry, then
their web UI and client calls are removed in the coordinated cutover.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Anonymous Checkout Correlation](./phase-01-anonymous-checkout-correlation.md) | Pending |
| 2 | [Redemption Success Experience](./phase-02-redemption-success-experience.md) | Pending |
| 3 | [Legacy Cutover and Web Validation](./phase-03-legacy-cutover-and-web-validation.md) | Pending |

## Dependencies

- Backend plan: `/Users/alexnguyen/Desktop/Nut/mealtrack_backend/plans/260803-0821-revenuecat-redemption-finalization/` publishes approved versioned correlation fixtures and finalization contracts before Phase 1 starts.
- Mobile plan: `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/plans/260803-0821-revenuecat-redemption-mobile-handoff/` must be store-released before production anonymous checkout is enabled.
- RevenueCat dashboard: sandbox Redemption Links, the exact custom schemes, product-to-`standard` mapping, and provider email/recovery behavior.

## Success Criteria

- A paid anonymous web customer sees a QR/Open Nutree path sourced from `redemptionInfo` only after correlation acknowledgement.
- Lead-to-web-customer binding is provider-verified, transaction-fenced, exactly once, and recoverable without retaining a browser payment capability; `lead_id` is never a RevenueCat App User ID.
- No magic token, custom Firebase token, raw redemption URL, or payment authority enters Zustand, analytics, logs, or browser persistence.
- Existing checkout/quiz localization and automatic market selection remain unchanged.

## Red Team Review

### Session — 2026-08-03

**Findings:** 10 (10 accepted, 0 rejected)  
**Severity breakdown:** 2 Critical, 6 High, 2 Medium

| # | Finding | Severity | Applied To |
|---|---|---|---|
| 1 | Durable checkout-attempt correlation | Critical | Phases 1, 3 |
| 2 | In-memory capability cannot cross the success route | Critical | Phase 2 |
| 3 | Do not expose redemption before correlation acknowledgement | High | Phases 1, 2 |
| 4 | Versioned BFF and safe-status contract required | High | Phase 1 |
| 5 | Server-owned product and transaction provenance | High | Phase 1 |
| 6 | Single-flight anonymous SDK initialization | High | Phase 1 |
| 7 | Analytics isolation for bearer-capability UI | High | Phase 2 |
| 8 | Cohort-sticky rollout and rollback | High | Phase 3 |
| 9 | Safe provider-error normalization | Medium | Phase 2 |
| 10 | Nested-null redemption and monotonic status handling | Medium | Phases 1, 2 |

### Whole-Plan Consistency Sweep

- Files reread: `plan.md`, `phase-01-anonymous-checkout-correlation.md`, `phase-02-redemption-success-experience.md`, `phase-03-legacy-cutover-and-web-validation.md`.
- Decision deltas checked: durable attempt ownership, post-purchase acknowledgement, non-persistent rendering, versioned browser-safe contract, capability isolation, and cohort-sticky rollback.
- Reconciled stale references: 3 (success-route transport, unconditional redemption exposure, and non-cohort rollback wording).
- Unresolved contradictions: 0.
