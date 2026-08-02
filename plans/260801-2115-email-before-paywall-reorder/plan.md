---
title: "Email Before Paywall Reorder"
description: "Collapse the pre-checkout funnel so email capture flows straight to the RevenueCat paywall while keeping the confirmed-purchase Firebase handoff unchanged."
status: pending
priority: P1
effort: 4-6h
branch: "feat/secure-web-payment-handoff"
tags: [frontend, funnel, checkout, ux]
blockedBy: []
blocks: []
created: "2026-08-01"
createdBy: "ck:plan"
source: skill
---

# Email Before Paywall Reorder

## Overview

Docs already declare `quiz -> result -> email capture -> RevenueCat checkout` (`README.md:3`, `docs/superpowers/specs/2026-07-07-web-to-app-funnel-design.md:38`, `docs/firebase-email-link-identity-handoff.md:42`), but live code still inserts `/welcome-gift` between email capture and `/paywall` (`src/app/email/page.tsx:39`, `src/app/email/page.tsx:41`, `src/app/welcome-gift/page.tsx:42`, `src/app/welcome-gift/page.tsx:43`). This plan removes only that interstitial, keeps the persisted `lead.email` contract intact (`src/lib/quiz/store.ts:17`, `src/lib/api/client.ts:59`), and does not change purchase success, RevenueCat redemption, Firebase email-link send, or `/open-nutree` completion (`src/app/paywall/paywall-page-client.tsx:131`, `src/components/revenuecat-redemption-handoff.tsx:18`, `src/lib/firebase/email-link.ts:55`, `src/app/open-nutree/page.tsx:18`).

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Collapse pre-checkout route](./phase-01-collapse-pre-checkout-route.md) | Pending |
| 2 | [Preserve paywall offer messaging](./phase-02-preserve-paywall-offer-messaging.md) | Pending |
| 3 | [Regression validation](./phase-03-regression-validation.md) | Pending |

## Dependencies

- Phase order is strict: Phase 1 owns route flow, Phase 2 owns surviving offer copy/paywall framing, Phase 3 owns tests and release checks.
- No hard cross-plan blocker found. This plan is compatible with `plans/260801-0105-firebase-email-link-handoff/plan.md:1`, but it must not reopen that plan's post-payment identity contract.

## Success Criteria

- `/email` submit lands directly on `/paywall`; `/welcome-gift` survives only as a compatibility redirect.
- Paywall still communicates the welcome offer without showing plan selection before email capture.
- RevenueCat purchase, redemption modal, Firebase email-link send, and `/open-nutree` behavior remain byte-for-byte compatible from the paywall boundary onward.

## Rollback

Revert `EmailPage` navigation to `/welcome-gift`, restore the prior interstitial page body, and drop the paywall copy adjustments. No store migration or backend rollback is required because persisted lead shape and purchase APIs stay unchanged.
