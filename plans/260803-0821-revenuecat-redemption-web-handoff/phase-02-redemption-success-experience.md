---
phase: 2
title: "Redemption Success Experience"
status: pending
priority: P1
effort: "1.5d"
dependencies: [1]
---

# Phase 2: Redemption Success Experience

## Overview

Turn `PurchaseResult.redemptionInfo` into a safe immediate mobile handoff while
preserving a useful desktop QR path and a non-authoritative pending state. The
capability stays in the mounted purchase client rather than crossing a route.

## Requirements

- Web SDK flows read `redemptionInfo`; they do not assume a RevenueCat-hosted success page. Both `redemptionInfo` and its nested `redeemUrl` can be absent.
- Render the handoff panel inside the still-mounted paywall client after provider-verified correlation acknowledgement; do not navigate to `app/success/page.tsx` while it needs the capability. Back, refresh, and direct-route access show a capability-free recovery state.
- The raw URL stays component-memory only. QR rendering may consume it but cannot serialize it to storage, analytics, error messages, URL query state, or an ephemeral global module.
- The entire `/paywall` route is script-free from its initial load, not merely after the capability renders: suppress analytics/session-replay vendors and require `Cache-Control: no-store`, `Referrer-Policy: no-referrer`, and framing protection for the paywall response.
- Normalize RevenueCat/BFF failures to a fixed safe error enum before rendering; never render a provider `Error.message`.
- Display install/reopen guidance and expiry recovery wording only after sandbox confirms the configured billing provider's email behavior.

## Related Code Files

- Modify: paywall purchase component, paywall response/layout boundaries, safe lead types/projection, localized `src/lib/copy/en.ts` and `vi.ts`.
- Create only if needed: a small success-panel/QR component with focused unit tests.

## Tests Before

- Add failing component tests for mobile CTA, desktop QR, absent `redemptionInfo`, absent nested `redeemUrl`, correlation pending/acknowledged states, and a pending verified-payment status.
- Add tests that a route/refresh/back navigation cannot recover the raw capability, analytics scripts are absent from the complete paywall route, paywall headers prevent storage/referral/framing leakage, and URL-bearing provider errors never reach the DOM or tracking.

## Refactor

1. Keep `purchased` as a UI transition only; store no checkout object or redemption URL.
2. Retain the in-memory redemption capability in the mounted paywall client and render the immediate handoff panel only after correlation acknowledgement.
3. Provide clear capability-free retry/support states for missing, expired, or unacknowledged links without recreating `/resend` claim-email behavior.

## Tests After

- Assert language/currency rules remain VN Vietnamese/VND and non-VN English/USD.
- Verify no raw URL appears in persisted Zustand state, tracking payloads, provider-error UI, route state, or a script-enabled DOM.

## Success Criteria

- [ ] Mobile buyers can open the configured link immediately after correlation acknowledgement.
- [ ] Desktop buyers can scan a QR code and see install/reopen instructions on the script-isolated paywall route.
- [ ] Expired/absent link handling is explicit and does not claim entitlement.

## Risk Assessment

Redemption URLs are bearer-like single-use capabilities. A visual QR is necessary UX, but screenshot/analytics instrumentation must never retain its source value. Any recovery after a reload must come from backend-safe state and must not reconstruct or disclose the URL.

## Implementation Steps

1. Add mounted-handoff UI, route-header, analytics-isolation, and persistence-safety tests.
2. Render the in-memory CTA/QR and localized recovery states from acknowledged purchase results without a capability-bearing route transition.
