---
phase: 4
title: Mobile Home-shell activation
status: completed
priority: P1
effort: 3-4d
dependencies:
  - 1
  - 2
---

# Phase 4: Mobile Home-shell activation

## Overview

Replace mandatory full-screen activation with a Home-owned required passwordless
prompt while customer data and premium actions remain locked.

## Ship-first (revision)

Reuse existing coordinator ordering. Presentation change only where needed:
Home shell + overlay. Eligibility stays the existing preflight call (or
equivalent) before RC redeem; do not build a new receipt protocol on mobile.
Cancel after redeem starts = continue later.

## Context Links

- Contract: [Phase 1](./phase-01-contract-and-baseline.md)
- Coordinator: `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/features/auth/application/services/web_purchase_redemption_coordinator.dart`
- Router: `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/features/auth/presentation/router/app_router_redirect.dart`
- Home route: `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/core/navigation/shell_routes.dart`

## Key Insights

- Coordinator ordering/recovery are reusable; presentation and refresh are wrong.
- Home is a real dashboard, so pending state needs a safe shell projection.
- ClaimFlowBarrier should fence side effects, not globally redirect UI.

## Requirements

- Link resolves to `/` immediately with onboarding suppressed.
- Required overlay owns email, resend, verifying, activating, wrong-email,
  expired, retry, and confirmed cancellation states.
- Before `home_active`, render a dedicated inert Home-shell subtree; do not mount
  the real navigation shell/dashboard or initialize customer/cache/HealthKit sync.
- Completion awaits backend access and subscription refresh.
- Cold start, background, duplicates, cancellation, and process death remain safe.
- Once preflight/provider work begins, Cancel means “continue later”; only a
  pre-consumption attempt may be discarded/tombstoned.

## Architecture

Expose `home_pending_auth`, `home_activating`, `home_active`, and
`home_recoverable_error`. Router permits Home and rejects onboarding. One
shell-level host renders the prompt. Barrier leases fence auth/subscription
side effects during mutation, not presentation. Secure recovery uses the Phase
1 encrypted device-only policy. Provider-unknown state reconciles against
backend/RevenueCat before retry. `finalized_pending_refresh` survives restart;
recovery is deleted only after matching-UID active access yields `home_active`.

## Related Code Files

- Modify: `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/features/auth/application/services/web_purchase_redemption_coordinator.dart`
- Modify: `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/features/auth/application/providers/web_purchase_redemption_provider.dart`
- Modify: `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/features/auth/presentation/router/app_router_redirect.dart`
- Modify: `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/core/navigation/shell_routes.dart`
- Modify: `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/core/theme/shell_layout.dart`
- Modify/gate: `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/features/nutrition_tracking/presentation/screens/nutrition_dashboard_screen.dart` and protected provider entry points.
- Modify: `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/features/subscriptions/application/providers/subscription_state_provider.dart`
- Replace/remove: `/Users/alexnguyen/Desktop/Nut/nutree/nutree_ai/lib/features/auth/presentation/screens/activate_plan_screen.dart`
- Create/reuse one prompt widget under `lib/features/auth/presentation/widgets/`.
- Modify focused tests under `test/features/auth/` and `test/core/services/`.

## Implementation Steps

1. Regenerate Drift/Freezed/Riverpod output and make focused baseline compile;
   never suppress failures or raise baselines to pass.
2. Write router tests: pending redemption permits Home, forbids onboarding, and
   blocks protected routes/actions.
3. Add prompt widget tests for Back/background, resend, wrong email, expiry,
   network loss, confirmed cancel, and accessibility.
4. Separate coordinator domain state from activation-screen view state.
5. Route accepted/restored links to a static shell and mount one prompt host;
   test zero API/cache/HealthKit/background calls before `home_active`.
6. Remove Google/Apple callbacks and generic activation-route ingress.
7. Run eligibility (preflight) then redeem; finalize with hash+UID. On provider
   timeout reconcile — never blind re-redeem.
8. Await auth/profile + subscription refresh for matching UID and active
   entitlement, then `home_active` and delete recovery.
9. Restrict destructive cancellation to pre-consumption state.
10. Preserve idempotency through retry/process death.
11. Verify native IAP and ordinary email sign-in remain unchanged.

## Tests Before / After

- `dart run build_runner build --delete-conflicting-outputs`
- Focused coordinator, router, prompt, Firebase, deep-link, subscription tests.
- Analyzer, architecture guards, then full Flutter tests.

## Todo List

- [x] Home shell visible immediately; no onboarding flash.
- [x] Protected data/actions locked until entitlement refresh.
- [x] Protected dashboard/providers are not instantiated under the prompt.
- [x] Prompt survives app switching and requires confirmed cancel.
- [x] Successful finalize settles at active Home once.

## Success Criteria

- [x] One presentation owner and one completion signal.
- [x] Verified identity precedes preflight and provider consumption.
- [x] Existing subscription/native-purchase regressions stay green.

## Risk Assessment

Dashboard providers may fetch pre-auth. Gate protected providers/actions using
one shell access projection and cover initialization in tests.

## Security Considerations

No raw links/emails in routes or analytics. Preserve flavor validation,
generation fencing, tombstones, and at-most-once provider behavior.

## Next Steps

Phase 5 proves native ingress and install/reopen behavior.
