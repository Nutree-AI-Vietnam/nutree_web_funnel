---
phase: 3
title: "Legacy Cutover and Web Validation"
status: pending
priority: P1
effort: "1.5d"
dependencies: [1, 2]
---

# Phase 3: Legacy Cutover and Web Validation

## Overview

Ship the web side only after backend/mobile staging evidence and remove new-buyer
magic-claim UI without invalidating already-issued links.

## Requirements

- Preserve feature-flagged rollback to the existing path until a compatible mobile release is adopted.
- Remove `requestLeadResend`, claim-email copy, and magic-token client assumptions only after the backend grace period closes.
- Define the exact server-owned rollout flag, default-off environment configuration, owner, cohort/lead stickiness, telemetry gates, and compatibility prerequisite. A global flip cannot rewrite the handoff mode of an already-started checkout attempt.
- During coexistence, the browser-safe response explicitly identifies its handoff kind and supports the complete old/new status matrix. Remove legacy statuses/UI only after backend evidence confirms no unexpired legacy customer can receive them.
- Do not add Playwright/e2e in this repository; use unit, lint, build, and focused manual/browser validation.

## Related Code Files

- Modify/delete: `src/app/welcome/welcome-status.tsx`, `src/lib/api/client.ts`, affected safe lead types/projection/copy/tests.
- Modify: README/env/release notes and all current web handoff/production-contract documents where they describe the replaced magic-link path.

## Tests Before

- Add regression tests for default-off flag selection, lead-cohort stickiness, rollback before/after purchase, correlation recovery, and the complete legacy/redemption handoff-kind status matrix.

## Refactor

1. Release backend and mobile first; enable anonymous web checkout only in sandbox/canary with the named server-owned flag and a persisted attempt handoff mode.
2. Validate a real mobile purchase, desktop QR, expiration, delayed webhook, correlation response loss, rollback at every checkout state, and recovery for paid anonymous cohorts.
3. After the documented grace window and backend data check, delete new-buyer claim-email UI, obsolete status mappings, and dead client calls; update all affected web contract documents in the same change.

## Tests After

- Run `npm run lint`, `npm test`, `npm run build`, and focused browser checks.

## Success Criteria

- [ ] Sandbox records prove end-to-end handoff for both app platforms.
- [ ] Legacy links remain valid only for their intended expiry period.
- [ ] Production enablement has a named default-off rollback flag, owner, cohort rules, and tested recovery for paid anonymous customers.
- [ ] Coexisting legacy and redemption leads render only their matching safe status/copy until the backend-confirmed removal condition.

## Risk Assessment

Do not infer purchase-email recovery from source. It is an external provider configuration gate and must be tested against the exact sandbox billing engine. Rollback protects future cohorts; server-persisted handoff mode and recovery protect already-paid cohorts.

## Implementation Steps

1. Gate the new flow behind released backend/mobile sandbox evidence and the approved rollout contract.
2. Remove legacy UI only after the grace window, backend data check, compatibility-matrix tests, and rollback checks complete.
