---
phase: 2
title: "Prepare web email-link handoff"
status: pending
priority: P1
effort: "2h"
dependencies: [1]
---

# Phase 2: Prepare web email-link handoff

## Overview

Prepare the web funnel for the approved backend contract while keeping checkout
friction unchanged: email capture persists a lead, then Paddle checkout uses the
lead ID as correlation metadata.

## Requirements

- Web never sends a Firebase Email Link or creates a Firebase account.
- `POST /v1/web-funnel/leads` remains unauthenticated, rate-limited server-side,
  and returns only `lead_id` plus optional masked email.
- Paddle Checkout pre-fills the captured email and sends `funnel_lead_id` only.
- Copy never claims the email is already verified or says Google is required.

## Related Code Files

- Modify: `src/app/email/page.tsx`
- Modify: `src/lib/copy/en.ts`, `src/lib/copy/vi.ts`
- Verify: `src/lib/api/client.ts`
- Verify: `src/app/paywall/paywall-page-client.tsx`
- Modify: `README.md`, `.env.example` only if web configuration changes.

## Implementation Steps

1. Replace stale Google-specific email-screen text with an accurate save-plan and
   post-payment app-link explanation.
2. Keep the local email validator and backend lead request; do not add Firebase
   browser SDK configuration back to the web bundle.
3. Verify checkout custom data is exactly `source`, selected `plan`, and
   `funnel_lead_id`.
4. Add focused unit coverage for lead request/response handling and browser copy.
5. Leave the screen gracefully blocked with its existing generic error until the
   backend staging lead endpoint is deployed; never fabricate a local lead.

## Implementation Steps

<!-- Detailed steps -->

## Success Criteria

- [ ] A customer can reach Paddle without an OAuth popup or password.
- [ ] The web bundle contains no Firebase Admin secret or Firebase browser auth flow.
- [ ] A captured email is only described as a delivery/recovery address until the mobile link completes.
- [ ] `npm test`, `npm run lint`, and `npm run build` pass.

## Risk Assessment

- Backend contract deployment can lag. Mitigate by coordinating Preview tests only
  after its staging endpoint exists; do not introduce client fallbacks that lose data.
