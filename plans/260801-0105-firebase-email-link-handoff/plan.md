---
title: "Mobile-First Paid Web Magic-Link Handoff"
description: "Coordinate DOB-parity web onboarding, verified payment, Firebase custom-token sign-in, atomic profile restoration, and RevenueCat access."
status: pending
priority: P1
effort: "cross-repo 5-7w plus store review"
branch: delivery
tags: [feature, web, mobile, backend, auth, firebase, revenuecat, critical]
blockedBy: []
blocks: []
created: '2026-08-01T03:48:47.231Z'
createdBy: 'ck:plan'
source: skill
---

# Mobile-First Paid Web Magic-Link Handoff

## Overview

Keep checkout passwordless and onboarding mobile-compatible. Web collects exact
DOB on its existing age step, saves a pre-checkout lead/snapshot, and pays with
the current RevenueCat web channel. After verified `standard` fulfillment, the
backend emails one Nutree magic link. Mobile exchanges it for a Firebase custom
token, signs in, atomically restores profile/plan, refreshes existing RevenueCat
state, and opens home with no email re-entry, onboarding replay, or paywall.

## Scope Decision

- Mobile onboarding contract is canonical: `birth_year`, `birth_month`,
  `birth_day`; age is derived for display/TDEE preview only.
- Paid claim transport is a backend-owned App/Universal Link, not Firebase Email Link.
- Keep current web checkout, RevenueCat `standard`, Firebase Auth, Google/Apple,
  native purchase/restore/gates, automatic VN/other market behavior, and backend calories.
- Defer generic “Continue with email,” password auth, automatic account merge,
  deferred-link SDKs, payment redesign, and unrelated quiz/UI work.
- Web repo verification uses unit tests, lint, build, and focused browser checks;
  do not add or run Playwright/e2e.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Refreeze mobile-first identity and DOB contract](./phase-01-freeze-cross-team-identity-contract.md) | Pending |
| 2 | [Prepare DOB-parity web lead and safe handoff](./phase-02-prepare-web-email-link-handoff.md) | Pending |
| 3 | [Synchronize backend verified fulfillment and atomic claim](./phase-03-document-backend-fulfillment-and-claim.md) | Pending |
| 4 | [Ship compatible mobile custom-token claim before activation](./phase-04-document-mobile-sign-in-and-validation.md) | Pending |

## Coordinated Plans

- Backend: `/Users/alexnguyen/Desktop/Nut/mealtrack_backend/plans/260802-0135-paid-web-magic-link-claim-entitlement-backend/plan.md`.
- Mobile: `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/plans/260801-1137-firebase-email-link-claim-handoff-mobile/plan.md`.
- Research: [`researcher-mobile-first-dob-auth-contract.md`](./research/researcher-mobile-first-dob-auth-contract.md) and [`researcher-backend-web-magic-claim.md`](./research/researcher-backend-web-magic-claim.md).

## Delivery Order

1. Refreeze fixtures, DOB rules, endpoints, states, and security boundary.
2. Backend implements dark behind independent lead/email/exchange/complete flags.
3. Mobile implements and ships the compatible native build.
4. Web implements pre-activation work; staging/canary starts only after mobile availability.

## Red Team Review

### Session — 2026-08-02

**Findings:** 20 (20 accepted, consolidated into 12 corrective themes)
**Severity:** 9 Critical, 11 High, 0 Medium

| Theme | Disposition | Applied To |
|---|---|---|
| RevenueCat lead correlation and v2 transfer | Accept | Web 2, Backend 3/5/6 |
| Exchange retry and provisional recovery | Accept | Backend 4/5, Mobile 3/4 |
| Firebase identity conflicts and mobile auth barrier | Accept | Backend 4, Mobile 3/4 |
| Atomic UoW, web concurrency, legacy consumers, DOB mapping | Accept | Backend 2/5, Web 2, Mobile 3/5 |

Details: [`260802-mobile-first-magic-claim-red-team-adjudication.md`](./reports/260802-mobile-first-magic-claim-red-team-adjudication.md).

## Unresolved Questions

None. Environment hosts, minimum app version, and canary percentage are release inputs.
