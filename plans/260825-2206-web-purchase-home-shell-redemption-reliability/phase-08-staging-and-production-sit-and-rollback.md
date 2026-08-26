---
phase: 8
title: Staging and production SIT and rollback
status: in-progress
priority: P1
effort: 2-3d plus observation
dependencies:
  - 7
---

# Phase 8: Staging and production SIT and rollback

## Overview

Prove the customer journey in staging on physical iOS/Android, then promote with
revision/config evidence, monitoring, and tested rollback.

## Context Links

- Web deploy guide: `/Users/alexnguyen/Desktop/Nut/nutree_web_funnel/README.md`
- Backend deployment behavior: `/Users/alexnguyen/Desktop/Nut/mealtrack_backend/README.md`
- Mobile release runbook: `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/docs/runbook.md`

## Key Insights

- Healthy endpoints and provider dashboards do not prove the customer journey.
- Checkout admission must roll back independently from paid recovery.

## Requirements

- Fresh single-use links and read-only evidence at every boundary.
- Physical iOS and Android, app-installed and app-absent journeys.
- Tested rollback that never strands already-paid customers.

## Architecture

Promotion order: backend migration/code -> mobile staging build -> web staging
redemption-only -> sandbox SIT -> backend production -> production-capable
mobile release -> production web enablement. Never enable web first.

## Staging SIT Matrix

1. Fresh email and sandbox purchase.
2. Existing Firebase/MealTrack account.
3. Wrong email then correct email.
4. App installed: cold, warm, backgrounded, process-killed.
5. App absent -> store -> launch -> reopen same email.
6. Firebase/RevenueCat link expiry and recovery.
7. Network loss before preflight, after redeem, and after finalize.
8. Duplicate tap/link and concurrent second purchase.
9. Refund/cancel/expiry lifecycle and premium removal.
10. Wrong-flavor iOS/Android rejection.

## Evidence Per Journey

- Web: Vercel revision, country/currency, one checkout, correlation response.
- Provider: RevenueCat customer/entitlement, email, webhook; Paddle only as
  underlying billing evidence.
- Backend: Render revision, migration head, logs, read-only finalized rows,
  authoritative expiry.
- Mobile: build/version, physical device/OS, ingress, Home shell, prompt, no
  onboarding, one redemption, access refresh, active Home.

## Related Code Files

- No speculative code ownership. Any SIT defect returns to its owning phase and
  repository; this phase owns deployment settings, runbooks, and evidence only.

## Tests Before / After

Automated Phase 7 must be green before SIT. After any fix, rerun the earliest
affected automated and device boundary before continuing promotion.

## Implementation Steps

1. Deploy backend staging and prove migration/revision.
2. Build/install matching mobile flavors and verify associations.
3. Enable staging web and execute matrix with fresh single-use links.
4. Fix every relevant defect and repeat from earliest affected boundary.
5. Monitor correlation, conflict, finalize, webhook lag, expired local access,
   and stuck pending state.
6. Rehearse rollback: disable new checkout but keep paid recovery/finalization.
7. Promote production in dependency order. User retains any live checkout;
   afterward verify transaction through entitlement and lifecycle.
8. Observe at least one renewal/expiry/refund before declaring cache proof.
9. Prove the independent admission kill switch stops new checkout while an
   already-paid attempt still correlates, preflights, finalizes, and refreshes.

## Todo List

- [ ] Physical iOS and Android staging matrices pass.
- [ ] App-absent recovery works without custom deferred linking.
- [ ] Revisions, migrations, mappings, and flags recorded.
- [ ] Rollback preserves already-paid customers.
- [ ] Production lifecycle proof complete and redacted.

## Success Criteria

- [ ] Home shell -> required email prompt -> active Home, with no onboarding.
- [ ] Exactly one purchase/redemption/finalization per journey.
- [ ] Database, provider, and mobile entitlement agree through lifecycle.
- [ ] No readiness claim relies only on local tests or healthy dashboards.

## Risk Assessment

Rollback could strand paid customers. Keep checkout kill switch separate from
correlation/preflight/finalize compatibility.

## Security Considerations

Use test accounts/redacted identifiers. Never retain raw emails, action links,
redemption URLs, payment tokens, or secrets in reports.

## Next Steps

After observation gates and compatibility TTL pass, execute Phase 9.
