---
title: Firebase Email Link Web-to-App Identity Handoff
description: >-
  Plan a passwordless Firebase Email Link handoff from Paddle web checkout into
  NutreeAI mobile.
status: in-progress
priority: P1
effort: 4d
branch: delivery
tags:
  - feature
  - frontend
  - auth
  - api
  - critical
blockedBy: []
blocks: []
created: '2026-08-01T03:48:47.231Z'
createdBy: 'ck:plan'
source: skill
---

# Firebase Email Link Web-to-App Identity Handoff

## Overview

Keep the web funnel email-first and passwordless. After verified Paddle
fulfillment, the backend emails a Firebase Email Link that signs the customer
into NutreeAI mobile, where a verified server claim attaches the paid lead,
subscription, and saved onboarding data to the Firebase user.

Plan artifacts are web-repo only. Backend and mobile teams receive the contract
in [`docs/firebase-email-link-identity-handoff.md`](../../docs/firebase-email-link-identity-handoff.md);
this plan does not authorize changes in their repositories.

## Scope decision

- Existing: email capture, `lead_id`, Paddle custom data, a Resend adapter,
  Firebase token verification, Flutter Firebase Auth, and an `app_links` service.
- Minimum: one Firebase Email Link identity path, one server claim endpoint, and
  one backend entitlement refresh after claim.
- Deferred: web login, passwords, replacing Google/Apple, replacing RevenueCat
  for native IAP, account merging based only on an unverified email, and changes
  to unrelated checkout/quiz work.
- Existing `260713-2334-momo-hard-paywall-backend-contract` is historical MoMo
  contract work. It is not a dependency; this plan supersedes its identity-handoff
  assumptions only and preserves its payment-source-of-truth principle.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Freeze cross-team identity contract](./phase-01-freeze-cross-team-identity-contract.md) | Completed |
| 2 | [Prepare web email-link handoff](./phase-02-prepare-web-email-link-handoff.md) | Completed |
| 3 | [Document backend fulfillment and claim](./phase-03-document-backend-fulfillment-and-claim.md) | Pending |
| 4 | [Document mobile sign-in and validation](./phase-04-document-mobile-sign-in-and-validation.md) | Pending |

## Dependencies

- Firebase Email Link enabled in the matching staging and production Firebase projects.
- A Firebase Hosting/custom link domain per environment, authorized for the web
  continue URL and configured as an Android App Link / iOS Universal Link.
- Paddle webhook fulfillment deployed before a claim email is sent.
- Resend sender domain and backend Firebase Admin credentials configured per environment.

## Delivery order

1. Approve the contract and environment ownership.
2. Backend implements and deploys lead, fulfillment-email, claim, and entitlement work.
3. Mobile implements Email Link and claim handling against staging.
4. Web updates wording only after the backend staging lead endpoint exists.
5. Run cross-device staging validation before any production rollout.
