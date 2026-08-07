---
phase: 3
title: "Regression and SIT Validation"
status: in-progress
priority: P1
effort: "1.5d"
dependencies: [1, 2]
---

# Phase 3: Regression and SIT Validation

## Overview

Validate the web handoff with released mobile staging builds while keeping legacy magic-link checkout available until cutover evidence exists.

## Requirements

- New redemption checkout stays default-off and cohort-sticky until SIT evidence.
- Do not add Playwright/e2e; use npm run lint, npm test, npm run build, and focused manual/browser checks.
- Validate purchase, correlation, mobile open, email match, confirmation, webhook, finalization, and Home.
- Remove legacy UI only after grace-period and rollback approval.

## Implementation Steps

1. Add flag/cohort and legacy/new status regression coverage.
2. Run lint, unit tests, build, and focused browser checks.
3. Record sandbox correlation/webhook/finalization evidence before production canary.

## Success Criteria

- [ ] Browser purchase never grants app access alone.
- [ ] Mobile CTA and desktop QR complete in sandbox.
- [ ] Legacy customers remain supported through approved cutoff.
