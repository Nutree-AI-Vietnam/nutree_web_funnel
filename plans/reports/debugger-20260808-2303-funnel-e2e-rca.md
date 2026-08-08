# Funnel E2E RCA - Investigation Report

## Executive Summary
- **Issue:** Four current funnel failures: paywall plan resets on refresh, hosted checkout "Return to Nutree" does not open the exit offer, `/quiz/[step]` legacy URLs no longer work, and local production email submit returns `Not Found`.
- **Impact:** Users can lose plan intent, lose the rescue-offer path after cancel, hit dead legacy step URLs, and fail to create checkout drafts in local production mode.
- **Root cause:** 1) selected plan never persists on selection, 2) exit-offer transition only exists in the in-memory cancel-exception path, 3) `/quiz/[step]` route compatibility was removed without a redirect replacement, 4) `.env.production.local` points at a backend target that does not expose `/v1/web-funnel/leads`.
- **Status:** Confirmed from current source, route tree, local env shape, and bounded upstream probes on August 8, 2026. No app code changed.
- **Fix:** Safe fixes listed per issue below.

## Timeline
- **2026-07-31:** `9fa90be` changed paywall cancel behavior to open an exit offer from the confirmation/cancel flow.
- **2026-07-31:** `a6f1ff4` changed exit-offer activation behavior on reveal.
- **2026-08-04:** `80d89e5` added `/postcheckout` guidance and removed older browser-side email-link pieces.
- **2026-08-06:** `02e6fe5` canonicalized RevenueCat redemption-link hashing.
- **2026-08-08:** `npm run build` succeeded and showed only static `/quiz`; no `/quiz/[step]` route exists in the current app route tree.
- **2026-08-08:** Existing targeted tests passed: `src/lib/quiz/store.test.ts`, `src/lib/api/client.test.ts`, `src/app/api/web-funnel/leads/route.test.ts`.
- **2026-08-08:** Upstream probe results:
  - `.env.local` target: `/openapi.json` advertises `/v1/web-funnel/leads`; invalid-body `POST /v1/web-funnel/leads` returns `422`.
  - `.env.preview.local` target: same as local.
  - `.env.production.local` target: `/openapi.json` does not advertise `/v1/web-funnel/leads`; invalid-body `POST /v1/web-funnel/leads` returns `404 {"detail":"Not Found"}`.

## Technical Analysis
### 1. Selected paywall plan reverts after refresh

**Competing hypotheses**
- H1: The selected plan is never persisted when the user taps another plan.
- H2: Refresh loses the funnel screen and forces a different paywall initialization path.
- H3: `sessionStorage` is unavailable, so persistence cannot work.

**Evidence**
- Paywall initializes from `initialPlanId ?? readSelectedPaywallPlan() ?? '12-week'`: `src/app/paywall/paywall-page-client.tsx:92`.
- A persistence helper exists for the selected plan: `src/lib/revenuecat/web.ts:66-73`.
- The plan-card click handler only updates component state and analytics:
  - `src/app/paywall/paywall-page-client.tsx:405`
- `saveSelectedPaywallPlan(selected.id)` is only called on checkout-cancel and exit-offer flows:
  - `src/app/paywall/paywall-page-client.tsx:281`
  - `src/app/exit-offer/exit-offer-page-client.tsx:66-69`
  - `src/app/exit-offer/exit-offer-page-client.tsx:73-76`
- Funnel screen itself is persisted separately and already tested:
  - `src/lib/quiz/store.ts:50-61`
  - `src/lib/quiz/store.ts:86-108`
  - `src/lib/quiz/store.test.ts:60-74`

**Elimination**
- H2 eliminated: the funnel screen persists independently; refresh does not inherently drop the user out of paywall.
- H3 not needed to explain the bug: persistence API exists and is read on mount; the missing write on plan selection is sufficient.

**Confirmed root cause**
- The selected plan is stored only in React state during normal plan switching. Refresh remounts the paywall and reconstructs from stale or empty session storage, so the UI falls back to the default selection.

**Safe fix**
- Persist immediately in the plan selection handler:
  - add `saveSelectedPaywallPlan(plan.id)` beside `setSelectedId(plan.id)` in `src/app/paywall/paywall-page-client.tsx:405`
- Add a focused test that remounts the paywall after selecting `4-week` or `52-week` and expects the same plan to remain selected.

### 2. RevenueCat/Paddle checkout "Return to Nutree" does not open the exit offer

**Competing hypotheses**
- H1: The exit offer is suppressed because it was already claimed.
- H2: The only implemented exit-offer transition is the in-memory SDK cancel path; a hosted checkout return URL bypasses it.
- H3: Legacy `/paywall` or `/exit-offer` routes restore the exit-offer state automatically after a provider return.

**Evidence**
- Current RevenueCat paywall opens the exit offer only inside the `UserCancelledError` catch path:
  - `src/app/paywall/paywall-page-client.tsx:277-285`
