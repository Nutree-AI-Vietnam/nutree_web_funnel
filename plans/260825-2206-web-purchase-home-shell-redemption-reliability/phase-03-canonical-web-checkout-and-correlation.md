---
phase: 3
title: Canonical web checkout and correlation
status: completed
priority: P1
effort: 2-3d
dependencies:
  - 1
  - 2
---

# Phase 3: Canonical web checkout and correlation

## Overview

Make anonymous RevenueCat Web SDK redemption the only checkout path, preserve
canonical email ownership, and keep correlation thin (digest + app user id).

## Ship-first (revision)

Align with RC docs ([Web SDK](https://www.revenuecat.com/docs/web/web-billing/web-sdk),
[Redemption Links](https://www.revenuecat.com/docs/web/redemption-links)):
- `Purchases.generateRevenueCatAnonymousAppUserId()` + Redemption Links enabled.
- After `purchase()`, use `redemptionInfo` for CTA/QR; do not expect hosted page.
- Prefer `customerEmail` from lead when SDK accepts it; lead email remains
  MealTrack ownership authority.
- RC emails redeem links (~60 min); treat that as primary capability recovery.
- Correlation: idempotent attach of digest + app_user_id to lead — no raw URL
  storage, no auto hash reconstruction after browser loss.

## Context Links

- Contract: [Phase 1](./phase-01-contract-and-baseline.md)
- Paywall: `/Users/alexnguyen/Desktop/Nut/nutree_web_funnel/src/app/paywall/paywall-page-client.tsx`
- RevenueCat setup: `/Users/alexnguyen/Desktop/Nut/nutree_web_funnel/src/lib/revenuecat/web.ts`

## Key Insights

- Checkout is anonymous-only; admission flag never selects lead-ID `/welcome`.
- Full email is session-only for `customerEmail`; lead remains ownership authority.
- Session digest correlation can disappear after charge — RC email is recovery.
- Generic `/redeem` is guidance-only; emailed capability activates.

## Requirements

- One anonymous checkout configuration in all environments.
- Email continuity is a pre-charge gate: pass lead email into `purchase()` when
  supported; otherwise reconfirm on paywall. Mismatch → typed recovery, not a
  second charge claim against a different email.
- After successful purchase, correlate digest + app_user_id idempotently. Optional
  pre-charge attempt reserve only if double-checkout risk is proven.
- Completion UI requires correlation acknowledgement when digest is available;
  if `redeemUrl` missing, show RC email / reopen guidance — never a second checkout.
- Preserve automatic VN/VND and non-VN English/USD behavior.

## Architecture

Keep full email BFF/server-scoped, not Zustand. Verify SDK email behavior from
installed types/docs. Persist only provider ID + digest in a TTL-bound backend
attempt record before charge; browser retry is convenience. Verify whether a
RevenueCat webhook or parsed mobile redemption exposes a trustworthy join key.
If not, browser-loss recovery becomes a paid-support path that locks repurchase;
the plan must not promise automatic hash reconstruction.

## Related Code Files

- Modify: `/Users/alexnguyen/Desktop/Nut/nutree_web_funnel/src/components/email-capture-screen.tsx`
- Modify: `/Users/alexnguyen/Desktop/Nut/nutree_web_funnel/src/app/paywall/paywall-page-client.tsx`
- Modify: `/Users/alexnguyen/Desktop/Nut/nutree_web_funnel/src/app/postcheckout/postcheckout-page-client.tsx`
- Modify: `/Users/alexnguyen/Desktop/Nut/nutree_web_funnel/src/lib/revenuecat/web.ts`
- Modify: `/Users/alexnguyen/Desktop/Nut/nutree_web_funnel/src/lib/revenuecat/redemption-handoff.ts`
- Modify: `/Users/alexnguyen/Desktop/Nut/nutree_web_funnel/src/lib/api/client.ts`
- Modify: web Vercel environment templates and colocated Vitest files.

## Implementation Steps

1. Add failing component tests for redemption-only routing, email continuity,
   missing link, correlation loss/reload, and prevention of repurchase.
2. Verify `@revenuecat/purchases-js` `customerEmail` / `redemptionInfo` from
   installed types/docs.
3. Remove `configureRevenueCatForLead` and the redemption flag fork.
4. Correlate after successful `purchase()`; add pre-charge attempt only if needed.
5. Smallest BFF email/correlation contract — digest only, no URL/analytics leak.
6. On callback attach digest/purchase key idempotently.
7. Require correlation acknowledgement before clearing completion state when digest exists.
8. Localize `/postcheckout`; emailed redemption link (RC + our copy) is authoritative.
9. Keep `/postcheckout` browser-owned; label generic `/redeem` non-activating.
10. Independent new-checkout admission switch; paid recovery stays on during rollback.

## Tests Before / After

Run focused Vitest, `npm test`, lint, build, and `git diff --check`. Do not add
or run Playwright/e2e in this repository.

## Todo List

- [x] Survey, checkout, and verified Firebase email form one ownership chain.
- [x] Correlation survives browser loss without raw URL persistence.
- [x] No production configuration selects `/welcome`.
- [x] Crash after charge cannot offer a second checkout; recovery is automatic
  only when provider-verifiable join evidence exists.
- [x] Locale/currency tests remain green.

## Success Criteria

- [x] Downstream failure never reopens payment or charges again.
- [x] Postcheckout copy names the actual recovery action.
- [x] Browser never grants entitlement or persists a raw capability.

## Risk Assessment

If SDK cannot lock email, provider email stays display-only; backend canonical
lead email remains ownership authority and mismatch is typed/recoverable.

## Security Considerations

Retain HttpOnly lead access, same-origin mutation checks, BFF secret, safe lead
projection, digest-only correlation, and capability-redacted analytics.

## Next Steps

Production checkout remains off until mobile/native staging artifacts exist.
