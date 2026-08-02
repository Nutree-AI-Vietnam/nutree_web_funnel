---
phase: 2
title: Prepare DOB-parity web lead and safe magic-link handoff
status: pending
priority: P1
effort: 3-4d
dependencies:
  - 1
---

# Phase 2: Prepare DOB-Parity Web Lead and Safe Magic-Link Handoff

## Context Links

- [Cross-team contract](./phase-01-freeze-cross-team-identity-contract.md)
- [Mobile-first auth/DOB research](./research/researcher-mobile-first-dob-auth-contract.md)
- [Backend/web magic-claim research](./research/researcher-backend-web-magic-claim.md)
- RevenueCat Web SDK identified customers: `https://www.revenuecat.com/docs/web/web-billing/web-sdk`
- Live persisted state: `src/lib/quiz/store.ts`
- Live payment landing: `src/app/welcome/page.tsx`
- Backend producer plan: `/Users/alexnguyen/Desktop/Nut/mealtrack_backend/plans/260802-0135-paid-web-magic-link-claim-entitlement-backend/`

## Overview

Bind each unpaid DOB-aligned draft to the browser that created it, remove every
legacy browser/Firebase Email Link claim path, show only verified payment states,
and provide a telemetry-free install/reopen fallback. Pre-activation work may ship
dark; claim email remains blocked until the compatible mobile release exists.

## Key Insights

- Live `/welcome` says payment was received before webhook proof.
- `Lead` and checkout status still carry a claim token into persisted Zustand
  state, `/success`, QR/download URLs, and Airbridge attribution.
- Email-only draft upsert lets anyone who knows an address reacquire its lead ID.
- Live checkout already uses `@revenuecat/purchases-js`, currently configured with
  a generated anonymous App User ID. Replace that configuration with the backend
  lead UUID as the identified RevenueCat App User ID before loading offerings/purchase.
- No deferred install exists. The safe fallback says install Nutree, then reopen
  the same email or request another link in app.

### Mobile-first DOB parity

- Keep the current age-step position/slug, but replace the numeric age input with
  day, month, and year controls matching mobile validation and semantics.
- Store `birthYear`, `birthMonth`, and `birthDay` in web onboarding state. Derive
  age only for localized display and the existing age-based TDEE preview request.
- Lead creation sends backend wire fields `birth_year`, `birth_month`, and
  `birth_day` with the full onboarding snapshot; it never invents/fakes a DOB.
- Reject impossible/future/unsupported DOBs consistently. Backend revalidates,
  derives age/current plan, and stays calorie/TDEE source of truth.
- Version-migrate legacy age-only browser state to require DOB re-entry on the same
  step; never synthesize a birthday from the old age.

## Requirements

### Possession-bound draft

- Add a same-origin Next BFF for lead create/status/resend. It generates a 256-bit
  draft key, stores it only in a host-only HttpOnly Secure SameSite cookie scoped
  to the BFF, and forwards it to backend only as `X-Lead-Access-Key`.
- Establish the capability through one idempotent session endpoint before lead
  mutation. A synchronous in-flight ref plus one request ID makes Enter/button
  duplicates return the same lead/key binding instead of racing `Set-Cookie`.
- Backend stores only its hash. The same email plus same key may update/recover
  one unpaid draft; a different key never receives or mutates that draft.
- Require the key for browser status and resend. Browser JavaScript, Zustand,
  localStorage, URLs, analytics, and RevenueCat never receive it. Clear the cookie at
  claimed, expired, explicit reset, or retention cutoff.
- Explicit reset calls a BFF reset endpoint that revokes the backend capability and
  clears the HttpOnly cookie; client-only Zustand reset is insufficient.
- Version-migrate persisted `Lead` to only `lead_id`, `masked_email`, and safe
  status using the existing explicit persistence allowlist. Add focused regression
  keys for known legacy secrets; do not add a heuristic recursive name scrubber.
- Keep the just-entered email only in component memory to prefill RevenueCat checkout.
  On refresh/recovery, let checkout collect it again; never refetch raw email by lead ID.
- Never use email alone as ownership or return another browser's `lead_id`.

### Truthful post-payment states

- Render `payment_pending`, `payment_verified`, `claim_email_sent`,
  `email_delivery_delayed`, `claim_expired`, `claim_revoked`, `claim_conflict`,
  and `claimed` from the safe backend projection.
- Payment redirect starts at `payment_pending`; only verified webhook state may
  say payment verified. Never ask the customer to pay again while pending.
- Delayed email offers server-timed resend and support. Conflict/refund/revocation
  gives explicit support/exit copy without disclosing account existence.
- Remove `claimToken`/`claim_token` from all types, API mapping, preview fixtures,
  local storage, checkout polling, QR codes, download links, and attribution URLs.

### Compatible RevenueCat Web checkout