- `SurveyPageClient` wires that callback to an internal state change only:
  - `src/app/survey/[language]/survey-page-client.tsx:55-56`
- There is no URL/query return handler in the current codebase:
  - repo search found no `returnUrl`, `cancelUrl`, `successUrl`, or `redirectUrl` handling in `src/`
- Legacy `/paywall` and `/exit-offer` pages do not restore exit-offer state; both blindly redirect to `/survey/vi`:
  - `src/app/paywall/page.tsx:1-4`
  - `src/app/exit-offer/page.tsx:1-4`
- Current local config leaves `NEXT_PUBLIC_REVENUECAT_REDEMPTION_ENABLED` unset, so local code runs the legacy identified checkout branch:
  - `src/app/paywall/paywall-page-client.tsx:41`
  - unset in `.env.local`, `.env.preview.local`, `.env.production.local` during this investigation

**Elimination**
- H1 eliminated as the primary cause: `hasExitOfferBeenClaimed()` only short-circuits after a prior claim; it does not explain first-time hosted returns.
- H3 eliminated: current route files do not encode or restore `exit-offer` intent.

**Confirmed root cause**
- The current app only knows how to enter the exit offer when `purchase()` rejects with `UserCancelledError` in the same running page. A full hosted "Return to Nutree" navigation has no route-level handler, no query contract, and no legacy page behavior that switches `funnelScreen` to `exit-offer`, so the rescue offer never opens on that return path.

**Safe fix**
- Add a dedicated cancel-return path, for example:
  - a provider return URL or app route that writes `funnelScreen='exit-offer'`, preserves locale and selected plan, then redirects to `/survey/{locale}`
- Or make legacy `/exit-offer` restore exit-offer state instead of hard-redirecting to `/survey/vi`.
- Add a browser-level test for the URL-based return path. Current unit coverage does not exercise it.

### 3. Missing `/quiz/[step]` legacy redirect behavior

**Competing hypotheses**
- H1: `/quiz/[step]` still exists but is hidden behind middleware or `next.config` redirects.
- H2: The dynamic step route was removed, and only the bare `/quiz` compatibility page remains.
- H3: Step-specific redirects are now handled by the survey route.

**Evidence**
- Current route tree from `npm run build` shows `/quiz` only; there is no `/quiz/[step]`.
- `src/app/quiz/page.tsx:1-4` handles only the bare `/quiz` path and redirects it to `/survey/vi`.
- `src/app/survey/[language]/survey-page-client.tsx:42-56` renders quiz steps from persisted zustand state, not from pathname segments.
- There is no `src/app/quiz/[step]/page.tsx` file in the current app tree.
- `next.config.ts:3-16` defines headers only; there are no redirect rules for `/quiz/[step]`.

**Elimination**
- H1 eliminated: no middleware/redirect rule exists in `next.config.ts`, and the built route tree lacks the dynamic route.
- H3 eliminated: survey flow restores only internal `currentStep`; it does not accept a step slug from the URL.

**Confirmed root cause**
- The old per-step route compatibility was removed. Only `/quiz` redirects now, so any legacy step URL like `/quiz/goal` or `/quiz/name_ask` falls through to Next.js not-found behavior.

**Safe fix**
- Reintroduce a compatibility route `src/app/quiz/[step]/page.tsx` that:
  - validates the slug against `isQuizStep`
  - restores or seeds `currentStep`
  - redirects into `/survey/{locale}`
- Decide the invalid-step policy explicitly: 404 vs redirect to survey start.
- Add route tests for one valid legacy step and one invalid slug.

### 4. Local production email submission returns `Not Found`

**Competing hypotheses**
- H1: The local production build is missing the Next.js BFF route.
- H2: `.env.production.local` is missing required keys, so the BFF rejects before upstream.
- H3: The configured production backend target does not expose `/v1/web-funnel/leads`.
- H4: The trailing slash in `.env.production.local` breaks URL composition.

**Evidence**
- Email submit calls `createLead()`:
  - `src/components/email-capture-screen.tsx:30-44`
- `createLead()` initializes a same-origin session then posts to `/api/web-funnel/leads`:
  - `src/lib/api/client.ts:75-90`
- The BFF route trims the trailing slash and forwards to `${base}/v1/web-funnel/leads`:
  - `src/app/api/web-funnel/leads/route.ts:9-16`
- On upstream failure, the BFF preserves upstream `detail` when present:
  - `src/app/api/web-funnel/leads/route.ts:18-22`
- Client error handling then surfaces that string:
  - `src/lib/api/client.ts:81-88`
- `npm run build` on **Saturday, August 8, 2026** loaded `.env.production.local, .env.local` and included `/api/web-funnel/leads` in the route tree.
- `.env.production.local` contains both relevant keys by name:
  - `NEXT_PUBLIC_API_BASE_URL`
  - `WEB_FUNNEL_BFF_SHARED_SECRET`
