# Web-to-App Funnel — Design Spec

**Date:** 2026-07-07
**Status:** Approved for planning
**Repos involved:** `nutree_web_funnel` (new, this repo — primary), `nutree_ai` (mobile, small changes), backend (API contract only; separate team/repo)

## Goal

A web onboarding funnel that mirrors the Nutree mobile app's quiz flow, converts users on the web (payment via RevenueCat Web Billing), then hands them off to the mobile app with their onboarding data and subscription already in place.

## Decisions (settled during brainstorming)

| Decision | Choice |
|---|---|
| Conversion point | Pay on web (Stripe via RevenueCat Web Billing), then download app |
| Identity handoff | Email capture + Airbridge deferred deep link with claim token (no web account/password) |
| Screen scope | Quiz sections 1–4 + feature promos + calculating + TDEE results + result promising; drop app-only screens (ATT, notifications, health connect, rating, native auth) |
| Language | Vietnamese only at launch; copy structured for future locales |
| Stack | Next.js (App Router) + TypeScript + Tailwind, new repo `nutree_web_funnel`, deployed on Vercel (e.g. `start.nutree.ai`) |

## Architecture

- **One route per quiz step** (`/quiz/goal`, `/quiz/sex`, …) using the same snake_case slugs as the app's `OnboardingScreenId.rcKey`. Gives browser back-button support and per-step funnel analytics.
- **Client-side state** object with keys matching backend snake_case fields (`fitness_goal`, `pain_points`, `height_cm`, …), persisted to `localStorage` for mid-quiz resume. No mapping layer.
- **Copy** in a single Vietnamese strings module, keyed for future i18n.
- **External systems:** existing backend API (TDEE preview + 2 new endpoints), RevenueCat Web Billing, Airbridge (attribution + deferred deep link).

## Funnel flow (mobile → web mapping)

| # | Web step | Source |
|---|---|---|
| 0 | Landing page (hero + CTA) | new |
| 1–17 | Quiz: name_ask, goal, target_weight, challenges, referral_source, duration, reflection, sex, age, height_weight, body_fat, training_days, training_duration, experience, training_type, activity_level, diet | mirrors mobile sections 1–4, same order/options |
| 18–20 | Feature promos: tdee_science_promo, smart_macro_promo, smart_meals_promo | mirrors mobile section 5 |
| 21 | Calculating animation (runs `previewTdee` behind it) | mirrors mobile |
| 22 | TDEE results (BMI bar, macro cards, target weight projection) | mirrors `tdee_targets_screen` |
| 23 | Result promising (potential chart) | mirrors `result_promising_screen` |
| 24 | **Email capture** | replaces `auth_transition` |
| 25 | **Paywall + checkout** (RC Web Billing) | replaces in-app paywall |
| 26 | **Success / download page** (store badges + QR, Airbridge links with claim token) | new |

Dropped as app-only: `health_connect`, `rating_ask`, `notification_ask`, `pre_att_explainer`.

## Data flow & web→app handoff

1. **Calculating** calls existing unauthenticated `previewTdee` endpoint. On failure, a local TypeScript port of Mifflin-St Jeor / Katch-McArdle (from `tdee_calculator.dart`) renders as fallback.
2. **Email capture** POSTs `{email, onboarding_payload}` → backend stores a **web lead**, returns `{web_user_id, claim_token}`.
3. **Checkout** runs RevenueCat Web Billing with `app_user_id = web_user_id`. RC webhook → backend marks lead paid.
4. **Success page** shows store badges + QR — Airbridge tracking links carrying `claim_token` as deep-link param. Backend also sends confirmation email containing a universal link with the same token (fallback when deferred deep linking fails, e.g. iOS privacy limits).
5. **App first launch:** Airbridge SDK surfaces deferred deep link → app calls `claim` endpoint → receives onboarding payload → hydrates `OnboardingData`, marks onboarding complete, skips quiz, calls RevenueCat `logIn` so the web purchase's entitlement attaches to the app user. User lands on auth/home already subscribed.

## Backend API contract (for backend team)

- `POST /web-funnel/leads` — `{email, onboarding_payload}` → `{web_user_id, claim_token}`
- `POST /web-funnel/claim` — `{claim_token}` → `{onboarding_payload, purchase_status}`. Idempotent; tokens expire.
- RevenueCat webhook: handle Web Billing purchase events → flag lead paid → trigger confirmation email.
- Confirmation / abandoned-cart emails reuse existing `nutree_email` templates.

## Mobile app changes (`nutree_ai`)

- Deferred deep link handler for the claim-token route (Airbridge already integrated).
- Claim service: fetch payload → save `OnboardingData` locally + `saveProfile` to backend → RC `logIn`/alias → route past onboarding.
- Paywall skip and entitlement checks already work via existing RevenueCat entitlement logic.

## Analytics

- GA4 + Meta Pixel + TikTok Pixel.
- `funnel_step_viewed` event per step; step names = rcKey slugs (aligns with app's analytics taxonomy).
- Purchase conversion events fired server-side from the RC webhook for accuracy.
- Airbridge web SDK ties web touchpoints to app installs.

## Error handling

- `previewTdee` failure → local TDEE fallback (results still render).
- Mid-quiz drop-off → `localStorage` resume.
- Payment failure → retry UI + abandoned-cart email.
- Claim token invalid/expired → app falls back to normal onboarding + "restore purchases".

## Testing

- Unit tests: quiz state machine; TDEE fallback parity against known values from `tdee_calculator.dart`.
- Playwright E2E: full funnel with RevenueCat sandbox.
- Mobile claim flow: existing Flutter test patterns in `nutree_ai`.

## Out of scope (v1)

- Additional languages beyond Vietnamese.
- Web-adapted notification ask / rating / health connect screens.
- A/B testing framework (analytics events are structured to support it later).
- Backend implementation (contract only; owned by backend team).
