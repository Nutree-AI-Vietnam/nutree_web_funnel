# Scout Report

## Verified current state

- `src/app/page.tsx:6-9` already redirects `/` to `/survey/{locale}` using
  `x-vercel-ip-country`.
- `src/app/email/page.tsx:3-4`, `src/app/welcome-gift/page.tsx:3-4`, and
  `src/app/exit-offer/page.tsx:3-4` still hardcode `/survey/vi`, so they lose
  locale and screen intent.
- `src/app/quiz/page.tsx:11-12` still renders a live `/quiz` page; there is no
  `src/app/survey/[language]/page.tsx` route yet.
- `src/lib/quiz/store.ts:9-16`, `50-75`, `91-107` already persists
  `funnelScreen`, `currentStep`, locale, TDEE, and safe lead projection under
  store version `6`.
- `src/lib/quiz/navigation.ts:9-24` already advances quiz flow by store state
  (`quiz` -> `email` -> `landing`) rather than path changes.
- Shared screen components already exist for landing, email capture, and welcome
  gift: `src/components/landing-page.tsx:56-66`,
  `src/components/email-capture-screen.tsx:15-55`,
  `src/components/welcome-gift-screen.tsx:12-45`.
- Paywall discount/timer/selected-plan state lives in RevenueCat session/cookie
  keys in `src/lib/revenuecat/web.ts:17-26`, `50-78`.
- `src/app/paywall/page.tsx:14-25` still owns server-side `countryCode`,
  `initialPlanId`, `exitOfferMode`, and `oneWeekPlanEnabled` derivation.
- `plans/260808-1037-web-funnel-onboarding-redesign/plan.md:37-44` still assumes
  visible `/quiz -> /email -> /welcome-gift -> /paywall`, so this new route plan
  must land first.

## Main risks

- Redirects are partially migrated and inconsistent.
- Survey route does not exist yet, so current redirects point at a missing path.
- Paywall route consolidation can break price locale, selected plan, or timer
  behavior if server props or session keys move.

## Unresolved questions

- None. Plan assumes `/welcome`, `/postcheckout`, `/redeem`, and
  `/auth/email-link` stay explicit non-funnel routes.