- The trailing slash is normalized away by `replace(/\/$/, '')`, so H4 is not sufficient.
- Bounded upstream probes on **August 8, 2026**:
  - `.env.production.local` target `/openapi.json` does **not** advertise `/v1/web-funnel/leads`
  - `.env.production.local` invalid-body `POST /v1/web-funnel/leads` returns `404 {"detail":"Not Found"}`
  - `.env.local` and `.env.preview.local` advertise the path and return `422` validation details instead

**Elimination**
- H1 eliminated: the built Next app includes the BFF route.
- H2 eliminated: missing keys would produce local `503 Service unavailable`, not the observed upstream `404`.
- H4 eliminated: trailing slash is stripped before forwarding.

**Confirmed root cause**
- `.env.production.local` points at a backend/environment that does not expose the web-funnel lead route. The UI shows `Not Found` because the upstream `404 {"detail":"Not Found"}` is intentionally passed through by the BFF and surfaced by the client.

**Safe fix**
- Point `.env.production.local` `NEXT_PUBLIC_API_BASE_URL` at the MealTrack backend host that exposes `/v1/web-funnel/leads`.
- Keep `WEB_FUNNEL_BFF_SHARED_SECRET` matched to that same backend.
- Rebuild after the env change; `NEXT_PUBLIC_*` values are embedded at build time.
- Optional hardening:
  - add a local startup check that verifies `/openapi.json` includes `/v1/web-funnel/leads`
  - fail early with a clearer message than raw upstream `Not Found`

## Environment and Config Notes
- Relevant keys present by name in local env files:
  - `NEXT_PUBLIC_API_BASE_URL`
  - `WEB_FUNNEL_BFF_SHARED_SECRET`
  - `NEXT_PUBLIC_REVENUECAT_WEB_API_KEY`
  - `NEXT_PUBLIC_REVENUECAT_WEB_OFFERING_ID`
  - `NEXT_PUBLIC_REVENUECAT_WEB_PACKAGE_4_WEEK`
  - `NEXT_PUBLIC_REVENUECAT_WEB_PACKAGE_12_WEEK`
  - `NEXT_PUBLIC_REVENUECAT_WEB_PACKAGE_52_WEEK`
  - `NEXT_PUBLIC_REVENUECAT_WEB_PACKAGE_1_WEEK`
  - `NEXT_PUBLIC_APPSTORE_URL`
  - `NEXT_PUBLIC_PLAYSTORE_URL`
  - Firebase public IDs
- `NEXT_PUBLIC_REVENUECAT_REDEMPTION_ENABLED` is absent from all three local env files used in this investigation, so local code defaults it to `false`.
- `NEXT_PUBLIC_REVENUECAT_WEB_1_WEEK_ENABLED` is present only in `.env.local` during this investigation.
- `NEXT_PUBLIC_PADDLE_*` keys exist in local env files but had no current source hits in `src/`, `README.md`, `docs/`, or `.env.example`. Current runtime checkout code is RevenueCat-based, with Paddle underneath the provider stack rather than directly wired in this repo.

## Test and Monitoring Gaps
- Current passing tests prove:
  - store persistence for `funnelScreen`
  - same-origin BFF forwarding
  - upstream validation-detail passthrough
- Current tests do **not** cover:
  - paywall selected-plan persistence across refresh/remount
  - hosted checkout URL-based cancel return opening the exit offer
  - legacy `/quiz/[step]` compatibility redirects
  - env sanity for the configured upstream exposing `/v1/web-funnel/leads`

## Recommendations
### Immediate (P0)
- [ ] Persist selected paywall plan on every plan-card click in `src/app/paywall/paywall-page-client.tsx:405`.
- [ ] Restore a URL-based cancel-return handler that lands the user in `exit-offer`, not generic `/survey/vi`.
- [ ] Repoint `.env.production.local` to a backend target that actually exposes `/v1/web-funnel/leads`, then rebuild.

### Short-term (P1)
- [ ] Add `src/app/quiz/[step]/page.tsx` compatibility handling for valid legacy step URLs.
- [ ] Add unit/browser tests for plan persistence and checkout-return rescue flow.
- [ ] Add a local env validation script that checks required backend paths before running production-mode smoke tests.

### Long-term (P2)
- [ ] Stop hardcoding legacy redirects to `/survey/vi`; preserve locale and intent in compatibility routes.
- [ ] Add a route-level state-resume contract for any provider-hosted checkout return paths.
- [ ] Add monitoring or CI smoke probes for the configured upstream OpenAPI contract to catch wrong-target env files earlier.

## Unresolved Questions
- Which exact URL does the hosted RevenueCat/Paddle "Return to Nutree" button use in the failing E2E run: same-page SDK close vs full redirect?
- Should invalid legacy `/quiz/[step]` slugs 404, or should all legacy step URLs redirect to survey start?
