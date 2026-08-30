---
phase: 6
title: Legacy retirement and docs
status: completed
priority: P2
effort: 1-2d
dependencies:
  - 2
  - 3
  - 4
  - 5
---

# Phase 6: Legacy retirement and docs

## Overview

Stop producing competing claims and consolidate documentation. Keep legacy
consumers/schema available through rollout; destructive removal moves to Phase 9.

## Context Links

- Active/legacy routes: `/Users/alexnguyen/Desktop/Nut/mealtrack_backend/src/api/routes/v1/web_funnel.py`
- Current web flow: `/Users/alexnguyen/Desktop/Nut/nutree_web_funnel/README.md`

## Key Insights

- Producer shutdown is reversible; credential-hash deletion is not.
- Released links/clients determine compatibility lifetime, not local code status.

## Requirements

- Stop new legacy magic/custom-token claim email and remove legacy UI producers,
  while keeping compatibility endpoints/data for issued links through rollout.
- Preserve native RevenueCat IAP and ordinary non-purchase email sign-in.
- Leave one evergreen contract and clearly mark historical plans/docs.
- Use expand/contract cleanup while released clients may call old routes.

## Architecture

Stop producing legacy work and instrument compatibility traffic. Phase 9 removes
consumers/routes/tables only after Phase 8 and maximum link/client adoption TTL.

## Related Code Files

- Backend: legacy routes/services, claim-email outbox, settings flags, models,
  migrations, tests, `docs/external-services.md`, `.env.example`.
- Web: `/welcome`, resend/status/reset BFF routes, projections, obsolete payment
  types, README and checkout docs.
- Mobile: activation route/screen, Google/Apple callbacks, duplicate handoff
  docs, auth-entry routing, and tests.

## Implementation Steps

1. Inventory deployed route calls, outbox rows, unexpired links, lead statuses,
   and released mobile versions.
2. Stop new legacy production with metrics and a rollback switch.
3. Retain compatibility through the longest issued-link TTL.
4. Remove legacy web/mobile consumers.
5. Consolidate README, setup, architecture, API, and tester runbooks.
6. Hand the audited compatibility inventory to Phase 9; delete nothing here.

## Tests Before / After

Add route/flag compatibility tests before disabling producers. After changes,
run each repository’s focused auth/redemption tests and documentation link scan.

## Todo List

- [x] Compatibility traffic/TTL evidence collection is active for Phase 9.
- [x] No new buyer can select `/welcome` or custom-token claim.
- [x] Native purchase and ordinary auth stay intact.
- [x] Superseded assumptions labeled historical.

## Success Criteria

- [x] One active producer, claim contract, and mobile presentation owner.
- [x] No setup doc can configure an incompatible flow.
- [x] Rollback can select compatibility because it is not yet deleted.

## Risk Assessment

Old inbox links may remain. Keep a TTL-aware compatibility window and return
fresh canonical recovery instructions.

## Security Considerations

Cleanup must not expose archived tokens/emails. Metrics remain aggregate.

## Next Steps

Phase 7 verifies final simplified code, not intermediate compatibility state.
