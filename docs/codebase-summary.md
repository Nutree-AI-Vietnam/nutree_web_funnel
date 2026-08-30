# Codebase Summary

## Snapshot

Nutree Web Funnel is a Next.js App Router application that drives the web
onboarding and paid checkout flow for Nutree. The app takes users from quiz
completion to lead capture, RevenueCat Web checkout, and the mobile claim
handoff.

This summary is generated from the current repository snapshot and is intended as
a quick orientation for developers and documentation updates.

## Stack

| Area | Current choice |
| --- | --- |
| Framework | Next.js App Router |
| Language | TypeScript |
| Styling | Tailwind CSS |
| State | zustand |
| Testing | Vitest |
| Package manager | npm |

## Top-Level Structure

| Path | Purpose |
| --- | --- |
| `src/app/` | Route handlers and page entries for the funnel |
| `src/components/` | Shared UI components and step widgets |
| `src/lib/` | Funnel logic, API client, copy, analytics, and RevenueCat helpers |
| `docs/` | Release notes, handoff guides, and system docs |
| `plans/` | Planning artifacts and rollout notes |
| `config/` | Example Vercel environment files |
| `public/` | Static assets used by the funnel |

## Main User Flow

1. User lands on the quiz experience and progresses through the onboarding
   steps.
2. The app derives TDEE and stores quiz state locally.
3. The browser creates a possession-bound lead through the same-origin BFF.
4. The paywall loads RevenueCat Web configuration from browser-safe env vars.
5. Checkout can run in legacy identified mode or in the default-off anonymous
   redemption mode.
6. After purchase, the browser correlates the RevenueCat customer back to the
   lead through the same-origin BFF.
7. The redemption URL stays in memory only and the mobile app finishes the
   authenticated claim.

## Route Map

| Route | Purpose |
| --- | --- |
| `/` | Locale bootstrap that redirects into `/survey/{language}` |
| `/survey/{language}` | Canonical pre-checkout funnel shell with persisted screen state |
| `/quiz` | Legacy quiz URL; redirects into `/survey/{language}` |
| `/email` | Legacy email URL; redirects into `/survey/{language}` |
| `/paywall` | Legacy paywall URL; redirects into `/survey/{language}` before checkout |
| `/success` | Post-purchase success experience |
| `/welcome` | Guidance only — RC email / `/postcheckout` (magic-claim UI retired) |
| `/open-nutree` | Token-free install/reopen path for mobile claim handoff |
| `/postcheckout` | Browser-owned post-pay correlation recovery |
| `/api/web-funnel/*` | BFF: session, lead, status, correlation, session reset; `/resend` compatibility-only |

## Key Code Areas

### Funnel state and quiz logic

- `src/lib/quiz/` contains onboarding state, date-of-birth utilities, reflection
  steps, and local store logic.
- `src/components/steps/` renders the quiz and result screens as reusable
  step-level UI pieces.

### API client and BFF access

- `src/lib/api/client.ts` creates checkout drafts, requests lead status, and
  correlates the RevenueCat customer through same-origin requests.
- `src/app/api/web-funnel/*` forwards BFF operations while enforcing
  same-origin mutation checks and safe lead projections.
- `src/lib/handoff/lead-access-session.ts` and
  `src/lib/handoff/lead-projection.ts` keep the browser capability narrow.

### RevenueCat integration

- `src/lib/revenuecat/web.ts` reads browser-safe RevenueCat Web configuration,
  configures legacy lead-based checkout, and can generate an anonymous app user
  for the redemption handoff.
- `src/lib/revenuecat/redemption-handoff.ts` keeps the redemption URL in memory
  only and fails closed when the URL is absent or invalid.
- `src/lib/revenuecat/paywall-plans.ts` maps the three web plans used by the
  paywall.

### Copy, analytics, and preview support

- `src/lib/copy/` stores localized funnel copy in English and Vietnamese.
- `src/lib/analytics/track.ts` and `src/components/analytics-scripts.tsx`
  handle event tracking integrations.
- `src/lib/local-preview.ts` provides local preview fixtures for development.

## External Dependencies

| Dependency | Role |
| --- | --- |
| MealTrack backend | Lead creation, payment verification, and claim correlation |
| RevenueCat Web | Checkout, offering resolution, and entitlement state |
| Firebase Auth | Mobile claim sign-in only |
| Vercel | Preview and production hosting |
| Airbridge / GA4 / Meta / TikTok | Optional analytics integrations |

## Environment Variables

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | Public | MealTrack base URL used by the browser |
| `WEB_FUNNEL_BFF_SHARED_SECRET` | Server | Shared secret for same-origin BFF requests |
| `NEXT_PUBLIC_REVENUECAT_WEB_API_KEY` | Public | RevenueCat Web API key |
| `NEXT_PUBLIC_REVENUECAT_WEB_OFFERING_ID` | Public | RevenueCat web offering to load |
| `NEXT_PUBLIC_REVENUECAT_WEB_PACKAGE_4_WEEK` | Public | 4-week package identifier |
| `NEXT_PUBLIC_REVENUECAT_WEB_PACKAGE_12_WEEK` | Public | 12-week package identifier |
| `NEXT_PUBLIC_REVENUECAT_WEB_PACKAGE_52_WEEK` | Public | 52-week package identifier |
| `NEXT_PUBLIC_REVENUECAT_WEB_PACKAGE_1_WEEK` | Public | Optional 1-week package identifier |
| `NEXT_PUBLIC_REVENUECAT_WEB_1_WEEK_ENABLED` | Public | Build-time toggle replacing the 52-week UI/package with 1-week |
| `NEXT_PUBLIC_REVENUECAT_REDEMPTION_ENABLED` | Public | Default-off anonymous redemption handoff flag |

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local development server |
| `npm run build` | Validate the production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run the Vitest suite |

## Documentation Map

| File | Purpose |
| --- | --- |
| `README.md` | Repo setup, environment variables, and deployment notes |
| `docs/web-checkout-and-subscription-flow.md` | Product-level explanation of checkout and claim authority |
| `docs/web-checkout-production-setup.md` | Staging and production release checklist |
| `docs/firebase-email-link-identity-handoff.md` | Canonical identity handoff contract |
| `docs/email-first-funnel-backend-handoff.md` | Backend claim and fulfillment notes |

## Current Notes

- The redemption handoff is default-off and controlled by a public flag.
- The browser does not complete Firebase auth.
- The redemption URL must remain memory-only until the mobile claim takes over.
- The pre-checkout funnel now renders as implicit screens under `/survey/{language}`; legacy funnel URLs redirect there and persisted `funnelScreen` state keeps refresh and timer behavior stable.
- Production should stay blocked until sandbox SIT proves the full flow.
