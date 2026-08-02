---
phase: 3
title: "Regression validation"
status: pending
priority: P1
effort: "1-2h"
dependencies: [1, 2]
---

# Phase 3: Regression validation

## Context Links

- Current test harness: `package.json:10`, `vitest.config.ts:8`
- Existing route contract test: `src/lib/quiz/steps.test.ts:41`
- Existing lead-locality test: `src/lib/api/client.test.ts:105`
- Existing success-copy test: `src/lib/copy/email-copy.test.ts:15`
- Post-payment email-link send path: `src/components/revenuecat-redemption-handoff.tsx:18`, `src/lib/firebase/email-link.ts:55`

## Overview

Add only the regression coverage this repo can already run: Node-only `.test.ts` unit tests plus one build pass and a short manual smoke matrix. Do not widen the harness to jsdom/TSX unless implementation proves a tiny pure helper is impossible.

## Key Insights

- The repo runs Node-only Vitest and includes only `src/**/*.test.ts` (`package.json:10`, `vitest.config.ts:9`, `vitest.config.ts:10`).
- Existing tests already pin the last quiz step to `/email`, prove email stays local before checkout, and assert that the secure sign-in email is described only after verified payment (`src/lib/quiz/steps.test.ts:41`, `src/lib/api/client.test.ts:105`, `src/lib/copy/email-copy.test.ts:15`).
- There are no page-level TSX tests today, so broadening the harness would be extra scope for a route reorder this small.

## Requirements

- Functional: automated coverage must still prove email comes before paywall, and success messaging still says Firebase sign-in email happens only after verified payment.
- Non-functional: stay inside current Node `.test.ts` harness unless a tiny pure helper extraction is needed; run `npm test` and `npm run build`; manual smoke covers the page redirects the current harness cannot render.

## Architecture

Test matrix:
- Unit: keep `nextRoute('result') === '/email'` (`src/lib/quiz/steps.test.ts:41`) and add a pure test for any extracted post-email route helper or legacy `/welcome-gift` redirect decision.
- Unit: update copy assertions so email copy describes secure checkout continuation while `success.body` still says payment verification precedes the sign-in email (`src/lib/copy/email-copy.test.ts:15`).
- Manual integration: smoke `result -> /email -> /paywall`, direct `/welcome-gift`, leadless `/paywall`, and successful checkout modal -> Firebase email-link send path (`src/app/paywall/paywall-page-client.tsx:131`, `src/components/revenuecat-redemption-handoff.tsx:20`).

## Related Code Files

- Modify: `src/lib/copy/email-copy.test.ts`
- Optional modify only if wording/comments need clarity: `src/lib/quiz/steps.test.ts`
- Optional create only if implementation extracts pure redirect logic: `src/lib/funnel/pre-checkout-route.ts`
- Optional create only if helper is added: `src/lib/funnel/pre-checkout-route.test.ts`
- No change: `src/lib/firebase/email-link.test.ts`

## Implementation Steps

1. Keep the explicit assertion that the last quiz step exits to `/email` so the paywall cannot slide ahead of email capture (`src/lib/quiz/steps.test.ts:41`).
2. If Phase 1 extracts a tiny pure redirect helper, add a matching `.test.ts` for `email -> /paywall` and `legacy /welcome-gift -> /paywall|/email`; otherwise rely on manual smoke instead of expanding the harness.
3. Update `email-copy.test.ts` so it rejects stale reveal/scratch wording on the email step while preserving the current verified-payment success assertions (`src/lib/copy/email-copy.test.ts:15`).
4. Run `npm test` and `npm run build`, then manually smoke the four critical flows before merge.

## Todo List

- [ ] Automated tests cover email-before-paywall and verified-payment success copy.
- [ ] Build passes without adding jsdom or Testing Library.
- [ ] Manual smoke covers redirect and post-payment boundaries.

## Success Criteria

- [ ] `npm test` passes with the updated route/copy contract.
- [ ] `npm run build` passes with no route or dead-import regressions.
- [ ] Manual smoke confirms `/email`, `/welcome-gift`, `/paywall`, and purchase-success handoff behave as planned.

## Risk Assessment

- Medium likelihood / Medium impact: inline page redirects can regress without component tests. Mitigation: add one pure helper only if redirect logic becomes non-trivial; otherwise require manual smoke before merge.
- Low likelihood / High impact: widening the test harness now could destabilize unrelated suites. Mitigation: keep Node `.test.ts` scope and use build/manual coverage for page behavior.

## Security Considerations

- Do not fake post-payment success by mutating client state in a way that bypasses the real purchase boundary; the protected path remains RevenueCat completion -> redemption handoff -> Firebase email link (`src/app/paywall/paywall-page-client.tsx:138`, `src/components/revenuecat-redemption-handoff.tsx:20`, `src/lib/firebase/email-link.ts:64`).
- Preserve the current success-copy guarantee that the sign-in email is tied to verified payment, not email capture (`src/lib/copy/email-copy.test.ts:15`).

## Rollback Plan

Revert the new route/copy assertions and remove any tiny helper introduced solely for the reordered flow. The build and existing Firebase email-link tests should still pass on the old path.

## Next Steps

After validation, implementation can proceed without backend or mobile changes. No unresolved questions.
