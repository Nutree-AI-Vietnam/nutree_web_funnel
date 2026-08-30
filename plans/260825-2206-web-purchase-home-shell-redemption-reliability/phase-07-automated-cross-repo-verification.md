---
phase: 7
title: Automated cross-repo verification
status: completed
priority: P1
effort: 1-2d
dependencies:
  - 2
  - 3
  - 4
  - 5
  - 6
---

# Phase 7: Automated cross-repo verification

## Overview

Verify final code with contract, migration, unit, component, analyzer, lint,
build, and review gates in all repositories.

## Context Links

- Backend testing standards: `/Users/alexnguyen/Desktop/Nut/mealtrack_backend/docs/testing-standards.md`
- Mobile runbook: `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/docs/runbook.md`
- Web commands: `/Users/alexnguyen/Desktop/Nut/nutree_web_funnel/README.md`

## Key Insights

- Generated Flutter source must be repaired before router/UI results are trusted.
- Focused green, full-suite green, CI, deployed code, and device proof are
  distinct evidence levels.

## Requirements

- Tests protect each state transition and cross-repository contract fixture.
- No ignored relevant failures, weakened baselines, fake provider proof, or
  secret-bearing artifacts.

## Architecture

Run dependency-ordered gates per repository, then shared fixture validation and
final code review. Failures return to the owning implementation phase.

## Test Scenario Matrix

| Scenario | Web | Backend | Mobile |
|---|---|---|---|
| Same email, fresh buyer | checkout/correlation | preflight/finalize | prompt/activate |
| Different email | recovery copy | reject before consume | wrong-email state |
| Existing account | canonical email | ownership preflight | correct UID |
| Second purchase | new checkout | new purchase row | refresh access |
| Missing link/correlation loss | no second charge | durable retry | reopen guidance |
| Network loss after redeem | stable UI | idempotent finalize | no second redeem |
| Expired/refunded | recovery | access denied | Home locked |
| Process death | N/A | monotonic state | recovery resumes |
| Provider outcome unknown | stable UI | reconcile exact purchase | no blind retry |
| Finalized, refresh fails | N/A | finalized receipt | Home stays locked/resumes |
| Wrong flavor/malformed | associations | no request | reject before UI |
| App absent/install | instructions | purchase retained | reopen resumes |

## Related Code Files

- All changed production/test/migration/config/docs files from Phases 2-6.
- Create a plan-scoped verification report under `reports/` with revisions,
  commands, counts, failures, and proof boundaries; redact all capabilities.

## Implementation Steps

1. Regenerate mobile sources and make focused compilation green.
2. Backend: focused routes/schemas/services/premium/webhooks, migration
   upgrade/downgrade, Ruff, Mypy target, CI-aligned unit suite.
3. Web: focused Vitest, full tests, lint, type/build; no Playwright/e2e.
4. Mobile: focused coordinator/router/prompt/Firebase/deep-link/subscription,
   analyzer, architecture guards, full Flutter tests.
5. Validate shared fixtures against all consumers.
6. Assert pending Home mounts zero dashboard/API/cache/HealthKit side effects;
   verify cancellation boundaries and finalize by hash+UID (not latest UID).
7. Run code review after tests; fix correctness findings and repeat gates.
8. Evidence unrelated baseline failures; never weaken gates or fabricate state.

## Tests Before / After

This phase is the consolidated regression gate. Tests-first details remain in
Phases 1-5; rerun the final implementation after Phase 6 producer shutdown.

## Todo List

- [x] Every scenario has automated coverage where feasible.
- [x] Shared fixtures pass all consumers.
- [x] Migration rollback and concurrency tests pass. *(reversible migration verified in-repo; live DB apply = Phase 8)*
- [x] Full gates green or unrelated failures evidenced.

## Success Criteria

- [x] No relevant compile, lint, analyzer, migration, or test failure remains.
- [x] No fake provider success is presented as release evidence.
- [x] Code review has zero unresolved correctness findings.

## Risk Assessment

Broad suites may include unrelated debt. Run focused gates first, diagnose full
failures, and never misreport the boundary.

## Security Considerations

Fixtures use synthetic emails/tokens; reports redact capabilities.

## Next Steps

Automated green is entry to Phase 8, not customer-readiness proof.