- Keep the current RevenueCat Web SDK product/package/purchase path. Configure its
  one process instance with the backend-issued `lead_id` as `appUserId`; do not
  generate an anonymous ID for this paid funnel.
- Freeze lead before SDK configuration. Refresh/re-entry must recover the same
  possession-bound lead before configuring; never switch App User ID mid-instance.
- Do not add a second checkout, client entitlement check, or direct access grant.
  The App User ID is provider correlation only and must equal one known unpaid lead.
- Sandbox evidence must show webhook/customer fetch round-trips the exact lead ID;
  random anonymous IDs, email, unknown aliases, and mismatched environments never fulfill.
- Preserve current plan/source metadata for operations while treating every custom
  data field as correlation only, never price, identity, or access authority.

### Direct magic-link install/reopen fallback

- Require the backend-owned direct App/Universal Link to use token-free path/query:
  `https://<claim-host>/open-nutree#v=2&lead_id=<uuid>&magic_token=<opaque>`.
  Vercel receives exactly `/open-nutree`, never claim state in request metadata.
- The fallback clears the full fragment before render and never parses, branches
  on, persists, or forwards its claim intent in browser code.
- Implement `/open-nutree` as one page segment, not a colliding `route.ts` plus
  `page.tsx`. Apply `Cache-Control: no-store`, `Referrer-Policy: no-referrer`,
  `noindex`, and a narrow CSP through supported page/config headers.
- Suppress root analytics/vendors on this segment and run a minimal first-party
  client component that calls `history.replaceState` to clear the fragment before
  rendering or loading any install/open action. It never parses or persists claim state.
- The clean page contains App Store/Play actions, `Open Nutree` when available,
  and one instruction: after installation, reopen this email. No deferred-link claim.
- Suppress GA4, Meta, TikTok, Airbridge, local preview tools, and arbitrary third-
  party scripts on this path; enforce a narrow route-specific CSP and `noindex`.
- Browser fallback never grants access, consumes a claim, displays a raw email,
  or transports a claim credential into another URL.

## Related Code Files

### Modify

- `src/app/email/page.tsx`
- `src/app/paywall/paywall-page-client.tsx`
- `src/app/checkout/page.tsx`
- `src/app/welcome/page.tsx`
- `src/app/success/page.tsx`
- `src/app/layout.tsx`
- `src/components/analytics-scripts.tsx`
- `src/components/local-preview-tools.tsx`
- `src/lib/api/client.ts` and `src/lib/api/client.test.ts`
- `src/lib/quiz/types.ts`, `src/lib/quiz/store.ts`, and `src/lib/quiz/store.test.ts`
- `src/components/steps/number-input-step.tsx`, `src/components/steps/final-web-steps.tsx`,
  `src/components/steps/registry.tsx`, and `src/lib/quiz/steps.ts`
- `src/lib/local-preview.ts`
- `src/lib/copy/en.ts` and `src/lib/copy/vi.ts`
- `next.config.ts`

### Create

- `src/app/open-nutree/page.tsx`
- `src/app/open-nutree/layout.tsx`
- `src/app/open-nutree/clear-fragment-before-render.tsx`
- `src/app/open-nutree/open-nutree.test.tsx`
- `src/app/api/web-funnel/leads/route.ts`
- `src/app/api/web-funnel/session/route.ts`
- `src/app/api/web-funnel/session/reset/route.ts`
- `src/app/api/web-funnel/leads/[leadId]/status/route.ts`
- `src/app/api/web-funnel/leads/[leadId]/resend/route.ts`
- `src/lib/handoff/lead-access-session.ts`
- `src/lib/handoff/lead-access-session.test.ts`
- `src/lib/quiz/store-migration.test.ts`
- `src/app/welcome/welcome-payment-state.test.tsx`
- `src/app/success/success-safe-handoff.test.tsx`

## Function and Interface Checklist

- [ ] `createLead(email,payload)` calls the same-origin BFF; only that server route
  creates/reads the cookie and sends the capability header to MealTrack.
- [ ] Session initialization/reset and a single request ID make concurrent first
  submits idempotent and revoke/clear the HttpOnly capability explicitly.
- [ ] `getLeadStatus(leadId)` and `requestResend(leadId)` use the BFF and never expose
  or log the key/email; Origin/Fetch-Metadata checks reject cross-site mutation.
- [ ] Store allowlist/migration preserves only DOB-safe quiz state and safe lead
  projection; focused tests keep known `claim_token`/`claimToken` keys dropped.
- [ ] Existing age step captures a valid DOB, derives preview age, and sends the
  exact mobile-aligned DOB wire fields in the lead snapshot.
- [ ] Payment-state mapper is exhaustive and cannot map a redirect to verified.
- [ ] RevenueCat Web config uses the possession-bound lead UUID as its identified
  `appUserId`; no anonymous generator or browser entitlement branch remains.
- [ ] `/open-nutree` has no route/page collision, receives no claim query/path,
  clears the direct magic-link fragment before rendering, never parses its intent,
  and loads zero analytics vendors.
