---
phase: 1
title: "Canonical Survey Route"
status: pending
priority: P1
effort: "6h"
dependencies: []
---

# Phase 1: Canonical Survey Route

## Overview

Create the server entry for `/survey/[language]` and make every legacy
pre-checkout route resolve into it without dropping locale, screen intent, or
paywall query state.

## Context Links

- Scout: `plans/260808-2234-survey-route-unification/reports/scout-report.md`
- Current route evidence: `src/app/page.tsx:6-9`, `src/app/email/page.tsx:3-4`,
  `src/app/welcome-gift/page.tsx:3-4`, `src/app/exit-offer/page.tsx:3-4`,
  `src/app/quiz/page.tsx:11-12`, `src/app/paywall/page.tsx:14-25`

## Requirements

- Functional: `/survey/{language}` accepts `vi` and `en`, becomes the only
  visible pre-checkout funnel path, and can reconstruct landing, quiz, email,
  welcome gift, exit offer, or paywall entry when a user hits an old URL.
- Non-functional: keep locale deterministic, keep paywall server props
  (`countryCode`, `plan`, `exitOffer`) intact, and do not widen browser-visible
  sensitive state.

## Architecture

Input flow:
- Request path enters from `/`, `/quiz`, `/email`, `/welcome-gift`,
  `/exit-offer`, or `/paywall`.
- Root already derives locale from `x-vercel-ip-country`
  (`src/app/page.tsx:6-9`); paywall already derives `countryCode`, `plan`, and
  `exitOffer` on the server (`src/app/paywall/page.tsx:14-25`).

Transform:
- Add `src/app/survey/[language]/page.tsx` as the canonical server route.
- Legacy pages redirect into `/survey/{language}` with enough bootstrap context
  to recover the intended screen and plan state.
- Strip one-time bootstrap params after hydration so the steady-state visible URL
  stays `/survey/{language}`.

Output flow:
- Browser lands on `/survey/{language}` only.
- Survey route passes normalized locale + paywall entry props into Phase 2's
  client container.

## Related Code Files

- Create: `src/app/survey/[language]/page.tsx`
- Create: `src/lib/survey/route-context.ts`
- Create: `src/lib/survey/route-context.test.ts`
- Modify: `src/app/page.tsx`
- Modify: `src/app/quiz/page.tsx`
- Modify: `src/app/email/page.tsx`
- Modify: `src/app/welcome-gift/page.tsx`
- Modify: `src/app/exit-offer/page.tsx`
- Modify: `src/app/paywall/page.tsx`
- Modify: `src/app/layout.tsx`

## Implementation Steps

1. Add a server-safe `route-context` helper that validates the path locale,
   maps legacy entry routes to a `screen` bootstrap value, and preserves paywall
   `plan` / `exitOffer` query parameters from `src/app/paywall/page.tsx:14-25`.
2. Create `src/app/survey/[language]/page.tsx` to:
   - reject unsupported locales,
   - derive canonical metadata/canonical URL for `/survey/{language}`,
   - pass `initialLocale`, `initialScreen`, `initialCountryCode`,
     `initialPlanId`, and `exitOfferMode` into the client funnel container.
3. Replace legacy route bodies with redirects into `/survey/{language}`:
   - `/` keeps geo-based locale selection (`src/app/page.tsx:6-9`);
   - `/quiz`, `/email`, `/welcome-gift`, `/exit-offer`, `/paywall` preserve the
     intended screen rather than defaulting everything to `vi` or landing.
4. Update canonical metadata from `/` to `/survey/{language}` in
   `src/app/layout.tsx:14-31` so search previews and internal sharing stop
   advertising the old root path.

## Todo List

- [ ] Add `src/app/survey/[language]/page.tsx`
- [ ] Add a tested route-context helper for locale + legacy-screen mapping
- [ ] Redirect `/quiz`, `/email`, `/welcome-gift`, `/exit-offer`, `/paywall`
- [ ] Preserve paywall `plan` and `exitOffer` query state through the redirect
- [ ] Point canonical metadata at `/survey/{language}`

## Success Criteria

- [ ] `GET /` redirects to `/survey/vi` for VN and `/survey/en` otherwise.
- [ ] Direct hits to `/quiz`, `/email`, `/welcome-gift`, `/exit-offer`,
  `/paywall` end on `/survey/{language}` with the correct implicit screen.
- [ ] `/paywall?plan=12-week&exitOffer=1` still reaches paywall mode with the
  same initial plan and exit-offer banner.

## Risk Assessment

- High: current legacy redirects hardcode `/survey/vi` and drop screen intent
  (`src/app/email/page.tsx:3-4`, `src/app/welcome-gift/page.tsx:3-4`,
  `src/app/exit-offer/page.tsx:3-4`). Mitigation: central route-context helper
  with query forwarding.
- High: moving paywall entry into survey without server-side header/cookie
  extraction can break locale/currency and exit-offer claim behavior
  (`src/app/paywall/page.tsx:14-25`, `src/app/exit-offer/page.tsx:7-14`
  [UNVERIFIED current file after redirect-only stub]). Mitigation: keep paywall
  prep on the server route.
- Medium: canonical root metadata still advertises `/` (`src/app/layout.tsx:23-31`).
  Mitigation: switch canonical URLs in the same phase.

## Security Considerations

- Do not add raw email, checkout payloads, redemption URLs, or auth tokens to
  URL params; only bootstrap route/screen intent and existing paywall query data.
- Keep browser-safe lead projection unchanged (`src/lib/quiz/store.ts:50-60`).

## Next Steps

- Phase 2 consumes the server route props and renders the correct in-route
  client screen without further path changes.
