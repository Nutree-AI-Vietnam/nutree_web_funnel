---
title: "Onboarding V2 Age Split and Web Snapshot Contract"
description: "Split the onboarding-v2 sex + DOB capture into separate mobile-first screens while adding an additive age-capable web snapshot contract."
status: pending
priority: P1
effort: 3d
branch: "delivery"
tags: [feature, frontend, backend, api, critical]
blockedBy: []
blocks: [260808-1037-web-funnel-onboarding-redesign]
created: "2026-08-07"
createdBy: "ck:plan"
source: skill
---

# Onboarding V2 Age Split and Web Snapshot Contract

## Overview

Verified current state: the live quiz already routes `sex` -> `age`, but the
active `age` screen still collects full DOB (`src/components/steps/registry.tsx:73`,
`src/components/steps/birth-date-step.tsx:17`). The unused onboarding-v2
`BodyBasicsStep` is stale and unsafe to revive because it writes numeric age
into `birth_year` (`src/components/steps/final-web-steps.tsx:30`,
`src/components/steps/final-web-steps.tsx:64`).

Recommended implementation: keep live `sex` and `age` slugs, replace DOB UI
with a mobile-first age screen, add an additive backend `web_onboarding_snapshot_v2`
contract for age-only web leads, and leave `UserProfile.date_of_birth` null for
web-origin profiles instead of fabricating DOB
(`/Users/alexnguyen/Desktop/Nut/mealtrack_backend/src/infra/database/models/user/profile.py:38`).

## Scope Challenge

- Existing code: mobile-first wheel input already exists in `MetricInput`
  (`src/components/steps/metric-input.tsx:31`); TDEE preview already speaks age
  (`src/lib/api/client.ts:37`); lead handoff still stores DOB
  (`src/lib/api/client.ts:94`).
- Minimum change set: do not rename routes, do not rewire paywall/redemption
  flows, and do not fabricate DOB.
- Complexity: 2 repos, 10+ touched files, 1 additive request-contract change,
  focused regression coverage in both repos.
- Selected mode: HOLD.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Freeze Scope and Contract](./phase-01-freeze-scope-and-contract.md) | Pending |
| 2 | [Implement Web Age-First Split](./phase-02-implement-web-age-first-split.md) | Pending |
| 3 | [Backend Snapshot Compatibility and Validation](./phase-03-backend-snapshot-compatibility-and-validation.md) | Pending |

## Dependencies

- Scout report: [`../reports/scout-260807-onboarding-v2-age-split.md`](../reports/scout-260807-onboarding-v2-age-split.md)
- Cross-repo required: `/Users/alexnguyen/Desktop/Nut/mealtrack_backend` phase 3
  work must ship before the web request payload changes.
- No hard plan blockers recorded. Existing passwordless redemption plans remain
  compatible if the backend keeps dual-read support for snapshot v1 and v2.
- Rollback path: keep backend dual-read support in place; the web app can revert
  to DOB capture independently if the age-first rollout fails.

## Unresolved Decisions

- Keep live `sex` / `age` route slugs or rename to spec-only `body_basics` /
  `body_metrics`?
- Keep web validation at `18-100`, or broaden the new web snapshot validator?
- Should mobile later prompt web-origin users to backfill DOB after claim?
