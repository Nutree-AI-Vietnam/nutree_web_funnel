---
title: "Survey Route Unification"
description: "Make `/survey/{language}` the single visible funnel path while preserving the current quiz, offer-timer, discount, and checkout behavior."
status: pending
priority: P1
effort: 2d
branch: "delivery"
tags: [feature, frontend, funnel, routing]
blockedBy: []
blocks: [260808-1037-web-funnel-onboarding-redesign]
created: "2026-08-08"
createdBy: "ck:plan"
source: skill
---

# Survey Route Unification

## Overview

Verified current state is mid-migration, not complete. Root already geo-redirects to
`/survey/{locale}` via `x-vercel-ip-country` (`src/app/page.tsx:6-9`), but
`/email`, `/welcome-gift`, and `/exit-offer` still hardcode `/survey/vi`
(`src/app/email/page.tsx:3-4`, `src/app/welcome-gift/page.tsx:3-4`,
`src/app/exit-offer/page.tsx:3-4`), `/quiz` still renders directly
(`src/app/quiz/page.tsx:11-12`), and there is no `src/app/survey/[language]`
route yet. The persisted store already has a `funnelScreen` state machine and
migration path (`src/lib/quiz/store.ts:9-16`, `50-75`, `91-107`), quiz
navigation already advances by screen state instead of route pushes
(`src/lib/quiz/navigation.ts:9-24`), and shared landing/email/welcome-gift
components already exist (`src/components/landing-page.tsx:56-66`,
`src/components/email-capture-screen.tsx:15-55`,
`src/components/welcome-gift-screen.tsx:12-45`). Paywall timer, exit-offer
claim state, and selected plan state remain session/cookie based in
`src/lib/revenuecat/web.ts:17-26`, `50-78`; any route consolidation must keep
those keys and the server-side paywall inputs from `src/app/paywall/page.tsx:14-25`.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Canonical Survey Route](./phase-01-canonical-survey-route.md) | Pending |
| 2 | [In-Route Funnel Screens](./phase-02-in-route-funnel-screens.md) | Pending |
| 3 | [Validation And Rollout](./phase-03-validation-and-rollout.md) | Pending |

## Dependencies

- Blocks `plans/260808-1037-web-funnel-onboarding-redesign/plan.md` because that
  plan still assumes visible `/quiz -> /email -> /welcome-gift -> /paywall`
  route ownership (`plans/260808-1037-web-funnel-onboarding-redesign/plan.md:37-44`).
- No backend blocker identified. Lead creation, safe lead projection, RevenueCat
  correlation, and post-checkout handoff stay on the existing code paths in
  `src/lib/api/client.ts:63-149`.
- Done means: every pre-checkout funnel entry resolves to `/survey/{language}`,
  direct legacy hits recover the right implicit screen, and paywall countdown,
  selected plan, exit-offer claim, and checkout completion behavior stay intact.