- [ ] No QR/attribution/download builder accepts a claim credential.

## Implementation Steps

1. Write red tests proving numeric-age state lacks mobile DOB parity, raw lead email
   remains persisted, and `/welcome` can claim payment before verified state.
2. Extend the existing explicit Zustand allowlist/migration for DOB plus safe lead
   projection and focused known-secret regression cases.
3. Replace the numeric input with the mobile-aligned DOB control/state/migration,
   derive preview age, then add idempotent session initialization/reset and the
   HttpOnly-cookie BFF/header-only backend calls.
4. Replace `/welcome`, `/checkout`, and `/success` with the exhaustive safe-state
   mapper and localized honest actions. Status/resend always use backend timing.
5. Add a regression test that freezes current RevenueCat Web package/purchase behavior,
   configures once with lead UUID, and rejects anonymous/mid-instance identity changes.
6. Implement the direct-link `/open-nutree` fallback, pre-render fragment clearing,
   no-store/referrer/CSP/noindex headers, and root analytics suppression.
7. Run canary-string tests across rendered HTML, Zustand/localStorage, JavaScript-
   visible cookies, URLs, analytics/root vendors, referrers, network mocks, and build.
8. Integrate against staging and record installed/absent direct-link fragment
   preservation plus pending/delayed/resend/conflict/claimed/refunded evidence.
   Inspect Vercel Runtime Logs and every Log Drain for claim-shaped canaries.

## Tests Before

- Preserve lead capture and RevenueCat Web package/purchase tests.
- Red tests reproduce email-only draft reacquisition, false payment copy, legacy
  store rehydration, tokenized QR/attribution URL, and analytics on fallback.
- A deployment canary proves query-carried claim state appears in upstream Vercel
  request metadata before application redirect logic can strip it.

## Refactor

- Keep the draft capability separate from magic/exchange/Firebase credentials.
- Use one pure safe-state mapper across welcome/checkout/success instead of page-
  specific payment truth.
- Do not add Firebase browser auth, generic email login, passwords, or deferred-link SDKs.

## Tests After

```bash
npm test -- src/lib/api/client.test.ts src/lib/quiz/store.test.ts \
  src/lib/quiz/store-migration.test.ts src/lib/handoff/lead-access-session.test.ts \
  src/app/welcome/welcome-payment-state.test.tsx \
  src/app/success/success-safe-handoff.test.tsx \
  src/app/open-nutree/open-nutree.test.tsx
npm test && npm run lint && npm run build
```

Regression gate: quiz/email/paywall/RevenueCat Web package purchase, hydration, localization,
analytics on non-sensitive routes, and Preview production builds remain green.

## Todo List

- [ ] Bind draft/status/resend to a browser-held access key.
- [ ] Remove and migrate every browser claim-token field/path.
- [ ] Replace false payment copy with safe backend states.
- [ ] Preserve RevenueCat Web package/purchase behavior with lead UUID App User ID.
- [ ] Add telemetry-free install/reopen fallback.
- [ ] Validate canary absence and staging journey evidence.

## Success Criteria

- [ ] Another browser knowing only the email cannot recover or mutate a draft.
- [ ] Concurrent first submit paths return one lead/capability; explicit reset
  revokes it server-side and clears the cookie.
- [ ] Outside the emailed direct magic link fragment, no browser
  store, API response, DOM, QR, referrer, log, or analytics event contains a token.
- [ ] Real fallback reaches Vercel with empty query, fragment survives to
  the isolated page, the claim fragment clears before render, and
  Runtime Logs/Log Drains contain no claim-shaped canary.
- [ ] No payment-success claim appears before verified fulfillment.
- [ ] App-absent users understand install then reopen-email recovery in two actions.
- [ ] Full web test/lint/build and cross-repo staging gates pass.

## Risk Assessment

- The draft capability is sensitive even though it cannot claim access. Keep it
  HttpOnly/host-only/scoped, validate same-origin mutation, hash server-side, and
  expire it; do not weaken the shared privacy rule to permit localStorage.
- Sensitive fallback routes inherit root instrumentation by default; explicit
  suppression plus CSP/referrer canary tests are release blockers.
- Fragment preservation is platform/browser behavior, not an assumption; a real
  iOS/Android/browser matrix blocks release if any environment drops it.

## Security Considerations

- Do not put real email/action links, draft keys, claim tokens, or provider bodies
  in fixtures, logs, screenshots, analytics, error reports, or build artifacts.
- The explicit persistence allowlist excludes raw email and known credential fields
  before any component or vendor script can observe rehydrated state.
- Tests prove persisted state and analytics/root scripts cannot read or exfiltrate
  raw email or the HttpOnly capability.

## Next Steps

Release remains blocked until backend staging implements the matching capability
contract and the browser canary matrix passes. Unresolved questions: none.
