---
phase: 3
title: "Validation And Rollout"
status: pending
priority: P1
effort: "2h"
dependencies: [1, 2]
---

# Phase 3: Validation And Rollout

## Overview

Prove the consolidation did not break locale selection, screen restoration,
offer timers, or checkout exits, then define a rollback that does not corrupt
persisted funnel state.

## Context Links

- Store tests: `src/lib/quiz/store.test.ts:23-120`
- Step-order tests: `src/lib/quiz/steps.test.ts:4-66`
- RevenueCat config tests: `src/lib/revenuecat/web.test.ts:41-62`
- Analytics event contract: `src/lib/analytics/track.ts:25-27`

## Requirements

- Functional: cover legacy-route redirects, screen restoration, locale sync, and
  paywall state continuity.
- Non-functional: no Playwright/e2e added; validate with repo-standard
  `npm run lint`, `npm test`, `npm run build`, plus focused manual checks.

## Architecture

Validation inputs:
- Server redirects from `/`, `/quiz`, `/email`, `/welcome-gift`, `/exit-offer`,
  `/paywall`
- Persisted store state from `nutree_funnel_v1`
- Session/cookie offer state from RevenueCat web helpers

Validation outputs:
- Unit coverage for redirect/route-context logic and store migration
- Build/test evidence for survey rendering and paywall continuity
- Manual matrix covering locale, refresh, and cancel/exit-offer flows

## Related Code Files

- Modify: `src/lib/quiz/store.test.ts`
- Modify: `src/lib/quiz/steps.test.ts`
- Modify: `src/lib/revenuecat/web.test.ts`
- Create: `src/lib/survey/route-context.test.ts`
- Create: `src/app/survey/[language]/survey-page-client.test.tsx`

## Implementation Steps

1. Extend store tests to cover route-locale precedence and persisted
   `funnelScreen` restoration around the new survey entry.
2. Add route-context tests for:
   - root locale selection,
   - legacy `/quiz`, `/email`, `/welcome-gift`, `/exit-offer`, `/paywall`
     forwarding,
   - paywall `plan` / `exitOffer` query preservation.
3. Add client tests for the survey container screen switch and callback flow.
4. Run the required commands:
   - `npm run lint`
   - `npm test`
   - `npm run build`
5. Run manual checks:
   - direct open of every legacy route,
   - refresh on each implicit screen,
   - language toggle mid-funnel,
   - cancel checkout -> exit offer -> return to paywall,
   - countdown expiry on welcome and exit offers,
   - VN vs non-VN pricing path,
   - local preview tools still usable.
6. Document rollback: restore legacy page bodies/redirects, keep store
   migration backward compatible, and do not rotate any RevenueCat storage keys.

## Todo List

- [ ] Add route-context tests
- [ ] Add survey container tests
- [ ] Extend store tests for locale/screen restore
- [ ] Run lint, test, and build
- [ ] Complete manual route + timer + checkout matrix
- [ ] Document rollback steps before merge

## Success Criteria

- [ ] `npm run lint`, `npm test`, and `npm run build` pass.
- [ ] Manual matrix confirms `/survey/{language}` is the only pre-checkout URL
  the user sees after navigation settles.
- [ ] Discount countdowns, selected plan, and exit-offer claim state behave the
  same before and after refresh.
- [ ] Rollback can restore legacy routes without breaking existing persisted
  store records.

## Risk Assessment

- High: a new persisted state shape can strand existing users on a blank or wrong
  screen after deploy. Mitigation: additive migration only; keep unknown states
  falling back to landing/quiz as in `src/lib/quiz/store.ts:70-75`.
- Medium: manual testers may treat `/welcome`, `/postcheckout`, or
  `/auth/email-link` as regressions even though they remain explicit non-funnel
  routes. Mitigation: call out scope in the validation checklist.
- Medium: redirect-only smoke coverage can miss countdown regressions because the
  timers are session-based. Mitigation: force refresh and timer-expiry checks in
  the manual matrix.

## Security Considerations

- Do not introduce tests that snapshot raw cookies, raw redemption URLs, or
  sensitive query strings.
- Preserve the rule that purchase truth comes from RevenueCat/backend, not from
  browser URL changes (`src/lib/analytics/track.ts:3-5`).

## Next Steps

- After implementation passes, the blocked onboarding redesign plan can be
  updated to assume survey-only route ownership.
