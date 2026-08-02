---
phase: 2
title: "Preserve paywall offer messaging"
status: pending
priority: P1
effort: "1-2h"
dependencies: [1]
---

# Phase 2: Preserve paywall offer messaging

## Context Links

- Current email copy: `src/lib/copy/en.ts:400`, `src/lib/copy/vi.ts:397`
- Current paywall copy: `src/lib/copy/en.ts:427`, `src/lib/copy/vi.ts:424`
- Current paywall rendering: `src/app/paywall/paywall-page-client.tsx:179`
- Purchase boundary: `src/app/paywall/paywall-page-client.tsx:120`

## Overview

Move any essential "welcome reward" framing onto screens the user still sees: `/email` and `/paywall`. The user should understand that email saves the plan and opens secure checkout, while the paywall still makes the reserved offer visible without adding a new interstitial or showing plan selection before email capture.

## Key Insights

- Email copy currently promises a separate reveal step: "get your welcome reward" / "reveal your welcome price" (`src/lib/copy/en.ts:401`, `src/lib/copy/en.ts:402`, `src/lib/copy/vi.ts:398`, `src/lib/copy/vi.ts:399`).
- Paywall already contains countdown, plan discount framing, and an unused `offerReserved` string that can absorb the interstitial's job (`src/app/paywall/paywall-page-client.tsx:203`, `src/lib/copy/en.ts:428`, `src/lib/copy/en.ts:453`, `src/lib/copy/vi.ts:425`, `src/lib/copy/vi.ts:450`).
- RevenueCat purchase still starts only from paywall CTA and confirm modal, so the user does not see plans before email even after the copy move (`src/app/paywall/paywall-page-client.tsx:149`, `src/app/paywall/paywall-page-client.tsx:236`).

## Requirements

- Functional: email copy must promise checkout continuation, not a scratch/reveal screen; paywall must surface the welcome-offer state immediately near the existing plan list.
- Non-functional: keep VN/US locale-currency alignment (`README.md:16`, `README.md:17`, `src/app/paywall/paywall-page-client.tsx:96`); no new analytics taxonomy; no change to purchase sequencing or post-payment success copy.

## Architecture

1. `EmailPage` continues to render existing copy keys, but those strings change from "reveal reward" language to "save plan and continue to secure checkout" language (`src/app/email/page.tsx:57`, `src/app/email/page.tsx:58`, `src/app/email/page.tsx:81`, `src/app/email/page.tsx:89`).
2. `PaywallPageClient` renders one reserved-offer cue above or adjacent to the current plan list using existing paywall copy keys rather than a new interstitial (`src/app/paywall/paywall-page-client.tsx:202`, `src/app/paywall/paywall-page-client.tsx:216`).
3. `purchase()` arguments, redemption-link creation, and the paywall confirm modal remain unchanged (`src/app/paywall/paywall-page-client.tsx:131`, `src/app/paywall/paywall-page-client.tsx:138`, `src/app/paywall/paywall-page-client.tsx:241`).

## Related Code Files

- Modify: `src/lib/copy/en.ts`
- Modify: `src/lib/copy/vi.ts`
- Modify: `src/app/paywall/paywall-page-client.tsx`
- Optional cleanup only if trivial: `src/app/welcome-gift/page.tsx`, `src/components/scratch-ticket-cover.tsx`
- No change: `src/components/revenuecat-redemption-handoff.tsx`
- No change: `src/lib/firebase/email-link.ts`

## Implementation Steps

1. Rewrite `email.headline`, `email.body`, `email.helper`, and `email.cta` so the post-email action is clearly secure checkout, not a reveal screen (`src/lib/copy/en.ts:401`, `src/lib/copy/en.ts:405`, `src/lib/copy/vi.ts:398`, `src/lib/copy/vi.ts:402`).
2. Render one paywall-level reserved-offer cue using existing `offerReserved` and `planResearchNote` language instead of inventing a second pricing surface (`src/lib/copy/en.ts:428`, `src/lib/copy/en.ts:453`, `src/lib/copy/vi.ts:425`, `src/lib/copy/vi.ts:450`).
3. Keep `trackStepViewed('paywall')`, `revenuecat_checkout_started`, and `revenuecat_checkout_completed` as the truthful analytics markers; do not emit fake `welcome_gift_*` events from the paywall (`src/app/paywall/paywall-page-client.tsx:67`, `src/app/paywall/paywall-page-client.tsx:128`, `src/app/paywall/paywall-page-client.tsx:140`, `src/app/welcome-gift/page.tsx:23`, `src/app/welcome-gift/page.tsx:42`, `src/app/welcome-gift/page.tsx:53`).
4. Cleanup dead scratch-card copy/component code only if the removal stays local and does not expand scope; otherwise defer cleanup to a separate pass.

## Todo List

- [ ] Email copy matches the direct `/paywall` handoff.
- [ ] Paywall shows the reserved welcome offer without a separate screen.
- [ ] Checkout and post-payment analytics remain truthful.

## Success Criteria

- [ ] Email copy no longer implies a scratch or reveal step.
- [ ] Paywall still communicates the offer before checkout starts.
- [ ] `purchase()` callsite and redemption modal inputs remain unchanged.

## Risk Assessment

- Medium likelihood / High impact: removing the interstitial can weaken conversion framing. Mitigation: surface the existing reserved-offer copy and countdown on paywall instead of silently dropping offer language.
- Low likelihood / Medium impact: aggressive cleanup of scratch-card assets can broaden scope. Mitigation: delete only obviously orphaned code; defer broader cleanup.

## Security Considerations

- Offer messaging remains presentational only; entitlement still depends on verified provider completion and redemption (`src/app/paywall/paywall-page-client.tsx:139`, `src/app/paywall/paywall-page-client.tsx:141`, `src/components/revenuecat-redemption-handoff.tsx:20`).
- Keep locale/currency alignment intact so the user never sees misleading billing copy (`README.md:16`, `README.md:17`, `src/app/paywall/paywall-page-client.tsx:96`).

## Rollback Plan

Restore the original email strings, remove the paywall reserved-offer cue, and if needed re-enable the interstitial copy. No payment, Firebase, or backend behavior needs rollback.

## Next Steps

Phase 3 adds only the regression coverage and smoke checks the current repo can support. No unresolved questions.
