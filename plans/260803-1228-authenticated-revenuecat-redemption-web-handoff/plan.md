---
title: "Authenticated RevenueCat Redemption Web Handoff"
description: "Anonymous RevenueCat Web purchase correlation and safe redemption-link handoff to authenticated mobile redemption."
status: in-progress
priority: P1
branch: "feature/authenticated-revenuecat-redemption-web"
tags: [nextjs, revenuecat, checkout, sit]
blockedBy: []
blocks: []
created: "2026-08-03T05:29:32.579Z"
createdBy: "ck:plan"
source: skill
---

# Authenticated RevenueCat Redemption Web Handoff

## Overview

Web owns lead creation, checkout email, anonymous RevenueCat Web purchase, customer correlation, and secure redemption-link presentation. It never authenticates Firebase or grants app access from browser payment data.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Paid Customer Correlation](./phase-01-paid-customer-correlation.md) | In progress |
| 2 | [Safe Redemption Handoff](./phase-02-safe-redemption-handoff.md) | In progress |
| 3 | [Regression and SIT Validation](./phase-03-regression-and-sit-validation.md) | In progress |

## Dependencies

- Correlate through POST /v1/web-funnel/leads/{lead_id}/revenuecat-correlation using the existing server-held BFF credential and lead access key.
- Mobile owns Firebase sign-in and checkout-email matching.
- This supersedes 260803-0821-revenuecat-redemption-web-handoff; do not implement its unsupported checkout-attempt API assumptions.
