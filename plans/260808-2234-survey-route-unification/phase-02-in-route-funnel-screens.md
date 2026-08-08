---
phase: 2
title: "In-Route Funnel Screens"
status: pending
priority: P1
effort: "8h"
dependencies: [1]
---

# Phase 2: In-Route Funnel Screens

## Overview

Complete the client-side funnel container so landing, quiz, email, welcome
gift, exit offer, and paywall all render inside `/survey/{language}` while
preserving the existing checkout/timer semantics.

## Context Links

- Shared screens already extracted: `src/components/landing-page.tsx:56-66`,
  `src/components/email-capture-screen.tsx:15-55`,
  `src/components/welcome-gift-screen.tsx:12-45`
- Persisted screen state: `src/lib/quiz/store.ts:9-16`, `50-75`, `91-107`
- Quiz navigation already state-driven: `src/lib/quiz/navigation.ts:9-24`
- Paywall timer and discount state: `src/lib/revenuecat/web.ts:17-26`, `50-78`
- Paywall route exits still path-based: `src/app/paywall/paywall-page-client.tsx:143-153`, `233-290`

## Requirements

- Functional: survey route renders the correct implicit screen from
  `funnelScreen`, keeps quiz step progression intact, and preserves welcome gift,
  exit offer, paywall, and checkout transitions.
- Non-functional: locale path segment wins over stale persisted locale,
  `funnelScreen` remains refresh-safe, and paywall offer/session keys do not
  change.

## Architecture

Input flow:
- Server route hands Phase 2 `initialLocale`, `initialScreen`,
  `initialCountryCode`, `initialPlanId`, and `exitOfferMode`.
- Client store provides `funnelScreen`, `currentStep`, `data`, `lead`, `locale`,
  and TDEE state (`src/lib/quiz/store.ts:14-34`).

Transform:
- New survey client container chooses which screen component to render.
- Quiz screens keep using `goToNextQuizStep()` / `goToPreviousQuizStep()` which
  already update `funnelScreen` and `currentStep` without path changes
  (`src/lib/quiz/navigation.ts:9-24`).
- Email, welcome gift, paywall, and exit offer switch screens through callbacks
  or store setters instead of `router.push('/email')`, `router.push('/paywall')`,
  or `router.push('/exit-offer')`.

Output flow:
- The visible path stays `/survey/{language}` for all pre-checkout states.
- Post-checkout routes outside this scope stay explicit: `/welcome`,
  `/postcheckout`, `/redeem`, `/auth/email-link`.

## Related Code Files

- Create: `src/app/survey/[language]/survey-page-client.tsx`
- Modify: `src/lib/quiz/store.ts`
- Modify: `src/lib/quiz/navigation.ts`
- Modify: `src/app/quiz/quiz-page-client.tsx`
- Modify: `src/components/landing-page.tsx`
- Modify: `src/components/email-capture-screen.tsx`
- Modify: `src/components/welcome-gift-screen.tsx`
- Modify: `src/app/paywall/paywall-page-client.tsx`
- Modify: `src/app/exit-offer/exit-offer-page-client.tsx`
- Modify: `src/components/conversion-shell.tsx`
- Modify: `src/components/local-preview-tools.tsx`

## Implementation Steps

1. Add `survey-page-client.tsx` that switches on `funnelScreen` and renders:
   landing, `QuizPageClient`, `EmailCaptureScreen`, `WelcomeGiftScreen`,
   `PaywallPageClient`, or `ExitOfferPageClient`.
2. Make the survey client enforce route locale as canonical:
   - on first hydrate, sync store locale from `[language]`,
   - on language toggle, `replace()` the path to the other locale without
     resetting the funnel unless the user explicitly restarts.
3. Replace remaining pre-checkout route pushes with screen transitions:
   - email completion -> welcome gift,
   - welcome gift completion -> paywall,
   - paywall missing lead -> email,
   - paywall cancellation -> exit offer,
   - exit-offer accept/dismiss -> paywall.
4. Keep RevenueCat offer state unchanged by reusing
   `PAYWALL_OFFER_STATE_STORAGE_KEY`,
   `PAYWALL_EXIT_OFFER_CLAIMED_STORAGE_KEY`,
   `PAYWALL_SELECTED_PLAN_STORAGE_KEY`
   (`src/lib/revenuecat/web.ts:21-25`) and by preserving the existing
   `openCheckout()` control flow (`src/app/paywall/paywall-page-client.tsx:233-290`).
5. Update shared logo/local-preview links so the funnel never points back to `/`
   or `/paywall` during pre-checkout (`src/components/conversion-shell.tsx:27-31`,
   `src/components/local-preview-tools.tsx:9-15`).

## Todo List

- [ ] Add the survey client container
- [ ] Render screen components from `funnelScreen`
- [ ] Make `[language]` authoritative over persisted locale
- [ ] Convert email/welcome gift/exit offer/paywall transitions to screen-state
- [ ] Preserve existing paywall timer, discount, selected-plan, and checkout flow
- [ ] Update local preview tools and shared logo links

## Success Criteria

- [ ] A full pre-checkout journey stays on `/survey/{language}` from landing
  through paywall.
- [ ] Refreshing on email, welcome gift, exit offer, or paywall restores the
  same implicit screen from persisted state.
- [ ] Welcome discount, exit discount, countdown, and selected plan survive a
  refresh because the same session/cookie keys are reused.
- [ ] RevenueCat checkout still exits to `/welcome` or `/postcheckout` exactly
  as before.

## Risk Assessment

- High: persisted `funnelScreen` or locale can disagree with the route segment
  after refresh (`src/lib/quiz/store.ts:50-75`). Mitigation: one-time route
  reconciliation in the survey client, with route locale winning.
- High: paywall still uses route pushes for pre-checkout branches
  (`src/app/paywall/paywall-page-client.tsx:146-147`, `282-283`). Mitigation:
  replace only the pre-checkout branches; keep `/welcome` and `/postcheckout`
  because they intentionally leave the funnel.
- Medium: raw pageview path reporting will collapse to `/survey/{language}`, but
  step events already exist via `trackStepViewed()` (`src/lib/analytics/track.ts:25-27`).
  Mitigation: treat `funnel_step_viewed` as the canonical screen metric.

## Security Considerations

- Keep current browser-safe persistence boundaries: lead projection only,
  no checkout credentials or raw redemption links in store or URL
  (`src/lib/quiz/store.ts:50-60`).
- Preserve existing BFF and RevenueCat handoff flows from `src/lib/api/client.ts:63-149`.

## Next Steps

- Phase 3 adds regression coverage, rollout checks, and rollback instructions.
